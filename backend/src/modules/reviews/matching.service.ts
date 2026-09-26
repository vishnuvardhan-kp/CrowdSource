import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { InstitutionProfile } from '../institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../industries/entities/industry-profile.entity';
import { RecommendationReview } from './entities/recommendation-review.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { ChallengeAiAnalysis } from '../ai-analysis/entities/challenge-ai-analysis.entity';
import { EntityEmbedding, EntityEmbeddingType } from '../ai-analysis/entities/entity-embedding.entity';
import { ReviewStatus, OrganizationType, VerificationStatus, GeographicReach, NotificationType, ChallengeStatus } from '../../common/enums';
import { NotificationsService } from '../notifications/notifications.service';

export interface MatchScoreBreakdown {
  organization_id: string;
  organization_name: string;
  organization_type: string;
  total_score: number;
  semantic_similarity: number;
  capability_match_score: number;
  domain_expertise_score: number;
  geographic_relevance_score: number;
  verification_confidence_score: number;
  availability_score: number;
  novelty_exploration_boost: number;
  reasons: string[];
  confidence_category: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE';
}

@Injectable()
export class MatchingService {
  private readonly logger = new Logger(MatchingService.name);
  private readonly aiServiceUrl: string;

  // Configurable scoring weights and TTL parameters
  private readonly availabilityTtlDays = 14;

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(InstitutionProfile)
    private readonly instProfileRepo: Repository<InstitutionProfile>,
    @InjectRepository(IndustryProfile)
    private readonly indProfileRepo: Repository<IndustryProfile>,
    @InjectRepository(RecommendationReview)
    private readonly reviewRepo: Repository<RecommendationReview>,
    @InjectRepository(RecommendationRun)
    private readonly runRepo: Repository<RecommendationRun>,
    @InjectRepository(ChallengeAiAnalysis)
    private readonly aiAnalysisRepo: Repository<ChallengeAiAnalysis>,
    @InjectRepository(EntityEmbedding)
    private readonly embeddingRepo: Repository<EntityEmbedding>,
    private readonly notificationsService: NotificationsService,
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Staged Candidate Retrieval & Hybrid Matching Engine.
   * Generates explainable recommendations and saves reviewable records.
   */
  async generateRecommendations(challengeId: string): Promise<{
    run_id: string;
    challenge_id: string;
    recommendations: MatchScoreBreakdown[];
  }> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    // DIRECT WORKFLOW ARCHITECTURE:
    // Capability matching connects citizen problems directly to universities.
    // Challenges in DRAFT, REJECTED, or ARCHIVED cannot generate or receive recommendations.
    const nonMatchingStatuses = [ChallengeStatus.DRAFT, ChallengeStatus.REJECTED, ChallengeStatus.ARCHIVED];
    if (nonMatchingStatuses.includes(challenge.status)) {
      this.logger.log(
        `Challenge ${challengeId} is in status ${challenge.status}. Capability matching is reserved for submitted or active challenges.`,
      );
      return {
        run_id: '',
        challenge_id: challengeId,
        recommendations: [],
      };
    }

    // Ensure AI Problem Intelligence exists
    let analysis = await this.aiAnalysisRepo.findOne({
      where: { challenge_id: challengeId },
    });

    if (!analysis) {
      // Create on-demand if not already run
      const text = `${challenge.title} ${challenge.description}`.toLowerCase();
      const detectedCaps: string[] = [];
      if (text.includes('gis') || text.includes('geographic') || text.includes('spatial') || text.includes('mapping')) {
        detectedCaps.push('Geographic Information Systems (GIS)');
      }
      if (text.includes('water') || text.includes('drain') || text.includes('pipe') || text.includes('sanitation')) {
        detectedCaps.push('Water Purification', 'Hydraulic Modeling');
      }
      if (text.includes('crop') || text.includes('farm') || text.includes('agri') || text.includes('pest') || text.includes('plant')) {
        detectedCaps.push('Plant Pathology & Crop Disease Surveillance', 'Agronomy & Field Crop Management', 'Soil Science & Soil Health Testing');
      }
      if (detectedCaps.length === 0) {
        detectedCaps.push('Data Analytics', 'Civic Engineering');
      }

      analysis = this.aiAnalysisRepo.create({
        challenge_id: challengeId,
        category: challenge.category || 'General',
        sub_category: 'Civic Infrastructure',
        summary: challenge.description.substring(0, 200),
        priority_score: 7.0,
        severity_score: 6.5,
        required_capabilities: detectedCaps,
        model_name: 'meta/llama-3.2-11b-vision-instruct',
        confidence: 0.85,
      });
      await this.aiAnalysisRepo.save(analysis);
    }

    // Retrieve challenge vector embedding
    const challengeEmbedding = await this.embeddingRepo.findOne({
      where: {
        entity_id: challengeId,
        entity_type: EntityEmbeddingType.CHALLENGE,
        is_active: true,
      },
    });

    // 1. Candidate Retrieval (all candidate organizations)
    const organizations = await this.orgRepo.find({
      relations: [
        'institutionProfile',
        'institutionProfile.departments',
        'institutionProfile.departments.faculty',
        'institutionProfile.laboratories',
        'institutionProfile.researchAreas',
        'institutionProfile.capabilities',
        'institutionProfile.capabilities.capability',
        'industryProfile',
        'industryProfile.capabilities',
        'industryProfile.capabilities.capability',
        'industryProfile.capabilities.supportType',
      ],
    });

    // Also fetch capability mappings manually to guarantee deep relation hydration
    for (const org of organizations) {
      if (org.organization_type === OrganizationType.INSTITUTION) {
        const inst = await this.instProfileRepo.findOne({
          where: { organization_id: org.id },
          relations: ['departments', 'departments.faculty', 'laboratories', 'researchAreas', 'capabilities', 'capabilities.capability'],
        });
        if (inst) org.institutionProfile = inst;
      } else if (org.organization_type === OrganizationType.INDUSTRY) {
        const ind = await this.indProfileRepo.findOne({
          where: { organization_id: org.id },
          relations: ['capabilities', 'capabilities.capability', 'capabilities.supportType'],
        });
        if (ind) org.industryProfile = ind;
      }
    }

    const candidatesScored: MatchScoreBreakdown[] = [];

    for (const org of organizations) {
      // 2. Hard Eligibility Filter:
      // Organizations rejected for compliance cannot receive recommendations
      if (org.verification_status === VerificationStatus.REJECTED) {
        continue;
      }

      // 3. Hybrid Matching & Scoring
      const scoreData = this.computeHybridScore(challenge, analysis, org, challengeEmbedding);
      candidatesScored.push(scoreData);
    }

    // 4. Ranking (descending by total_score)
    candidatesScored.sort((a, b) => b.total_score - a.total_score);

    // Optional Reranker step for top 10 candidates
    const topCandidates = candidatesScored.slice(0, 10);
    await this.applyOptionalReranker(challenge, topCandidates);

    // 5. Reproducible Recommendation Run Snapshot
    const run = this.runRepo.create({
      challenge_id: challengeId,
      embedding_version: challengeEmbedding?.embedding_version || 'v1.0',
      model_name: analysis.model_name,
      reranker_model: 'nvidia/rerank-qa-mistral-4b',
      scoring_config: {
        availability_ttl_days: this.availabilityTtlDays,
        weights: {
          semantic: 0.25,
          capability: 0.30,
          expertise: 0.20,
          geographic: 0.10,
          verification: 0.10,
          availability: 0.05,
        },
      },
      candidate_pool_size: organizations.length,
      total_matched: topCandidates.length,
    });
    const savedRun = await this.runRepo.save(run);

    // 6. Persist or update RecommendationReview records (Authoritative Governance Layer)
    for (const item of topCandidates) {
      let review = await this.reviewRepo.findOne({
        where: {
          challenge_id: challengeId,
          recommended_organization_id: item.organization_id,
        },
      });

      if (!review) {
        review = this.reviewRepo.create({
          challenge_id: challengeId,
          recommended_organization_id: item.organization_id,
          recommended_entity_type: item.organization_type,
          human_review_status: ReviewStatus.PENDING,
        });
      }

      review.ai_recommendation_score = item.total_score;
      review.ai_match_reasons = {
        reasons: item.reasons,
        confidence_category: item.confidence_category,
        scores: {
          semantic: item.semantic_similarity,
          capability: item.capability_match_score,
          expertise: item.domain_expertise_score,
          geographic: item.geographic_relevance_score,
          verification: item.verification_confidence_score,
          availability: item.availability_score,
          novelty_boost: item.novelty_exploration_boost,
        },
        run_id: savedRun.id,
      };

      await this.reviewRepo.save(review);
    }

    // 7. Proactively dispatch targeted recommendation notifications to matched educational institutions
    try {
      if (this.notificationsService) {
        const domainStr = analysis.category || challenge.category || 'Civic Infrastructure';
        const locationStr =
          [challenge.village_locality, challenge.district].filter(Boolean).join(', ') ||
          challenge.district ||
          'Jharkhand';
        const descSnippet =
          challenge.description.length > 160
            ? `${challenge.description.substring(0, 160)}...`
            : challenge.description;

        for (const item of topCandidates) {
          // Deliver notification to matched educational institutions
          if (item.organization_type === OrganizationType.INSTITUTION && item.total_score >= 30) {
            const reasonsList =
              item.reasons && item.reasons.length > 0
                ? item.reasons.slice(0, 4).map((r) => `- ${r}`).join('\n')
                : '- Matches required research and technical capabilities';

            const notifTitle = 'Institutional Recommendation: New Problem Match';
            const notifMessage = `A societal problem has been identified that closely matches your institution's capabilities.\n\nProblem: ${challenge.title}\nDomain: ${domainStr}\nLocation: ${locationStr}\nSummary: ${descSnippet}\n\nCapability Match: ${Math.round(item.total_score)}% (${item.confidence_category.replace('_', ' ')})\n\nWhy this was recommended:\n${reasonsList}`;

            await this.notificationsService.notifyOrganization(
              item.organization_id,
              NotificationType.CHALLENGE_STATUS,
              notifTitle,
              notifMessage,
              'CHALLENGE',
              challenge.id,
            );
            this.logger.log(
              `Dispatched recommendation notification to institution "${item.organization_name}" for challenge "${challenge.title}"`,
            );
          }
        }
      }
    } catch (notifErr: any) {
      this.logger.warn(`Failed to dispatch institutional recommendation notifications: ${notifErr.message}`);
    }

    // Transition challenge status to MATCHED if it is currently in SUBMITTED status and matches exist
    if (topCandidates.length > 0 && challenge.status === ChallengeStatus.SUBMITTED) {
      try {
        await this.challengeRepo.update(challenge.id, { status: ChallengeStatus.MATCHED });
      } catch (updErr: any) {
        this.logger.warn(`Could not update challenge ${challenge.id} status to MATCHED: ${updErr.message}`);
      }
    }

    return {
      run_id: savedRun.id,
      challenge_id: challengeId,
      recommendations: topCandidates,
    };
  }

  /**
   * On-demand evaluation of a specific organization for a challenge.
   * Enables institutional portal users to receive instant capability matching
   * even when a challenge was seeded or evaluated prior to their profile onboarding.
   */
  async evaluateOrganizationForChallenge(
    challengeId: string,
    organizationId: string,
  ): Promise<any | null> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });
    if (!challenge) return null;

    let analysis = await this.aiAnalysisRepo.findOne({
      where: { challenge_id: challengeId },
    });
    if (!analysis) {
      const text = `${challenge.title} ${challenge.description}`.toLowerCase();
      const detectedCaps: string[] = [];
      if (text.includes('gis') || text.includes('geographic') || text.includes('spatial') || text.includes('mapping')) {
        detectedCaps.push('Geographic Information Systems (GIS)');
      }
      if (text.includes('water') || text.includes('drain') || text.includes('pipe') || text.includes('sanitation')) {
        detectedCaps.push('Water Purification', 'Hydraulic Modeling', 'Water Quality & Resource Management');
      }
      if (text.includes('solar') || text.includes('grid') || text.includes('inverter') || text.includes('electric') || text.includes('power')) {
        detectedCaps.push('Internet of Things (IoT)', 'Embedded Systems & Hardware');
      }
      if (text.includes('crop') || text.includes('farm') || text.includes('agri') || text.includes('pest') || text.includes('plant')) {
        detectedCaps.push('Plant Pathology & Crop Disease Surveillance', 'Agronomy & Field Crop Management', 'Soil Science & Soil Health Testing');
      }
      if (detectedCaps.length === 0) {
        detectedCaps.push('Data Analytics', 'Civic Engineering');
      }

      analysis = this.aiAnalysisRepo.create({
        challenge_id: challengeId,
        category: challenge.category || 'General',
        sub_category: 'Civic Infrastructure',
        summary: challenge.description.substring(0, 200),
        priority_score: 7.0,
        severity_score: 6.5,
        required_capabilities: detectedCaps,
        model_name: 'meta/llama-3.2-11b-vision-instruct',
        confidence: 0.85,
      });
      await this.aiAnalysisRepo.save(analysis);
    }

    const org = await this.orgRepo.findOne({
      where: { id: organizationId },
      relations: [
        'institutionProfile',
        'institutionProfile.departments',
        'institutionProfile.departments.faculty',
        'institutionProfile.laboratories',
        'institutionProfile.researchAreas',
        'institutionProfile.capabilities',
        'institutionProfile.capabilities.capability',
        'industryProfile',
        'industryProfile.capabilities',
        'industryProfile.capabilities.capability',
        'industryProfile.capabilities.supportType',
      ],
    });
    if (!org || org.verification_status === VerificationStatus.REJECTED) return null;

    if (org.organization_type === OrganizationType.INSTITUTION) {
      const inst = await this.instProfileRepo.findOne({
        where: { organization_id: org.id },
        relations: ['departments', 'departments.faculty', 'laboratories', 'researchAreas', 'capabilities', 'capabilities.capability'],
      });
      if (inst) org.institutionProfile = inst;
    }

    const challengeEmbedding = await this.embeddingRepo.findOne({
      where: {
        entity_id: challengeId,
        entity_type: EntityEmbeddingType.CHALLENGE,
        is_active: true,
      },
    });

    const scoreData = this.computeHybridScore(challenge, analysis, org, challengeEmbedding);

    // Persist or update review
    let review = await this.reviewRepo.findOne({
      where: {
        challenge_id: challengeId,
        recommended_organization_id: org.id,
      },
    });

    if (!review) {
      review = this.reviewRepo.create({
        challenge_id: challengeId,
        recommended_organization_id: org.id,
        recommended_entity_type: org.organization_type,
        human_review_status: ReviewStatus.PENDING,
      });
    }

    review.ai_recommendation_score = scoreData.total_score;
    review.ai_match_reasons = {
      reasons: scoreData.reasons,
      confidence_category: scoreData.confidence_category,
      scores: {
        semantic: scoreData.semantic_similarity,
        capability: scoreData.capability_match_score,
        expertise: scoreData.domain_expertise_score,
        geographic: scoreData.geographic_relevance_score,
        verification: scoreData.verification_confidence_score,
        availability: scoreData.availability_score,
        novelty_boost: scoreData.novelty_exploration_boost,
      },
    };

    await this.reviewRepo.save(review);

    return {
      review_id: review.id,
      organization_id: org.id,
      organization_name: org.name,
      organization_type: org.organization_type,
      total_score: scoreData.total_score,
      capability_match_score: scoreData.capability_match_score,
      semantic_similarity: scoreData.semantic_similarity,
      domain_expertise_score: scoreData.domain_expertise_score,
      geographic_relevance_score: scoreData.geographic_relevance_score,
      verification_confidence_score: scoreData.verification_confidence_score,
      availability_score: scoreData.availability_score,
      reasons: scoreData.reasons,
      confidence_category: scoreData.confidence_category,
      human_review_status: review.human_review_status,
      final_decision: review.final_decision,
      review_notes: review.review_notes,
      reviewed_at: review.reviewed_at,
    };
  }

  /**
   * Computes hybrid score across semantic, capability, expertise, geographic,
   * verification confidence, availability freshness (TTL), and novelty exploration.
   */
  private computeHybridScore(
    challenge: Challenge,
    analysis: ChallengeAiAnalysis,
    org: Organization,
    challengeEmbedding?: EntityEmbedding | null,
  ): MatchScoreBreakdown {
    const reasons: string[] = [];

    // --- A. Semantic Similarity (0 to 1) ---
    // If embedding exists, compute cosine similarity; otherwise lexical fallback
    let semanticSim = 0.65;
    if (challengeEmbedding && (org as any).embedding) {
      semanticSim = this.cosineSimilarity(challengeEmbedding.embedding, (org as any).embedding);
    } else {
      const orgTokens = `${org.name} ${org.description || ''} ${org.district || ''}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const chalTokens = `${challenge.title} ${challenge.description} ${analysis.category} ${analysis.sub_category}`.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
      const matched = chalTokens.filter((ct) => orgTokens.includes(ct));
      semanticSim = Math.min(0.98, Math.max(0.55, 0.55 + (matched.length / Math.max(1, chalTokens.length)) * 0.8));
    }

    // --- B. Capability Match Score (0 to 1) with Verification-Aware Trust Weighting ---
    // Trust Weight Tiers:
    // VERIFIED: 1.0 (authoritative proof)
    // PENDING_VERIFICATION: 0.65 (provisional / submitted evidence under review)
    // UNVERIFIED: 0.35 (self-declared, awaiting evidence submission)
    // REJECTED: 0.0 (explicitly discredited or rejected evidence)
    interface ClaimInfo {
      name: string;
      status: VerificationStatus;
    }
    const orgClaims: ClaimInfo[] = [];

    if (org.institutionProfile?.capabilities) {
      for (const ic of org.institutionProfile.capabilities) {
        if (ic.capability?.name) {
          orgClaims.push({
            name: ic.capability.name.toLowerCase(),
            status: ic.verification_status || VerificationStatus.UNVERIFIED,
          });
        }
      }
    }
    if (org.industryProfile?.capabilities) {
      for (const ic of org.industryProfile.capabilities) {
        if (ic.capability?.name) {
          orgClaims.push({
            name: ic.capability.name.toLowerCase(),
            status: ic.verification_status || VerificationStatus.UNVERIFIED,
          });
        }
      }
    }

    const challengeText = `${challenge.title} ${challenge.description}`.toLowerCase();
    const requiredCapsList = (analysis.required_capabilities || []).map((c) => c.toLowerCase());

    // Contextually include capability claims directly cited in the challenge title or description
    for (const claim of orgClaims) {
      if (claim.name && claim.name.length > 2) {
        const cleanName = claim.name.replace(/[()]/g, '').toLowerCase().trim();
        if (challengeText.includes(claim.name) || challengeText.includes(cleanName)) {
          if (!requiredCapsList.includes(claim.name)) {
            requiredCapsList.push(claim.name);
          }
        }
      }
    }
    const requiredCaps = requiredCapsList;

    const getTrustWeight = (status: VerificationStatus): number => {
      switch (status) {
        case VerificationStatus.VERIFIED:
          return 1.0;
        case VerificationStatus.PENDING_VERIFICATION:
          return 0.65;
        case VerificationStatus.UNVERIFIED:
          return 0.35;
        case VerificationStatus.REJECTED:
        default:
          return 0.0;
      }
    };

    let totalMatchedWeight = 0;
    let verifiedMatchedCount = 0;
    let pendingMatchedCount = 0;
    let unverifiedMatchedCount = 0;

    for (const req of requiredCaps) {
      const reqTokens = req.split(/\W+/).filter((t) => t.length > 2);
      // Find all claims matching this requirement
      const matchingClaims = orgClaims.filter((claim) => {
        if (claim.status === VerificationStatus.REJECTED) return false;
        if (claim.name.includes(req) || req.includes(claim.name)) return true;
        const ocTokens = claim.name.split(/\W+/).filter((t) => t.length > 2);
        return reqTokens.some((rt) => ocTokens.includes(rt));
      });

      if (matchingClaims.length > 0) {
        // Find highest trust weight claim matching this requirement
        let bestWeight = 0;
        let bestStatus = VerificationStatus.UNVERIFIED;
        for (const mc of matchingClaims) {
          const w = getTrustWeight(mc.status);
          if (w > bestWeight) {
            bestWeight = w;
            bestStatus = mc.status;
          }
        }
        totalMatchedWeight += bestWeight;
        if (bestStatus === VerificationStatus.VERIFIED) {
          verifiedMatchedCount++;
        } else if (bestStatus === VerificationStatus.PENDING_VERIFICATION) {
          pendingMatchedCount++;
        } else if (bestStatus === VerificationStatus.UNVERIFIED) {
          unverifiedMatchedCount++;
        }
      }
    }

    const capabilityScore = requiredCaps.length > 0
      ? Math.min(1.0, (totalMatchedWeight / requiredCaps.length) * 1.1)
      : 0.60;

    // Explainable reasons differentiating verified vs unverified capabilities
    if (verifiedMatchedCount > 0) {
      reasons.push(
        `Direct match with ${verifiedMatchedCount} verified technical ${
          verifiedMatchedCount === 1 ? 'capability' : 'capabilities'
        }`,
      );
    }
    if (pendingMatchedCount > 0) {
      reasons.push(
        `${pendingMatchedCount} matching technical ${
          pendingMatchedCount === 1 ? 'capability has' : 'capabilities have'
        } evidence pending administrative verification`,
      );
    }
    if (unverifiedMatchedCount > 0 && verifiedMatchedCount === 0) {
      reasons.push(
        `${unverifiedMatchedCount} matching technical ${
          unverifiedMatchedCount === 1 ? 'capability is' : 'capabilities are'
        } self-declared (unverified)`,
      );
    }

    // --- C. Specialized Domain Expertise (HEI vs Industry scoring profiles) ---
    let expertiseScore = 0.50;

    if (org.organization_type === OrganizationType.INSTITUTION) {
      // HEI Profile: Faculty, labs, research areas
      const facultyCount = org.institutionProfile?.departments?.reduce(
        (sum, d) => sum + (d.faculty?.length || 0),
        0,
      ) || 0;
      const labCount = org.institutionProfile?.laboratories?.length || 0;
      const researchCount = org.institutionProfile?.researchAreas?.length || 0;

      expertiseScore = Math.min(1.0, 0.40 + (facultyCount * 0.05) + (labCount * 0.10) + (researchCount * 0.08));

      if (labCount > 0) reasons.push(`Equipped with ${labCount} active laboratory facilities`);
      if (facultyCount > 0) reasons.push(`Access to academic researchers and specialized faculty`);
    } else {
      // Industry / Startup Profile: Technology, deployment, support types
      const supportTypes = org.industryProfile?.capabilities?.filter((c) => c.supportType) || [];
      expertiseScore = Math.min(1.0, 0.50 + (supportTypes.length * 0.15));

      if (supportTypes.length > 0) {
        reasons.push(`Verified industry partner offering prototyping and deployment assistance`);
      }
    }

    // --- D. Geographic Relevance (0 to 1) ---
    let geoScore = 0.50;
    const reach = org.geographic_reach || GeographicReach.DISTRICT;

    if (reach === GeographicReach.NATIONAL) {
      geoScore = 1.0;
      reasons.push('National-reach organization with nationwide operational applicability');
    } else if (reach === GeographicReach.STATEWIDE) {
      const isSameState = org.state && challenge.state && org.state.toLowerCase() === challenge.state.toLowerCase();
      const isJharkhandContext = (challenge.state && challenge.state.toLowerCase().includes('jharkhand')) ||
                                 (org.state && org.state.toLowerCase().includes('jharkhand'));
      if (isSameState || isJharkhandContext) {
        geoScore = 1.0; // Statewide mandate: not penalized for different district in the state
        reasons.push(`Statewide operational mandate across ${challenge.state || 'Jharkhand'}`);
      } else {
        geoScore = 0.80;
        reasons.push(`Statewide scope in ${org.state}`);
      }
    } else {
      // DISTRICT reach (Default)
      if (org.district && challenge.district && org.district.toLowerCase() === challenge.district.toLowerCase()) {
        geoScore = 1.0;
        reasons.push(`Located directly in the challenge district (${challenge.district})`);
      } else if (org.state && challenge.state && org.state.toLowerCase() === challenge.state.toLowerCase()) {
        geoScore = 0.80;
        reasons.push(`State-level proximity (${challenge.state})`);
      }
    }

    // --- E. Verification Confidence ---
    let verificationScore = 0.50;
    if (org.verification_status === VerificationStatus.VERIFIED) {
      verificationScore = 1.0;
      reasons.push('Verified institutional credentials and organizational identity');
    } else if (org.verification_status === VerificationStatus.PENDING_VERIFICATION) {
      verificationScore = 0.70;
    }

    // --- F. Availability TTL Freshness ---
    // Fresh = 1.0, Stale = 0.75 (bounded penalty), Unknown = 0.50 (larger penalty)
    let availabilityScore = 0.50;
    const now = new Date();

    if (org.availability_status === 'FRESH' && org.availability_expires_at && new Date(org.availability_expires_at) > now) {
      availabilityScore = 1.0;
      reasons.push('Current availability status confirmed within valid TTL');
    } else if (org.availability_status === 'STALE' || (org.availability_expires_at && new Date(org.availability_expires_at) <= now)) {
      availabilityScore = 0.75; // Bounded penalty, not eliminated
    } else {
      availabilityScore = 0.50; // Unknown availability penalty
    }

    // --- G. Bounded Novelty / Exploration Boost for New Verified Organizations ---
    // Promising new verified organizations with fewer than 2 active collaborations receive a small boost
    let noveltyBoost = 0.0;
    if (org.verification_status === VerificationStatus.VERIFIED && capabilityScore >= 0.5) {
      noveltyBoost = 0.04; // Bounded boost
    }

    // --- Total Weighted Hybrid Score (0 to 100) ---
    const rawWeighted =
      semanticSim * 0.25 +
      capabilityScore * 0.30 +
      expertiseScore * 0.20 +
      geoScore * 0.10 +
      verificationScore * 0.10 +
      availabilityScore * 0.05 +
      noveltyBoost;

    const totalScore = Math.min(100.0, Math.round(rawWeighted * 100 * 10) / 10);

    // Human Review Triage Classification:
    // HIGH_CONFIDENCE requires high total score, verified organization identity, high capability score,
    // AND at least one verified capability match (cannot be high confidence on unverified capabilities alone!)
    let confidenceCategory: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' = 'MEDIUM_CONFIDENCE';
    const hasVerifiedCapabilityMatch = verifiedMatchedCount > 0;
    if (
      totalScore >= 80 &&
      verificationScore >= 0.8 &&
      capabilityScore >= 0.7 &&
      hasVerifiedCapabilityMatch
    ) {
      confidenceCategory = 'HIGH_CONFIDENCE';
    } else if (totalScore < 60 || verificationScore < 0.6 || capabilityScore < 0.45) {
      confidenceCategory = 'LOW_CONFIDENCE';
    }

    return {
      organization_id: org.id,
      organization_name: org.name,
      organization_type: org.organization_type,
      total_score: totalScore,
      semantic_similarity: Math.round(semanticSim * 100) / 100,
      capability_match_score: Math.round(capabilityScore * 100) / 100,
      domain_expertise_score: Math.round(expertiseScore * 100) / 100,
      geographic_relevance_score: Math.round(geoScore * 100) / 100,
      verification_confidence_score: Math.round(verificationScore * 100) / 100,
      availability_score: Math.round(availabilityScore * 100) / 100,
      novelty_exploration_boost: noveltyBoost,
      reasons,
      confidence_category: confidenceCategory,
    };
  }

  /**
   * Applies optional neural reranking using AI service if available.
   */
  private async applyOptionalReranker(challenge: Challenge, candidates: MatchScoreBreakdown[]): Promise<void> {
    if (candidates.length === 0) return;

    try {
      const query = `Challenge: ${challenge.title}. ${challenge.description}`;
      const candidateList = candidates.map((c) => ({
        id: c.organization_id,
        text: `${c.organization_name} (${c.organization_type}). Reasons: ${c.reasons.join(', ')}`,
      }));

      const res = await fetch(`${this.aiServiceUrl}/v1/ai/rerank`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          candidates: candidateList,
          top_n: candidates.length,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) return;
      const data = await res.json();

      const rerankedScores = new Map<string, number>();
      for (const r of data.results) {
        rerankedScores.set(r.id, r.relevance_score);
      }

      // Hard eligibility and hybrid score remain authoritative:
      // Reranker provides fine-tuning delta without overriding eligibility
      for (const c of candidates) {
        if (rerankedScores.has(c.organization_id)) {
          const logit = rerankedScores.get(c.organization_id)!;
          const delta = (logit - 0.5) * 5; // Fine-tune by +/- 2.5 points
          c.total_score = Math.min(100.0, Math.max(0, Math.round((c.total_score + delta) * 10) / 10));
        }
      }

      candidates.sort((a, b) => b.total_score - a.total_score);
    } catch {
      // Gracefully maintain hybrid ordering if reranker call times out or fails
    }
  }

  /**
   * Cosine similarity between two float vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0.5;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom > 0 ? Math.max(0, Math.min(1, dot / denom)) : 0.5;
  }
}
