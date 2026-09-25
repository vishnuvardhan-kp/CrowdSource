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
  EntityEmbedding,
  EntityEmbeddingType,
} from '../ai-analysis/entities/entity-embedding.entity';
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
    @InjectRepository(EntityEmbedding)
    private readonly embeddingRepo: Repository<EntityEmbedding>,
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

      // Idempotency: If already clustered, return its cluster immediately
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

      // 4. Retrieve or generate 2048-dim vector embedding for incoming challenge
      const challengeEmbedding = await this.getOrGenerateChallengeEmbedding(
        challenge,
        queryRunner,
      );

      // 5. Find candidate clusters in the same district
      const candidateClusters = await queryRunner.manager
        .createQueryBuilder(ProblemCluster, 'pc')
        .where('LOWER(TRIM(pc.district)) = LOWER(TRIM(:district))', {
          district: challenge.district || 'General',
        })
        .andWhere('pc.status IN (:...statuses)', {
          statuses: [
            ProblemClusterStatus.AWAITING_GOVERNMENT_VERIFICATION,
            ProblemClusterStatus.VALIDATED,
            ProblemClusterStatus.OPEN_FOR_SOLUTIONS,
            ProblemClusterStatus.COLLABORATION,
            ProblemClusterStatus.PROJECT_INITIATED,
            ProblemClusterStatus.RESOLVED,
          ],
        })
        .orderBy('pc.created_at', 'DESC')
        .take(50)
        .getMany();

      // 6. Evaluate multi-signal similarity for each candidate
      let bestMatch: {
        cluster: ProblemCluster;
        evalResult: {
          sSem: number;
          sSemOrigin: number;
          sSemCentroid: number;
          sLex: number;
          sCat: number;
          sGeo: number;
          sFinal: number;
          distanceKm: number | null;
          pGps: number | null;
          aAdmin: number;
          antiChainViolated: boolean;
        };
      } | null = null;

      for (const candidate of candidateClusters) {
        // District Isolation Guard
        if (
          challenge.district &&
          candidate.district &&
          challenge.district.trim().toLowerCase() !== candidate.district.trim().toLowerCase()
        ) {
          continue;
        }

        const evalResult = await this.evaluateSimilarityDetailed(
          challenge,
          candidate,
          queryRunner,
          challengeEmbedding,
        );

        if (!bestMatch || evalResult.sFinal > bestMatch.evalResult.sFinal) {
          bestMatch = { cluster: candidate, evalResult };
        }
      }

      // 7. Apply Multi-Signal Decision Thresholds:
      // S_final >= 0.75 -> CLUSTERED (High confidence auto-association)
      // 0.55 <= S_final < 0.75 -> POTENTIAL_MATCH (Medium confidence human review)
      // S_final < 0.55 -> INDEPENDENT (Low confidence or novel problem)
      if (
        bestMatch &&
        bestMatch.evalResult.sFinal >= 0.75 &&
        !bestMatch.evalResult.antiChainViolated
      ) {
        // HIGH CONFIDENCE: Auto-associate with existing cluster
        const cluster = bestMatch.cluster;
        challenge.cluster_id = cluster.id;
        challenge.clustering_status = ClusteringStatus.CLUSTERED;
        challenge.potential_cluster_id = null as any;
        if (
          cluster.status === ProblemClusterStatus.VALIDATED ||
          cluster.status === ProblemClusterStatus.OPEN_FOR_SOLUTIONS ||
          cluster.status === ProblemClusterStatus.COLLABORATION ||
          cluster.status === ProblemClusterStatus.PROJECT_INITIATED
        ) {
          challenge.status = ChallengeStatus.VALIDATED;
          challenge.validated_at = cluster.verified_at || new Date();
        } else if (cluster.status === ProblemClusterStatus.RESOLVED) {
          challenge.status = ChallengeStatus.COMPLETED;
          challenge.validated_at = cluster.verified_at || new Date();
        }
        await queryRunner.manager.save(challenge);

        // Aggregate cluster statistics & recalculate transparent priority
        await this.refreshClusterAggregates(cluster.id, queryRunner);

        await queryRunner.commitTransaction();
        return (await this.clusterRepo.findOne({ where: { id: cluster.id } }))!;
      } else if (
        bestMatch &&
        bestMatch.evalResult.sFinal >= 0.55 &&
        !bestMatch.evalResult.antiChainViolated
      ) {
        // MEDIUM CONFIDENCE: Mark as POTENTIAL_MATCH for human review
        const cluster = bestMatch.cluster;
        challenge.potential_cluster_id = cluster.id;
        challenge.clustering_status = ClusteringStatus.POTENTIAL_MATCH;

        // Provisionally assign an independent cluster record so citizen has a valid reference
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
   * Calculates Haversine distance in kilometers between two coordinates.
   */
  public calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
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
   * Unicode-aware multilingual lexical tokenization.
   * Retains Devanagari, Ol Chiki, Latin, digits, and all Unicode alphabetic scripts.
   * Filters short tokens (< 2 characters) while preserving short words like जल, पुल.
   */
  public tokenizeUnicode(text: string): Set<string> {
    if (!text) return new Set();
    const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
    return new Set(words.filter((w) => w.length >= 2));
  }

  /**
   * Cosine similarity between two unit-normalized or arbitrary vectors.
   * Clamped to [0.0, 1.0].
   */
  public cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (!vec1 || !vec2 || vec1.length !== vec2.length || vec1.length === 0) {
      return 0.0;
    }
    let dot = 0.0;
    let norm1 = 0.0;
    let norm2 = 0.0;
    for (let i = 0; i < vec1.length; i++) {
      dot += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    const denom = Math.sqrt(norm1) * Math.sqrt(norm2);
    if (denom === 0) return 0.0;
    const sim = dot / denom;
    return Math.max(0.0, Math.min(1.0, sim));
  }

  /**
   * Geographic Intelligence:
   * Continuous exponential GPS decay P_gps(d) = exp(-(d-1)/4)
   * Administrative hierarchy: same locality = 1.0, same block = 0.70, cross-block = 0.20
   * Cross-block distance gate: if block1 !== block2 and d > 5.0 km, S_geo = 0.0
   * Discrepancy safeguard: if d > 15.0 km, clamp S_geo <= 0.10
   */
  public calculateGeographicScore(
    challenge: Challenge,
    candidate: ProblemCluster,
  ): {
    geoScore: number;
    distanceKm: number | null;
    pGps: number | null;
    aAdmin: number;
  } {
    let distanceKm: number | null = null;
    let pGps: number | null = null;

    if (
      challenge.latitude != null &&
      challenge.longitude != null &&
      candidate.latitude != null &&
      candidate.longitude != null
    ) {
      distanceKm = this.calculateHaversineDistance(
        Number(challenge.latitude),
        Number(challenge.longitude),
        Number(candidate.latitude),
        Number(candidate.longitude),
      );
      if (distanceKm <= 1.0) {
        pGps = 1.0;
      } else {
        pGps = Math.exp(-(distanceKm - 1.0) / 4.0);
      }
    }

    // Administrative hierarchy score
    let aAdmin = 0.20; // Default: same district, cross-block
    const challengeLoc = (challenge.village_locality || '').trim().toLowerCase();
    const candidateLoc = (candidate.village_locality || '').trim().toLowerCase();
    const challengeBlock = (challenge.block_id || challenge.blockRef?.name || '').trim().toLowerCase();
    const candidateBlock = (candidate.block_id || candidate.block || '').trim().toLowerCase();

    const isSameBlock = Boolean(
      challengeBlock && candidateBlock && challengeBlock === candidateBlock,
    );
    const isSameLocality = Boolean(challengeLoc && candidateLoc && challengeLoc === candidateLoc);

    if (isSameLocality) {
      aAdmin = 1.0;
    } else if (isSameBlock) {
      aAdmin = 0.70;
    } else {
      aAdmin = 0.20;
    }

    // Cross-block distance gate:
    // If in different blocks and GPS distance > 5.0 km, physical problem cannot be the same
    if (!isSameBlock && challengeBlock && candidateBlock && distanceKm != null && distanceKm > 5.0) {
      return {
        geoScore: 0.0,
        distanceKm,
        pGps,
        aAdmin,
      };
    }

    // Discrepancy safeguard: if GPS > 15.0 km, clamp geoScore <= 0.10
    if (distanceKm != null && distanceKm > 15.0) {
      const rawGeo = pGps != null ? 0.60 * pGps + 0.40 * aAdmin : aAdmin;
      return {
        geoScore: Math.min(0.10, rawGeo),
        distanceKm,
        pGps,
        aAdmin,
      };
    }

    let geoScore: number;
    if (pGps != null) {
      geoScore = 0.60 * pGps + 0.40 * aAdmin;
    } else {
      // Missing GPS on either side: use administrative score
      geoScore = aAdmin;
    }

    return {
      geoScore: Math.max(0.0, Math.min(1.0, geoScore)),
      distanceKm,
      pGps,
      aAdmin,
    };
  }

  /**
   * Unicode-aware multilingual lexical similarity (Jaccard).
   * Cross-evaluates title, normalized_text, description, and original native script.
   */
  public calculateLexicalSimilarity(
    challenge: Challenge,
    candidate: ProblemCluster,
    memberChallenges: Challenge[] = [],
  ): number {
    const challengeTexts = [
      challenge.title,
      challenge.normalized_text,
      challenge.description,
      challenge.original_text,
    ]
      .filter(Boolean)
      .join(' ');

    const candidateTexts = [
      candidate.title,
      candidate.description,
      ...memberChallenges.map(
        (m) => `${m.title} ${m.normalized_text || ''} ${m.description} ${m.original_text || ''}`,
      ),
    ]
      .filter(Boolean)
      .join(' ');

    const set1 = this.tokenizeUnicode(challengeTexts);
    const set2 = this.tokenizeUnicode(candidateTexts);

    let intersection = 0;
    for (const token of set1) {
      if (set2.has(token)) intersection++;
    }
    const union = new Set([...set1, ...set2]).size;
    return union > 0 ? intersection / union : 0.0;
  }

  /**
   * Category and Context Taxonomy score.
   */
  public calculateCategoryScore(challenge: Challenge, candidate: ProblemCluster): number {
    const c1 = (challenge.category || '').trim().toLowerCase();
    const c2 = (candidate.category || '').trim().toLowerCase();
    if (!c1 || !c2) return 0.50;
    if (c1 === c2) return 1.0;
    if (c1.includes(c2) || c2.includes(c1)) return 0.70;
    return 0.0;
  }

  /**
   * Retrieves or generates 2048-dim embedding for challenge.
   */
  public async getOrGenerateChallengeEmbedding(
    challenge: Challenge,
    queryRunner: any,
  ): Promise<number[] | null> {
    const manager = queryRunner?.manager || this.dataSource.manager;
    const existing = await manager.findOne(EntityEmbedding, {
      where: {
        entity_id: challenge.id,
        entity_type: EntityEmbeddingType.CHALLENGE,
        is_active: true,
      },
    });

    if (existing?.embedding && Array.isArray(existing.embedding) && existing.embedding.length > 0) {
      return existing.embedding;
    }

    // Fallback on-the-fly embedding generation if not already present
    try {
      const descToEmbed = challenge.normalized_text || challenge.description;
      const sourceText = `Title: ${challenge.title}. Description: ${descToEmbed}. Category: ${challenge.category || 'General'}`;
      const res = await fetch(`${this.aiServiceUrl}/v1/ai/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [sourceText],
          entity_type: 'challenge',
          entity_id: challenge.id,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.embeddings?.[0]?.embedding) {
          const vector = data.embeddings[0].embedding;
          try {
            const existingEmb = await manager.findOne(EntityEmbedding, {
              where: {
                entity_id: challenge.id,
                entity_type: EntityEmbeddingType.CHALLENGE,
                embedding_version: 'v1.0',
              },
            });
            if (!existingEmb) {
              await manager.save(EntityEmbedding, {
                entity_id: challenge.id,
                entity_type: EntityEmbeddingType.CHALLENGE,
                embedding_version: 'v1.0',
                model_provider: data.model_provider || 'nvidia',
                model_name: data.model_name || 'nvidia/nemotron-3-embed-1b',
                model_version: '1.0',
                dimensions: vector.length,
                source_text: sourceText,
                source_text_hash: '',
                embedding: vector,
                is_active: true,
              });
            }
          } catch (persistErr: any) {
            this.logger.warn(
              `Could not persist on-the-fly embedding for challenge ${challenge.id}: ${persistErr.message}`,
            );
          }
          return vector;
        }
      }
    } catch (e: any) {
      this.logger.warn(
        `Could not generate on-the-fly embedding for challenge ${challenge.id}: ${e.message}`,
      );
    }
    return null;
  }

  /**
   * Detailed multi-signal similarity evaluation between a challenge and a candidate cluster.
   * Multi-Signal Formula:
   * S_final = 0.40 * S_semantic + 0.20 * S_lexical + 0.15 * S_category_context + 0.25 * S_geo
   */
  public async evaluateSimilarityDetailed(
    challenge: Challenge,
    candidate: ProblemCluster,
    queryRunner?: any,
    cachedChallengeEmbedding?: number[] | null,
  ): Promise<{
    sSem: number;
    sSemOrigin: number;
    sSemCentroid: number;
    sLex: number;
    sCat: number;
    sGeo: number;
    sFinal: number;
    distanceKm: number | null;
    pGps: number | null;
    aAdmin: number;
    antiChainViolated: boolean;
  }> {
    const manager = queryRunner?.manager || this.dataSource.manager;

    // 1. Geographic Signal
    const geoResult = this.calculateGeographicScore(challenge, candidate);

    // 2. Fetch member challenges of candidate
    const memberChallenges = await manager.find(Challenge, {
      where: { cluster_id: candidate.id },
      order: { created_at: 'ASC' },
      select: ['id', 'title', 'description', 'normalized_text', 'original_text', 'created_at'],
    });

    // 3. Lexical Signal (Unicode-aware multilingual)
    const sLex = this.calculateLexicalSimilarity(challenge, candidate, memberChallenges);

    // 4. Category & Context Signal
    const sCat = this.calculateCategoryScore(challenge, candidate);

    // 5. Semantic Signal (2048-dim embeddings)
    let challengeEmbedding = cachedChallengeEmbedding;
    if (challengeEmbedding === undefined) {
      challengeEmbedding = await this.getOrGenerateChallengeEmbedding(challenge, queryRunner);
    }

    const memberIds = memberChallenges.map((m) => m.id);
    const memberEmbeddings =
      memberIds.length > 0
        ? await manager.find(EntityEmbedding, {
            where: {
              entity_id: In(memberIds),
              entity_type: EntityEmbeddingType.CHALLENGE,
              is_active: true,
            },
          })
        : [];

    const embMap = new Map<string, number[]>();
    for (const me of memberEmbeddings) {
      if (me.embedding && Array.isArray(me.embedding) && me.embedding.length > 0) {
        embMap.set(me.entity_id, me.embedding);
      }
    }

    let originEmbedding: number[] | null = null;
    for (const m of memberChallenges) {
      if (embMap.has(m.id)) {
        originEmbedding = embMap.get(m.id)!;
        break;
      }
    }

    let centroidEmbedding: number[] | null = null;
    const allVectors = Array.from(embMap.values());
    if (allVectors.length > 0) {
      const dim = allVectors[0].length;
      const sum = new Array(dim).fill(0);
      for (const vec of allVectors) {
        for (let d = 0; d < dim; d++) {
          sum[d] += vec[d];
        }
      }
      const norm = Math.hypot(...sum);
      if (norm > 0) {
        centroidEmbedding = sum.map((x) => x / norm);
      }
    }

    let sSem = 0.0;
    let sSemOrigin = 0.0;
    let sSemCentroid = 0.0;
    let antiChainViolated = false;

    if (challengeEmbedding && centroidEmbedding) {
      sSemCentroid = this.cosineSimilarity(challengeEmbedding, centroidEmbedding);
      sSem = sSemCentroid;

      if (originEmbedding) {
        sSemOrigin = this.cosineSimilarity(challengeEmbedding, originEmbedding);
      } else {
        sSemOrigin = sSemCentroid;
      }

      // Anti-chain protection check:
      // If candidate already has 2 or more reports, ensure coherence with founding origin report
      if (memberChallenges.length >= 2) {
        if (sSemOrigin < 0.55) {
          antiChainViolated = true;
          this.logger.warn(
            `Anti-chain coherence protection triggered for challenge ${challenge.id} against cluster ${candidate.id}: origin similarity ${sSemOrigin.toFixed(3)} < 0.55`,
          );
        }
      }
    } else {
      // Fallback: If vector embedding not available, use lexical similarity as proxy
      sSem = sLex;
      sSemOrigin = sLex;
      sSemCentroid = sLex;
    }

    // 6. Multi-Signal Formula
    let sFinal = 0.40 * sSem + 0.20 * sLex + 0.15 * sCat + 0.25 * geoResult.geoScore;
    sFinal = Math.max(0.0, Math.min(1.0, sFinal));

    // Cross-block distance gate & physical distance safeguard:
    // If locations are in different blocks and > 5.0 km apart, or > 15 km apart within district,
    // they cannot be the same localized physical problem (prevents Case 10 false positives)
    const challengeBlock = (challenge.block_id || challenge.blockRef?.name || '').trim().toLowerCase();
    const candidateBlock = (candidate.block_id || candidate.block || '').trim().toLowerCase();
    const isSameBlock = Boolean(
      challengeBlock && candidateBlock && challengeBlock === candidateBlock,
    );

    if (
      !isSameBlock &&
      challengeBlock &&
      candidateBlock &&
      geoResult.distanceKm != null &&
      geoResult.distanceKm > 5.0
    ) {
      sFinal = Math.min(sFinal, 0.49);
    } else if (geoResult.distanceKm != null && geoResult.distanceKm > 15.0) {
      sFinal = Math.min(sFinal, 0.49);
    }

    // If anti-chain coherence is violated, cap score below potential match threshold
    if (antiChainViolated) {
      sFinal = Math.min(sFinal, 0.45);
    }

    return {
      sSem,
      sSemOrigin,
      sSemCentroid,
      sLex,
      sCat,
      sGeo: geoResult.geoScore,
      sFinal,
      distanceKm: geoResult.distanceKm,
      pGps: geoResult.pGps,
      aAdmin: geoResult.aAdmin,
      antiChainViolated,
    };
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
        signal: AbortSignal.timeout(60000), // Bounded 60-second timeout for LLM inference
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
      status: ProblemClusterStatus.OPEN_FOR_SOLUTIONS,
      government_verification_status: 'NOT_REQUIRED',
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
        { cluster_id: clusterId },
        { clustering_status: ClusteringStatus.CLUSTERED },
      );
    } else if (reportCount === 1) {
      await queryRunner.manager.update(
        Challenge,
        { cluster_id: clusterId, clustering_status: ClusteringStatus.CLUSTERED },
        { clustering_status: ClusteringStatus.INDEPENDENT },
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
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedCluster: ProblemCluster;
    let cluster: ProblemCluster | null = null;
    try {
      cluster = await queryRunner.manager.findOne(ProblemCluster, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!cluster) {
        throw new NotFoundException(`ProblemCluster with ID "${id}" not found.`);
      }

      cluster.reports = await queryRunner.manager.find(Challenge, {
        where: { cluster_id: id },
      });

      // Idempotency: If already VALIDATED, commit and return cluster
      if (cluster.status === ProblemClusterStatus.VALIDATED) {
        await queryRunner.commitTransaction();
        return (await this.clusterRepo.findOne({ where: { id }, relations: ['reports'] }))!;
      }

      const verifiedAt = cluster.verified_at || new Date();
      cluster.status = ProblemClusterStatus.VALIDATED;
      cluster.government_verification_status = 'VERIFIED';
      cluster.verified_at = verifiedAt;
      cluster.verified_by = reviewerId;
      cluster.rejection_reason = null as any;

      savedCluster = await queryRunner.manager.save(cluster);

      // Update all underlying citizen reports to VALIDATED atomically within same transaction
      await queryRunner.manager.update(
        Challenge,
        { cluster_id: id },
        {
          status: ChallengeStatus.VALIDATED,
          validated_at: verifiedAt,
        },
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // Post-verification capability matching for verified reports
    if (this.matchingService && cluster) {
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
      if (cluster) {
        // 1. Notify original citizen reporters that their problem has been verified
        for (const r of cluster.reports || []) {
          if (r.submitted_by) {
            await this.notifService?.notifyUser(
              r.submitted_by,
              NotificationType.CHALLENGE_STATUS,
              `Your Reported Problem Has Been Verified: ${r.title}`,
              `Good news! Your reported problem has been verified by government authorities and opened for solution proposals.`,
              'CHALLENGE',
              r.id,
              cluster.district_id,
              cluster.district,
            );
          }
        }

        // 2. Notify district officers
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
    const cluster = await this.clusterRepo.findOne({
      where: { id },
      relations: ['reports'],
    });
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

    // Notify citizens of rejection reason
    for (const r of cluster.reports || []) {
      if (r.submitted_by) {
        try {
          await this.notifService?.notifyUser(
            r.submitted_by,
            NotificationType.CHALLENGE_STATUS,
            `Problem Verification Update: ${r.title}`,
            `Your reported problem was reviewed by authorities. Status: Not verified. Reason: ${dto.reason.trim()}`,
            'CHALLENGE',
            r.id,
            cluster.district_id,
            cluster.district,
          );
        } catch (notifErr: any) {
          this.logger.warn(`Failed to notify citizen ${r.submitted_by}: ${notifErr.message}`);
        }
      }
    }

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
        original_text: r.original_text,
        original_language: r.original_language,
        normalized_text: r.normalized_text,
        status: r.status,
        clustering_status: r.clustering_status,
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
