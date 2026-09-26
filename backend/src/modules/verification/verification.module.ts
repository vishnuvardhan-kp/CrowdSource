import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VerificationRecord } from './entities/verification-record.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationEvidence } from '../organizations/entities/organization-evidence.entity';
import { InstitutionCapability } from '../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../industries/entities/industry-capability.entity';
import { OrganizationClaimRequest } from '../organizations/entities/organization-claim-request.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';
import { VerificationService } from './verification.service';
import { AdminVerificationController } from './admin-verification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VerificationRecord,
      Organization,
      OrganizationEvidence,
      InstitutionCapability,
      IndustryCapability,
      OrganizationClaimRequest,
      User,
    ]),
    AuthModule,
  ],
  controllers: [AdminVerificationController],
  providers: [VerificationService],
  exports: [VerificationService, TypeOrmModule],
})
export class VerificationModule {}
