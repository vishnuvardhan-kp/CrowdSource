import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { ProjectParticipant } from './entities/project-participant.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectUpdate } from './entities/project-update.entity';
import { ProjectReview } from './entities/project-review.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { User } from '../users/entities/user.entity';
import { ProjectAcademicMember } from './entities/project-academic-member.entity';
import { ProjectContribution } from './entities/project-contribution.entity';
import { ProjectInnovationOutcome } from './entities/project-innovation-outcome.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { AdminProjectsController } from './admin-projects.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Project,
      ProjectParticipant,
      ProjectMilestone,
      ProjectTask,
      ProjectDeliverable,
      ProjectUpdate,
      ProjectReview,
      ProjectAcademicMember,
      ProjectContribution,
      ProjectInnovationOutcome,
      OrganizationMembership,
      Organization,
      User,
    ]),
    NotificationsModule,
  ],
  controllers: [ProjectsController, AdminProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService, TypeOrmModule],
})
export class ProjectsModule {}
