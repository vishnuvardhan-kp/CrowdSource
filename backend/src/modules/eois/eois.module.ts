import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpressionOfInterest } from './entities/expression-of-interest.entity';
import { EoiContribution } from './entities/eoi-contribution.entity';
import { EoiEvidence } from './entities/eoi-evidence.entity';
import { EoiReview } from './entities/eoi-review.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { OrganizationEvidence } from '../organizations/entities/organization-evidence.entity';
import { InstitutionCapability } from '../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../industries/entities/industry-capability.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { RecommendationReview } from '../reviews/entities/recommendation-review.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { EoisService } from './eois.service';
import {
  EoisController,
  ChallengeEoisController,
} from './eois.controller';
import {
  AdminEoisController,
  AdminChallengeProjectsController,
} from './admin-eois.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExpressionOfInterest,
      EoiContribution,
      EoiEvidence,
      EoiReview,
      ProjectParticipant,
      Challenge,
      Organization,
      OrganizationMembership,
      OrganizationEvidence,
      InstitutionCapability,
      IndustryCapability,
      Project,
      User,
      RecommendationReview,
    ]),
    NotificationsModule,
  ],
  controllers: [
    ChallengeEoisController,
    EoisController,
    AdminEoisController,
    AdminChallengeProjectsController,
  ],
  providers: [EoisService],
  exports: [EoisService],
})
export class EoisModule {}
