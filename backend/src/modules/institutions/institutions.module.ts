import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionProfile } from './entities/institution-profile.entity';
import { Department } from './entities/department.entity';
import { FacultyMember } from './entities/faculty-member.entity';
import { ResearchArea } from './entities/research-area.entity';
import { Laboratory } from './entities/laboratory.entity';
import { Facility } from './entities/facility.entity';
import { InstitutionCapability } from './entities/institution-capability.entity';
import { Institution } from './entities/institution.entity';
import { InstitutionMembership } from './entities/institution-membership.entity';
import { InstitutionEvidence } from './entities/institution-evidence.entity';
import { InstitutionAuditLog } from './entities/institution-audit-log.entity';
import { District } from '../locations/entities/district.entity';
import { Block } from '../locations/entities/block.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';
import { InstitutionsController } from './controllers/institutions.controller';
import { InstitutionMembershipsController } from './controllers/institution-memberships.controller';
import { AdminInstitutionVerificationController } from './controllers/admin-institution-verification.controller';
import { InstitutionsService } from './services/institutions.service';
import { InstitutionMembershipsService } from './services/institution-memberships.service';
import { LgdDataProvider } from './providers/lgd-data.provider';
import { AuditLogService } from './services/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstitutionProfile,
      Department,
      FacultyMember,
      ResearchArea,
      Laboratory,
      Facility,
      InstitutionCapability,
      Institution,
      InstitutionMembership,
      InstitutionEvidence,
      InstitutionAuditLog,
      District,
      Block,
      User,
    ]),
    NotificationsModule,
    AuthModule,
  ],
  controllers: [
    InstitutionsController,
    InstitutionMembershipsController,
    AdminInstitutionVerificationController,
  ],
  providers: [
    InstitutionsService,
    InstitutionMembershipsService,
    LgdDataProvider,
    AuditLogService,
  ],
  exports: [
    InstitutionsService,
    InstitutionMembershipsService,
    LgdDataProvider,
    AuditLogService,
    TypeOrmModule,
  ],
})
export class InstitutionsModule {}
