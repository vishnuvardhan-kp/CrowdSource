import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImpactAssessment } from './entities/impact-assessment.entity';
import { ImpactMetric } from './entities/impact-metric.entity';
import { ImpactEvidence } from './entities/impact-evidence.entity';
import { ImpactFeedback } from './entities/impact-feedback.entity';
import { ImpactReview } from './entities/impact-review.entity';
import { ProjectImpact } from './entities/project-impact.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../users/entities/user.entity';
import { ImpactService } from './impact.service';
import { ImpactController } from './impact.controller';
import { AdminImpactController } from './admin-impact.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ImpactAssessment,
      ImpactMetric,
      ImpactEvidence,
      ImpactFeedback,
      ImpactReview,
      ProjectImpact,
      Project,
      ProjectParticipant,
      OrganizationMembership,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [ImpactController, AdminImpactController],
  providers: [ImpactService],
  exports: [ImpactService, TypeOrmModule],
})
export class ImpactModule {}
