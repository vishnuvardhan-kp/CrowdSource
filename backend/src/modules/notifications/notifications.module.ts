import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { District } from '../locations/entities/district.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      User,
      OrganizationMembership,
      ProjectParticipant,
      District,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService, TypeOrmModule],
})
export class NotificationsModule {}
