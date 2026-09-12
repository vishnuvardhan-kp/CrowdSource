import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationClaimRequest } from './entities/organization-claim-request.entity';
import { OrganizationOnboardingRequest } from './entities/organization-onboarding-request.entity';
import { OrganizationEvidence } from './entities/organization-evidence.entity';
import { InstitutionProfile } from '../institutions/entities/institution-profile.entity';
import { Department } from '../institutions/entities/department.entity';
import { Laboratory } from '../institutions/entities/laboratory.entity';
import { ResearchArea } from '../institutions/entities/research-area.entity';
import { InstitutionCapability } from '../institutions/entities/institution-capability.entity';
import { IndustryProfile } from '../industries/entities/industry-profile.entity';
import { IndustryCapability } from '../industries/entities/industry-capability.entity';
import { Capability } from '../capabilities/entities/capability.entity';
import { EntityEmbedding } from '../ai-analysis/entities/entity-embedding.entity';
import { User } from '../users/entities/user.entity';
import { AuthModule } from '../auth/auth.module';

import {
  OrganizationsController,
  OrganizationClaimsController,
} from './organizations.controller';
import { PassportController } from './controllers/passport.controller';
import { AvailabilityController } from './controllers/availability.controller';
import { OnboardingController } from './controllers/onboarding.controller';
import { EvidenceController } from './controllers/evidence.controller';

import { OrganizationsService } from './organizations.service';
import { PassportService } from './services/passport.service';
import { AvailabilityService } from './services/availability.service';
import { EcosystemIndexingService } from './services/ecosystem-indexing.service';
import { OnboardingService } from './services/onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationMembership,
      OrganizationClaimRequest,
      OrganizationOnboardingRequest,
      OrganizationEvidence,
      InstitutionProfile,
      Department,
      Laboratory,
      ResearchArea,
      InstitutionCapability,
      IndustryProfile,
      IndustryCapability,
      Capability,
      EntityEmbedding,
      User,
    ]),
    AuthModule,
  ],
  controllers: [
    OrganizationsController,
    OrganizationClaimsController,
    PassportController,
    AvailabilityController,
    OnboardingController,
    EvidenceController,
  ],
  providers: [
    OrganizationsService,
    PassportService,
    AvailabilityService,
    EcosystemIndexingService,
    OnboardingService,
  ],
  exports: [
    OrganizationsService,
    PassportService,
    AvailabilityService,
    EcosystemIndexingService,
    OnboardingService,
    TypeOrmModule,
  ],
})
export class OrganizationsModule {}
