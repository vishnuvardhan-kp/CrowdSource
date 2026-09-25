import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeAiAnalysis } from '../ai-analysis/entities/challenge-ai-analysis.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { RecommendationReview } from '../reviews/entities/recommendation-review.entity';
import { AuthModule } from '../auth/auth.module';
import { ResearchIntelligenceController } from './research-intelligence.controller';
import { ResearchIntelligenceService } from './research-intelligence.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Challenge,
      ChallengeAiAnalysis,
      User,
      OrganizationMembership,
      RecommendationReview,
    ]),
    AuthModule,
  ],
  controllers: [ResearchIntelligenceController],
  providers: [ResearchIntelligenceService],
  exports: [ResearchIntelligenceService],
})
export class ResearchIntelligenceModule {}
