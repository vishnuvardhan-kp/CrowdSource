import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { ProposedSolution } from './entities/proposed-solution.entity';
import { SolutionTeamMember } from './entities/solution-team-member.entity';
import { SolutionDocument } from './entities/solution-document.entity';
import { SolutionCollaboration } from './entities/solution-collaboration.entity';

import { Challenge } from '../challenges/entities/challenge.entity';
import { ProblemCluster } from '../problem-clusters/entities/problem-cluster.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../users/entities/user.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { ProjectAcademicMember } from '../projects/entities/project-academic-member.entity';
import { ProjectContribution } from '../projects/entities/project-contribution.entity';

import { SolutionsService } from './solutions.service';
import { SolutionsController } from './solutions.controller';
import { AdminSolutionsController } from './admin-solutions.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProposedSolution,
      SolutionTeamMember,
      SolutionDocument,
      SolutionCollaboration,
      Challenge,
      ProblemCluster,
      Organization,
      OrganizationMembership,
      User,
      Project,
      ProjectParticipant,
      ProjectAcademicMember,
      ProjectContribution,
    ]),
    JwtModule.register({}),
    NotificationsModule,
  ],
  controllers: [SolutionsController, AdminSolutionsController],
  providers: [SolutionsService],
  exports: [SolutionsService],
})
export class SolutionsModule {}
