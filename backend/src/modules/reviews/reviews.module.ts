import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationReview } from './entities/recommendation-review.entity';
import { RecommendationRun } from './entities/recommendation-run.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { InstitutionProfile } from '../institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../industries/entities/industry-profile.entity';
import { ChallengeAiAnalysis } from '../ai-analysis/entities/challenge-ai-analysis.entity';
import { EntityEmbedding } from '../ai-analysis/entities/entity-embedding.entity';
import { MatchingService } from './matching.service';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { NotificationsModule } from '../notifications/notifications.module';

import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RecommendationReview,
      RecommendationRun,
      Challenge,
      Organization,
      InstitutionProfile,
      IndustryProfile,
      ChallengeAiAnalysis,
      EntityEmbedding,
      User,
      OrganizationMembership,
    ]),
    NotificationsModule,
  ],
  controllers: [ReviewsController],
  providers: [MatchingService, ReviewsService],
  exports: [MatchingService, ReviewsService, TypeOrmModule],
})
export class ReviewsModule {}
