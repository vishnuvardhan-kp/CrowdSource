import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RecommendationReview } from './entities/recommendation-review.entity';
import { ReviewStatus, UserRole, MembershipStatus } from '../../common/enums';
import { MatchingService } from './matching.service';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';

import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeStatus } from '../../common/enums';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(RecommendationReview)
    private readonly reviewRepo: Repository<RecommendationReview>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    private readonly matchingService: MatchingService,
  ) {}

  /**
   * Generates or fetches recommendations for a challenge with strict role isolation.
   */
  async getOrGenerateRecommendations(challengeId: string, currentUser?: any) {
    const challenge = await this.challengeRepo.findOne({ where: { id: challengeId } });
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    // DIRECT WORKFLOW ARCHITECTURE:
    // If the challenge is in DRAFT, REJECTED, or ARCHIVED, NO recommendations may be generated or exposed.
    const nonMatchingStatuses = [ChallengeStatus.DRAFT, ChallengeStatus.REJECTED, ChallengeStatus.ARCHIVED];
    if (nonMatchingStatuses.includes(challenge.status)) {
      return {
        challenge_id: challengeId,
        status: challenge.status,
        recommendations: [],
        message: 'Institution matching is available for submitted or active challenges.',
      };
    }

    let recommendations: any[] = [];

    const existing = await this.reviewRepo.find({
      where: { challenge_id: challengeId },
      relations: ['recommendedOrganization'],
      order: { ai_recommendation_score: 'DESC' },
    });

    if (existing && existing.length > 0) {
      const seenOrgs = new Set<string>();
      for (const r of existing) {
        if (!seenOrgs.has(r.recommended_organization_id)) {
          seenOrgs.add(r.recommended_organization_id);
          recommendations.push({
            review_id: r.id,
            organization_id: r.recommended_organization_id,
            organization_name: r.recommendedOrganization?.name || 'Partner Organization',
            organization_type: r.recommended_entity_type,
            total_score: Number(r.ai_recommendation_score),
            capability_match_score: r.ai_match_reasons?.scores?.capability ?? 0,
            semantic_similarity: r.ai_match_reasons?.scores?.semantic ?? 0,
            domain_expertise_score: r.ai_match_reasons?.scores?.expertise ?? 0,
            geographic_relevance_score: r.ai_match_reasons?.scores?.geographic ?? 0,
            verification_confidence_score: r.ai_match_reasons?.scores?.verification ?? 0,
            availability_score: r.ai_match_reasons?.scores?.availability ?? 0,
            reasons: r.ai_match_reasons?.reasons || [],
            confidence_category: r.ai_match_reasons?.confidence_category || 'MEDIUM_CONFIDENCE',
            human_review_status: r.human_review_status,
            final_decision: r.final_decision,
            review_notes: r.review_notes,
            reviewed_at: r.reviewed_at,
          });
        }
      }
    } else {
      const runResult = await this.matchingService.generateRecommendations(challengeId);
      recommendations = runResult.recommendations || [];
    }

    // Role-based filtering & security isolation
    if (currentUser) {
      if (currentUser.role === UserRole.CITIZEN) {
        // Citizens do not receive or see the institutional matching list
        return {
          challenge_id: challengeId,
          recommendations: [],
        };
      }

      const isGovernanceRole =
        currentUser.role === UserRole.PLATFORM_ADMIN ||
        currentUser.role === UserRole.GOVERNMENT_ADMIN ||
        currentUser.role === UserRole.GOVERNMENT_OFFICER;

      if (!isGovernanceRole) {
        // Institution users can only see recommendations tailored for their own institution
        const userOrgs = await this.memberRepo.find({
          where: { user_id: currentUser.id, membership_status: MembershipStatus.ACTIVE },
        });
        const directUser = await this.userRepo.findOne({ where: { id: currentUser.id } });
        const allowedOrgIds = new Set(userOrgs.map((m) => m.organization_id));
        if (directUser?.organization_id) {
          allowedOrgIds.add(directUser.organization_id);
        }

        recommendations = recommendations.filter((r) => allowedOrgIds.has(r.organization_id));
      }
    }

    return {
      challenge_id: challengeId,
      recommendations,
    };
  }

  /**
   * Human Review Decision (APPROVE / REJECT / MODIFY).
   * Rejections capture reasons for future ML evaluation.
   */
  async submitReviewDecision(
    reviewId: string,
    reviewerId: string,
    status: ReviewStatus,
    notes?: string,
    finalDecision?: string,
  ): Promise<RecommendationReview> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['recommendedOrganization', 'challenge'],
    });

    if (!review) {
      throw new NotFoundException(`Recommendation review "${reviewId}" not found.`);
    }

    if (status === ReviewStatus.REJECTED && (!notes || notes.trim().length === 0)) {
      throw new BadRequestException('A reason note is mandatory when rejecting an AI recommendation.');
    }

    review.human_review_status = status;
    review.reviewer_id = reviewerId;
    review.review_notes = notes || null as any;
    review.final_decision = finalDecision || status;
    review.reviewed_at = new Date();

    return this.reviewRepo.save(review);
  }

  /**
   * Bulk review for High Confidence recommendations (Triage accelerator).
   */
  async bulkReviewDecisions(
    reviewIds: string[],
    reviewerId: string,
    status: ReviewStatus,
    notes?: string,
  ): Promise<{ updated_count: number }> {
    const reviews = await this.reviewRepo.find({
      where: { id: In(reviewIds) },
    });

    const now = new Date();
    for (const r of reviews) {
      r.human_review_status = status;
      r.reviewer_id = reviewerId;
      r.review_notes = notes || `Bulk ${status} decision`;
      r.final_decision = status;
      r.reviewed_at = now;
      await this.reviewRepo.save(r);
    }

    return { updated_count: reviews.length };
  }
}
