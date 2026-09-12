import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { ProblemCluster } from './entities/problem-cluster.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeEvidence } from '../challenges/entities/challenge-evidence.entity';
import {
  ProblemClusterStatus,
  ChallengePriority,
  CitizenSeverity,
  ClusteringStatus,
  ChallengeStatus,
  NotificationType,
} from '../../common/enums';
import {
  QueryProblemClustersDto,
  ReviewPotentialMatchDto,
  RejectProblemClusterDto,
} from './dto';
import { NotificationsService } from '../notifications/notifications.service';
import { MatchingService } from '../reviews/matching.service';

export interface PriorityEvaluation {
  priority: ChallengePriority;
  priorityScore: number;
  reasons: string[];
}

@Injectable()
export class ProblemClustersService {
  private readonly logger = new Logger(ProblemClustersService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(ProblemCluster)
    private readonly clusterRepo: Repository<ProblemCluster>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ChallengeEvidence)
    private readonly evidenceRepo: Repository<ChallengeEvidence>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notifService?: NotificationsService,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Concurrency-Safe Clustering Entry Point.
   * Uses PostgreSQL Advisory Transaction Locks scoped by district to prevent
   * race conditions when multiple citizens submit similar reports simultaneously.
   */
  async clusterCitizenReport(challengeId: string): Promise<ProblemCluster> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Fetch challenge
      const challenge = await queryRunner.manager.findOne(Challenge, {
        where: { id: challengeId },
        relations: ['evidence', 'aiAnalysis'],
      });

      if (!challenge) {
        throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
      }

      // If already clustered, return its cluster
      if (challenge.cluster_id) {
        const existingCluster = await queryRunner.manager.findOne(ProblemCluster, {
          where: { id: challenge.cluster_id },
        });
        if (existingCluster) {
          await queryRunner.commitTransaction();
          return existingCluster;
        }
      }

      // 2. Acquire Transactional Advisory Lock scoped to District
      const districtKey = (challenge.district || 'General').trim().toLowerCase();
      await queryRunner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
        `cluster_lock:${districtKey}`,
      ]);

      // 3. Attempt AI Semantic Analysis with bounded 3-second timeout
      const aiExtraction = await this.extractAiFeaturesWithFallback(challenge);

      // 4. Find candidate clusters in the same district
      const candidateClusters = await queryRunner.manager.find(ProblemCluster, {
        where: {
          district: challenge.district,
          status: In([
            ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
            ProblemClusterStatus.VALIDATED,
            ProblemClusterStatus.OPEN_FOR_SOLUTIONS,
            ProblemClusterStatus.COLLABORATION,
          ]),
        },
        order: { created_at: 'DESC' },
      });

      // 5. Evaluate similarity and location for each candidate
      let bestMatch: {
        cluster: ProblemCluster;
        similarity: number;
        confidence: 'HIGH' | 'MEDIUM' | 'LOW';
      } | null = null;

      for (const candidate of candidateClusters) {
        // Strict Location Gate
        const locationCompatible = this.isLocationCompatible(challenge, candidate);
        if (!locationCompatible) {
          continue; // Location incompatibility strictly prevents merge
        }

        // Semantic & Text Similarity Calculation
        const similarity = this.calculateSimilarity(challenge, candidate);

        if (similarity >= 0.75) {
          bestMatch = { cluster: candidate, similarity, confidence: 'HIGH' };
          break; // Found strong match
        } else if (similarity >= 0.50 && (!bestMatch || similarity > bestMatch.similarity)) {
          bestMatch = { cluster: candidate, similarity, confidence: 'MEDIUM' };
        }
      }

      // 6. Apply Clustering Decision
      if (bestMatch && bestMatch.confidence === 'HIGH') {
        // HIGH CONFIDENCE: Auto-associate with existing cluster
        const cluster = bestMatch.cluster;
        challenge.cluster_id = cluster.id;
        challenge.clustering_status = ClusteringStatus.CLUSTERED;
        challenge.potential_cluster_id = null as any;
        if (cluster.status === ProblemClusterStatus.VALIDATED) {
          challenge.status = ChallengeStatus.VALIDATED;
          challenge.validated_at = cluster.verified_at || new Date();
        }
        await queryRunner.manager.save(challenge);

        // Aggregate cluster statistics & recalculate transparent priority
        await this.refreshClusterAggregates(cluster.id, queryRunner);

        await queryRunner.commitTransaction();
        return (await this.clusterRepo.findOne({ where: { id: cluster.id } }))!;
      } else if (bestMatch && bestMatch.confidence === 'MEDIUM') {
        // MEDIUM CONFIDENCE: Mark as POTENTIAL_MATCH for human review
        const cluster = bestMatch.cluster;
        challenge.potential_cluster_id = cluster.id;
        challenge.clustering_status = ClusteringStatus.POTENTIAL_MATCH;

        // Also provisionally assign an independent cluster so citizen has a valid cluster reference
        const newCluster = await this.createNewClusterRecord(challenge, aiExtraction, queryRunner);
        challenge.cluster_id = newCluster.id;
        await queryRunner.manager.save(challenge);

        await queryRunner.commitTransaction();
        return newCluster;
      } else {
        // LOW CONFIDENCE or NO MATCH: Create new independent cluster
        const newCluster = await this.createNewClusterRecord(challenge, aiExtraction, queryRunner);
        challenge.cluster_id = newCluster.id;
        challenge.clustering_status = ClusteringStatus.INDEPENDENT;
        challenge.potential_cluster_id = null as any;
        await queryRunner.manager.save(challenge);

        await queryRunner.commitTransaction();
        return newCluster;
      }
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Clustering transaction error: ${err.message}`, err.stack);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Evaluates physical location compatibility.
   * Gating Rules:
   * 1. District MUST match.
   * 2. If both have GPS coordinates, Haversine distance MUST be <= 8 km.
   * 3. If no GPS, village/locality or block must be compatible.
   */
  private isLocationCompatible(challenge: Challenge, cluster: ProblemCluster): boolean {
    if (challenge.district && cluster.district) {
      if (challenge.district.trim().toLowerCase() !== cluster.district.trim().toLowerCase()) {
        return false;
      }
    }

    // Coordinate proximity check if GPS available on both
    if (
      challenge.latitude != null &&
      challenge.longitude != null &&
      cluster.latitude != null &&
      cluster.longitude != null
    ) {
      const distanceKm = this.calculateHaversineDistance(
        Number(challenge.latitude),
        Number(challenge.longitude),
        Number(cluster.latitude),
        Number(cluster.longitude),
      );
      // Beyond 8km in civic terms is a separate localized issue
      if (distanceKm > 8.0) {
        return false;
      }
    }

    // Block check: if both specify blocks and they differ, consider them separate
    if (challenge.block_id && cluster.block_id) {
      if (challenge.block_id !== cluster.block_id) {
        return false;
      }
    }

    return true;
  }

  /**
   * Calculates Haversine distance in kilometers between two coordinates.
   */
  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Computes hybrid similarity between a citizen report and an existing cluster.
   */
  private calculateSimilarity(challenge: Challenge, cluster: ProblemCluster): number {
    const text1 = `${challenge.title} ${challenge.description}`.toLowerCase();
    const text2 = `${cluster.title} ${cluster.description}`.toLowerCase();

    // 1. Keyword / Token Jaccard Similarity
    const words1 = new Set(
      text1
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );
    const words2 = new Set(
      text2
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3),
    );

    let intersectionCount = 0;
    for (const w of words1) {
      if (words2.has(w)) intersectionCount++;
    }

    const unionCount = new Set([...words1, ...words2]).size;
    const jaccard = unionCount > 0 ? intersectionCount / unionCount : 0;

    // 2. Locality Bonus: matching landmark or village
    let localityBonus = 0;
    if (challenge.village_locality && cluster.village_locality) {
      if (
        challenge.village_locality.trim().toLowerCase() ===
        cluster.village_locality.trim().toLowerCase()
      ) {
        localityBonus = 0.25;
      }
    }

    // 3. Category match bonus
    let categoryBonus = 0;
    if (challenge.category && cluster.category) {
      const c1 = challenge.category.toLowerCase().trim();
      const c2 = cluster.category.toLowerCase().trim();
      if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) {
        categoryBonus = 0.10;
      }
    }

    const baseScore = jaccard * 0.70 + localityBonus + categoryBonus;
    return Math.min(Math.max(baseScore, 0.0), 1.0);
  }

  /**
   * Bounded AI Feature Extraction with 3-second hard timeout and resilient fallback.
   * GUARANTEE: Never throws or fails the citizen submission request.
   */
  private async extractAiFeaturesWithFallback(challenge: Challenge): Promise<{
    summary: string;
    normalized_title: string;
    category: string;
    subcategory?: string;
    confidence: number;
    status: 'SUCCESS' | 'FALLBACK';
  }> {
    if (challenge.aiAnalysis && (challenge.aiAnalysis as any).ai_processing_status === 'SUCCESS') {
      return {
        normalized_title: challenge.title,
        summary: challenge.aiAnalysis.summary || challenge.description,
        category: challenge.aiAnalysis.category || 'General',
        subcategory: challenge.aiAnalysis.sub_category || 'Civic Infrastructure',
        confidence: Number(challenge.aiAnalysis.confidence) || 0.85,
        status: 'SUCCESS',
      };
    }

    try {
      const response = await fetch(`${this.aiServiceUrl}/v1/ai/analyze-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          district: challenge.district,
          state: challenge.state,
        }),
        signal: AbortSignal.timeout(3000), // 3-second hard bound
      });

      if (response.ok) {
        const data = await response.json();
        return {
          normalized_title: data.normalized_title || challenge.title,
          summary: data.summary || challenge.description,
          category: data.category || challenge.category || 'General',
          subcategory: data.sub_category || 'Civic Infrastructure',
          confidence: data.confidence || 0.85,
          status: 'SUCCESS',
        };
      }
    } catch (err: any) {
      this.logger.warn(
        `AI analysis timed out or unavailable (${err.message}). Using deterministic fallback.`,
      );
    }

    // Resilient Fallback: Synthesize from citizen submission
    return {
      normalized_title: challenge.title,
      summary: challenge.description,
      category: challenge.category || 'General',
      subcategory: 'Civic Infrastructure',
      confidence: 0.50,
      status: 'FALLBACK',
    };
  }

  /**
   * Creates a new ProblemCluster entity inside the active transaction.
   */
  private async createNewClusterRecord(
    challenge: Challenge,
    aiData: any,
    queryRunner: any,
  ): Promise<ProblemCluster> {
    const evidenceCount = (challenge.evidence || []).length;
    const priorityEval = this.calculatePriority(
      1,
      evidenceCount,
      challenge.citizen_severity,
      challenge.village_locality,
    );

    const cluster = queryRunner.manager.create(ProblemCluster, {
      title: challenge.title || aiData.normalized_title,
      description: challenge.description || aiData.summary || 'Civic Problem',
      category: challenge.category || aiData.category || 'General',
      subcategory: aiData.subcategory || 'Civic Infrastructure',
      district: challenge.district || 'General',
      district_id: challenge.district_id || null,
      block: challenge.blockRef?.name || null,
      block_id: challenge.block_id || null,
      village_locality: challenge.village_locality || null,
      location: challenge.location || challenge.village_locality || null,
      latitude: challenge.latitude || null,
      longitude: challenge.longitude || null,
      report_count: 1,
      evidence_count: evidenceCount,
      affected_population: challenge.affected_population || null,
      severity: challenge.citizen_severity || 'MODERATE',
      priority_score: priorityEval.priorityScore,
      priority: priorityEval.priority,
      priority_reasons: priorityEval.reasons,
      status: ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
      government_verification_status: 'PENDING',
      ai_confidence: aiData.confidence,
      ai_processing_status: aiData.status,
      ai_reasoning: {
        method: aiData.status === 'SUCCESS' ? 'nvidia_nim' : 'deterministic_fallback',
        first_report_title: challenge.title,
        created_at: new Date().toISOString(),
      },
    });

    return queryRunner.manager.save(cluster);
  }

  /**
   * Recalculates aggregated report count, distinct evidence items, and priority score.
   */
  private async refreshClusterAggregates(clusterId: string, queryRunner: any): Promise<void> {
    const cluster = await queryRunner.manager.findOne(ProblemCluster, {
      where: { id: clusterId },
    });
    if (!cluster) return;

    // Count associated reports
    const reports = await queryRunner.manager.find(Challenge, {
      where: { cluster_id: clusterId },
      relations: ['evidence'],
    });

    const reportCount = reports.length;
    let evidenceCount = 0;
    let highestSeverity = CitizenSeverity.NOT_SURE;

    for (const r of reports) {
      if (r.evidence) evidenceCount += r.evidence.length;
      if (r.citizen_severity === CitizenSeverity.SERIOUS) {
        highestSeverity = CitizenSeverity.SERIOUS;
      } else if (
        r.citizen_severity === CitizenSeverity.MODERATE &&
        highestSeverity !== CitizenSeverity.SERIOUS
      ) {
        highestSeverity = CitizenSeverity.MODERATE;
      }
    }

    const priorityEval = this.calculatePriority(
      reportCount,
      evidenceCount,
      highestSeverity,
      cluster.village_locality,
    );

    cluster.report_count = reportCount;
    cluster.evidence_count = evidenceCount;
    cluster.severity = highestSeverity;
    cluster.priority_score = priorityEval.priorityScore;
    cluster.priority = priorityEval.priority;
    cluster.priority_reasons = priorityEval.reasons;
    await queryRunner.manager.save(cluster);

    if (reportCount > 1) {
      await queryRunner.manager.update(
        Challenge,
        { cluster_id: clusterId, clustering_status: ClusteringStatus.INDEPENDENT },
        { clustering_status: ClusteringStatus.CLUSTERED },
      );
    }
  }

  /**
   * Transparent Priority Scoring:
   * Combines severity, report count, evidence strength, recurrence, and geographic concentration.
   */
  public calculatePriority(
    reportCount: number,
    evidenceCount: number,
    severity: string = 'MODERATE',
    locality?: string,
  ): PriorityEvaluation {
    let score = 20; // baseline
    const reasons: string[] = [];

    // Severity factor
    if (severity === CitizenSeverity.SERIOUS) {
      score += 25;
      reasons.push('High citizen severity reported');
    } else if (severity === CitizenSeverity.MODERATE) {
      score += 15;
      reasons.push('Moderate citizen severity');
    } else {
      score += 5;
    }

    // Report volume factor (max 30 points)
    const reportPoints = Math.min(reportCount * 6, 30);
    score += reportPoints;
    if (reportCount > 1) {
      reasons.push(`${reportCount} related citizen reports consolidated`);
    } else {
      reasons.push('Initial citizen observation submitted');
    }

    // Evidence factor (max 20 points)
    const evidencePoints = Math.min(evidenceCount * 5, 20);
    score += evidencePoints;
    if (evidenceCount > 0) {
      reasons.push(`${evidenceCount} supporting evidence item(s) attached`);
    }

    // Geographic Concentration factor (15 points)
    if (locality && reportCount >= 2) {
      score += 15;
      reasons.push(`Geographically concentrated in ${locality}`);
    }

    // Recurrence / repeated reporting bonus
    if (reportCount >= 3) {
      score += 10;
      reasons.push('Recurring issue reported across community members');
    }

    // Normalize to 0-100
    const normalizedScore = Math.min(Math.max(score, 10), 100);

    let priority = ChallengePriority.LOW;
    if (normalizedScore >= 75) {
      priority = ChallengePriority.CRITICAL;
    } else if (normalizedScore >= 50) {
      priority = ChallengePriority.HIGH;
    } else if (normalizedScore >= 25) {
      priority = ChallengePriority.MEDIUM;
    }

    return {
      priority,
      priorityScore: normalizedScore,
      reasons,
    };
  }

  /**
   * Deterministic Rejection Routing:
   * When a reviewer evaluates a medium-confidence potential match:
   * - If ACCEPT: attaches report to cluster and updates aggregates.
   * - If REJECT: IMMEDIATELY creates a NEW independent ProblemCluster for the report,
   *   sets clustering_status = 'CLUSTERED', and routes to normal verification queue.
   */
  async reviewPotentialMatch(
    reportId: string,
    dto: ReviewPotentialMatchDto,
    reviewerId: string,
  ): Promise<any> {
    const report = await this.challengeRepo.findOne({
      where: { id: reportId },
      relations: ['evidence'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID "${reportId}" not found.`);
    }

    if (report.clustering_status !== ClusteringStatus.POTENTIAL_MATCH) {
      throw new BadRequestException(
        `Report "${reportId}" is not in POTENTIAL_MATCH status (Current: ${report.clustering_status}).`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.action === 'ACCEPT') {
        const targetClusterId = report.potential_cluster_id;
        if (!targetClusterId) {
          throw new BadRequestException('No potential cluster ID associated with this report.');
        }

        // Old provisional cluster cleanup if it was sole member
        const oldClusterId = report.cluster_id;

        report.cluster_id = targetClusterId;
        report.potential_cluster_id = null as any;
        report.clustering_status = ClusteringStatus.CLUSTERED;
        await queryRunner.manager.save(report);

        await this.refreshClusterAggregates(targetClusterId, queryRunner);

        if (oldClusterId && oldClusterId !== targetClusterId) {
          const remaining = await queryRunner.manager.count(Challenge, {
            where: { cluster_id: oldClusterId },
          });
          if (remaining === 0) {
            await queryRunner.manager.delete(ProblemCluster, oldClusterId);
          }
        }

        await queryRunner.commitTransaction();
        return {
          success: true,
          action: 'ACCEPTED',
          clusterId: targetClusterId,
          message: 'Report successfully merged into target problem cluster.',
        };
      } else {
        // REJECT MATCH: Create independent cluster immediately
        const newCluster = await this.createNewClusterRecord(
          report,
          {
            normalized_title: report.title,
            summary: report.description,
            category: report.category,
            confidence: 0.80,
            status: 'SUCCESS',
          },
          queryRunner,
        );

        report.cluster_id = newCluster.id;
        report.potential_cluster_id = null as any;
        report.clustering_status = ClusteringStatus.INDEPENDENT;
        await queryRunner.manager.save(report);

        await queryRunner.commitTransaction();
        return {
          success: true,
          action: 'REJECTED',
          newClusterId: newCluster.id,
          message:
            'Match rejected. Independent ProblemCluster created immediately for this report.',
        };
      }
    } catch (err: any) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Government Verification of Consolidated ProblemCluster.
   * Single verification step: Validates the cluster AND all linked citizen reports.
   */
  async verifyCluster(id: string, reviewerId: string): Promise<ProblemCluster> {
    const cluster = await this.clusterRepo.findOne({
      where: { id },
      relations: ['reports'],
    });

    if (!cluster) {
      throw new NotFoundException(`ProblemCluster with ID "${id}" not found.`);
    }

    const verifiedAt = cluster.verified_at || new Date();
    cluster.status = ProblemClusterStatus.VALIDATED;
    cluster.government_verification_status = 'VERIFIED';
    cluster.verified_at = verifiedAt;
    cluster.verified_by = reviewerId;
    cluster.rejection_reason = null as any;

    const savedCluster = await this.clusterRepo.save(cluster);

    // Update all underlying citizen reports to VALIDATED
    await this.challengeRepo.update(
      { cluster_id: id },
      {
        status: ChallengeStatus.VALIDATED,
        validated_at: verifiedAt,
      },
    );

    // Post-verification capability matching for verified reports
    if (this.matchingService) {
      for (const r of cluster.reports || []) {
        try {
          await this.matchingService.generateRecommendations(r.id);
        } catch (mErr: any) {
          this.logger.warn(`Failed post-verification matching for report ${r.id}: ${mErr.message}`);
        }
      }
    }

    // Dispatch scoped notifications
    try {
      if (cluster.district) {
        await this.notifService?.notifyDistrictOfficers(
          cluster.district,
          NotificationType.CHALLENGE_STATUS,
          `Problem Verified: ${cluster.title}`,
          `Problem cluster "${cluster.title}" in ${cluster.district} was verified and opened for solutions.`,
          'PROBLEM_CLUSTER',
          cluster.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to send cluster verification notification: ${e}`);
    }

    return savedCluster;
  }

  /**
   * Rejection of ProblemCluster with mandatory reason.
   */
  async rejectCluster(
    id: string,
    reviewerId: string,
    dto: RejectProblemClusterDto,
  ): Promise<ProblemCluster> {
    const cluster = await this.clusterRepo.findOne({ where: { id } });
    if (!cluster) {
      throw new NotFoundException(`ProblemCluster with ID "${id}" not found.`);
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason is mandatory when rejecting a problem cluster.');
    }

    cluster.status = ProblemClusterStatus.REJECTED;
    cluster.government_verification_status = 'REJECTED';
    cluster.rejection_reason = dto.reason.trim();
    cluster.verified_by = reviewerId;

    const savedCluster = await this.clusterRepo.save(cluster);

    // Reject underlying reports
    await this.challengeRepo.update(
      { cluster_id: id },
      {
        status: ChallengeStatus.REJECTED,
        rejection_reason: dto.reason.trim(),
      },
    );

    return savedCluster;
  }

  /**
   * Public discovery / List of Problem Clusters.
   */
  async getClusters(query: QueryProblemClustersDto): Promise<{
    items: ProblemCluster[];
    total: number;
    page: number;
    limit: number;
  }> {
    const qb = this.clusterRepo
      .createQueryBuilder('pc')
      .leftJoinAndSelect('pc.districtRef', 'districtRef')
      .leftJoinAndSelect('pc.blockRef', 'blockRef');

    if (query.status) {
      qb.andWhere('pc.status = :status', { status: query.status });
    }

    if (query.district) {
      qb.andWhere('pc.district ILIKE :district', { district: `%${query.district}%` });
    }

    if (query.priority) {
      qb.andWhere('pc.priority = :priority', { priority: query.priority });
    }

    if (query.category) {
      qb.andWhere('pc.category ILIKE :category', { category: `%${query.category}%` });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere(
        '(pc.title ILIKE :search OR pc.description ILIKE :search OR pc.village_locality ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('pc.priority_score', 'DESC').addOrderBy('pc.created_at', 'DESC');

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /**
   * Detailed Cluster View: includes all underlying citizen reports and aggregated evidence.
   */
  async getClusterById(id: string): Promise<any> {
    const cluster = await this.clusterRepo.findOne({
      where: { id },
      relations: [
        'districtRef',
        'blockRef',
        'verifier',
        'reports',
        'reports.evidence',
        'reports.submitter',
      ],
    });

    if (!cluster) {
      throw new NotFoundException(`ProblemCluster with ID "${id}" not found.`);
    }

    // Collect all unique evidence items
    const allEvidence: any[] = [];
    const seenEvidenceIds = new Set<string>();

    for (const rep of cluster.reports || []) {
      for (const ev of rep.evidence || []) {
        if (!seenEvidenceIds.has(ev.id)) {
          seenEvidenceIds.add(ev.id);
          allEvidence.push({
            id: ev.id,
            title: ev.title,
            description: ev.description,
            evidence_type: ev.evidence_type,
            url: ev.url,
            created_at: ev.created_at,
            sourceReportId: rep.id,
          });
        }
      }
    }

    return {
      ...cluster,
      aggregatedEvidence: allEvidence,
      reports: (cluster.reports || []).map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        citizen_severity: r.citizen_severity,
        village_locality: r.village_locality,
        submitted_at: r.submitted_at,
        created_at: r.created_at,
        evidenceCount: r.evidence ? r.evidence.length : 0,
        submitter: {
          name: 'Citizen Observer',
        },
      })),
    };
  }
}
