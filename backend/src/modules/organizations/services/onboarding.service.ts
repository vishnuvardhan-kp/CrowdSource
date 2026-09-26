import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrganizationOnboardingRequest } from '../entities/organization-onboarding-request.entity';
import { Organization } from '../entities/organization.entity';
import { OrganizationMembership } from '../entities/organization-membership.entity';
import { InstitutionProfile } from '../../institutions/entities/institution-profile.entity';
import { IndustryProfile } from '../../industries/entities/industry-profile.entity';
import { User } from '../../users/entities/user.entity';
import {
  OrganizationType,
  GeographicReach,
  ReviewStatus,
  OrganizationRole,
  MembershipStatus,
  UserRole,
  VerificationStatus,
} from '../../../common/enums';
import { CreateOnboardingRequestDto } from '../dto/create-onboarding-request.dto';

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OrganizationOnboardingRequest)
    private readonly requestRepo: Repository<OrganizationOnboardingRequest>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(InstitutionProfile)
    private readonly instProfileRepo: Repository<InstitutionProfile>,
    @InjectRepository(IndustryProfile)
    private readonly indProfileRepo: Repository<IndustryProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Submits an organization onboarding request (Scenario B).
   */
  async createOnboardingRequest(userId: string, dto: CreateOnboardingRequestDto) {
    // 1. Check if organization already exists in registry
    const existingOrg = await this.orgRepo.findOne({
      where: { name: dto.name.trim() },
    });
    if (existingOrg) {
      throw new ConflictException(
        `An organization named "${dto.name}" already exists in the registry. Please use the organization claim workflow instead.`,
      );
    }

    // 2. Check if a pending onboarding request already exists for this name or requester
    const existingPending = await this.requestRepo.findOne({
      where: {
        name: dto.name.trim(),
        status: ReviewStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new ConflictException(
        `A pending onboarding request for "${dto.name}" is already under administrative review.`,
      );
    }

    const request = this.requestRepo.create({
      requester_user_id: userId,
      name: dto.name.trim(),
      organization_type: dto.organization_type,
      registration_number: dto.registration_number?.trim() || null,
      email: dto.email.toLowerCase().trim(),
      website: dto.website?.trim() || null,
      phone: dto.phone?.trim() || null,
      address: dto.address?.trim() || null,
      district: dto.district.trim(),
      state: dto.state?.trim() || 'Jharkhand',
      geographic_reach: dto.geographic_reach || GeographicReach.DISTRICT,
      verification_document_url: dto.verification_document_url?.trim() || null,
      status: ReviewStatus.PENDING,
    });

    const saved = await this.requestRepo.save(request);

    return {
      message: 'Organization onboarding request submitted successfully. Awaiting administrative review.',
      request: saved,
    };
  }

  /**
   * Retrieves onboarding requests.
   * PLATFORM_ADMIN and GOVERNMENT_OFFICER can view all requests; normal users see only their own.
   */
  async findRequests(userId: string, userRole: string) {
    if (userRole === UserRole.PLATFORM_ADMIN || userRole === UserRole.GOVERNMENT_OFFICER) {
      return this.requestRepo.find({
        relations: ['requesterUser', 'reviewer', 'createdOrganization'],
        order: { created_at: 'DESC' },
      });
    }

    return this.requestRepo.find({
      where: { requester_user_id: userId },
      relations: ['createdOrganization'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Approves an onboarding request:
   * 1. Creates the Organization with geographic_reach (default: DISTRICT) and is_demo = false.
   * 2. Creates the corresponding polymorphic sub-profile (InstitutionProfile or IndustryProfile).
   * 3. Creates OrganizationMembership with ADMIN role for the requester.
   * 4. Securely elevates user platform role if CITIZEN (UNIVERSITY_ADMIN or INDUSTRY_ADMIN).
   * 5. Emits indexing event for AI vector generation.
   */
  async approveRequest(requestId: string, reviewerId: string, adminNotes?: string) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['requesterUser'],
    });

    if (!request) {
      throw new NotFoundException(`Onboarding request "${requestId}" not found.`);
    }

    if (request.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(`Cannot approve request with status "${request.status}". Only PENDING requests can be approved.`);
    }

    // 1. Create Organization
    const newOrg = this.orgRepo.create({
      name: request.name,
      organization_type: request.organization_type,
      email: request.email,
      website: request.website,
      phone: request.phone,
      address: request.address,
      district: request.district,
      state: request.state || 'Jharkhand',
      geographic_reach: request.geographic_reach || GeographicReach.DISTRICT,
      is_claimed: true,
      claimed_at: new Date(),
      verification_status: VerificationStatus.UNVERIFIED,
      is_demo: false,
    });
    const savedOrg = await this.orgRepo.save(newOrg);

    // 2. Create Sub-Profile
    if (savedOrg.organization_type === OrganizationType.INSTITUTION) {
      await this.instProfileRepo.save(
        this.instProfileRepo.create({
          organization_id: savedOrg.id,
          institution_code: `HEI-${Date.now().toString().slice(-6)}`,
          institution_category: 'Higher Education Institution',
        }),
      );
    } else {
      await this.indProfileRepo.save(
        this.indProfileRepo.create({
          organization_id: savedOrg.id,
          industry_type: 'General',
          company_registration_number: request.registration_number || null,
        }),
      );
    }

    // 3. Create OrganizationMembership with ADMIN privileges
    await this.membershipRepo.save(
      this.membershipRepo.create({
        organization_id: savedOrg.id,
        user_id: request.requester_user_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      }),
    );

    // 4. Atomic Platform Role Elevation (if user is currently CITIZEN)
    const requester = request.requesterUser || (await this.userRepo.findOne({ where: { id: request.requester_user_id } }));
    if (requester && requester.role === UserRole.CITIZEN) {
      if (savedOrg.organization_type === OrganizationType.INSTITUTION) {
        requester.role = UserRole.UNIVERSITY_ADMIN;
      } else {
        requester.role = UserRole.INDUSTRY_ADMIN;
      }
      await this.userRepo.save(requester);
    }

    // 5. Update Request Record
    request.status = ReviewStatus.APPROVED;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.admin_notes = adminNotes || 'Onboarding request verified and approved.';
    request.created_organization_id = savedOrg.id;
    const savedRequest = await this.requestRepo.save(request);

    // 6. Trigger AI Vector Indexing
    this.eventEmitter.emit('organization.updated', { organizationId: savedOrg.id });

    return {
      message: `Organization "${savedOrg.name}" successfully created and onboarded.`,
      organization: savedOrg,
      request: savedRequest,
    };
  }

  /**
   * Rejects an onboarding request with mandatory audit notes.
   */
  async rejectRequest(requestId: string, reviewerId: string, adminNotes: string) {
    if (!adminNotes || !adminNotes.trim()) {
      throw new BadRequestException('A reason/notes explaining the rejection is mandatory.');
    }

    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException(`Onboarding request "${requestId}" not found.`);
    }

    if (request.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(`Cannot reject request with status "${request.status}". Only PENDING requests can be rejected.`);
    }

    request.status = ReviewStatus.REJECTED;
    request.reviewed_by = reviewerId;
    request.reviewed_at = new Date();
    request.admin_notes = adminNotes.trim();

    const saved = await this.requestRepo.save(request);

    return {
      message: `Onboarding request for "${request.name}" rejected.`,
      request: saved,
    };
  }
}
