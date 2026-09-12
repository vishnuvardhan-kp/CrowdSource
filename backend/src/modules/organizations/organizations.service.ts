import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationMembership } from './entities/organization-membership.entity';
import { OrganizationClaimRequest } from './entities/organization-claim-request.entity';
import { User } from '../users/entities/user.entity';
import {
  ClaimRequestStatus,
  UserRole,
  OrganizationRole,
  MembershipStatus,
  OrganizationType,
} from '../../common/enums';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';

@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly membershipRepo: Repository<OrganizationMembership>,
    @InjectRepository(OrganizationClaimRequest)
    private readonly claimRepo: Repository<OrganizationClaimRequest>,
    @Optional()
    @InjectRepository(User)
    private readonly userRepo?: Repository<User>,
  ) {}

  /**
   * Search / list public organization profiles.
   */
  async findAll(search?: string, type?: string, district?: string) {
    const qb = this.orgRepo.createQueryBuilder('org');

    if (search && search.trim()) {
      qb.andWhere('LOWER(org.name) LIKE :search', {
        search: `%${search.toLowerCase().trim()}%`,
      });
    }

    if (type) {
      qb.andWhere('org.organization_type = :type', { type });
    }

    if (district) {
      qb.andWhere('LOWER(org.district) = :district', {
        district: district.toLowerCase().trim(),
      });
    }

    qb.orderBy('org.name', 'ASC');

    return qb.getMany();
  }

  /**
   * Get single organization profile details.
   */
  async findById(id: string) {
    const org = await this.orgRepo.findOne({
      where: { id },
      relations: ['institutionProfile', 'industryProfile'],
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID "${id}" was not found.`);
    }

    return org;
  }

  /**
   * Get members belonging to an organization.
   */
  async findMembers(organizationId: string) {
    await this.findById(organizationId);

    return this.membershipRepo.find({
      where: { organization_id: organizationId },
      relations: ['user'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Submit an organization claim request.
   * Claim requests are stored in PENDING status and do NOT grant admin access.
   */
  async createClaimRequest(userId: string, dto: CreateClaimRequestDto) {
    const org = await this.findById(dto.organization_id);

    const existingPending = await this.claimRepo.findOne({
      where: {
        organization_id: dto.organization_id,
        requesting_user_id: userId,
        status: ClaimRequestStatus.PENDING,
      },
    });

    if (existingPending) {
      throw new ConflictException(
        'You already have a pending claim request under review for this organization.'
      );
    }

    const claim = this.claimRepo.create({
      organization_id: org.id,
      requesting_user_id: userId,
      reason: dto.reason.trim(),
      status: ClaimRequestStatus.PENDING,
    });

    const savedClaim = await this.claimRepo.save(claim);

    return {
      message: 'Organization claim request submitted successfully. Awaiting administrative review.',
      claim: {
        id: savedClaim.id,
        organization_id: savedClaim.organization_id,
        organization_name: org.name,
        status: savedClaim.status,
        reason: savedClaim.reason,
        submitted_at: savedClaim.submitted_at,
      },
    };
  }

  /**
   * Retrieve claim requests.
   * PLATFORM_ADMIN can view all claims; regular users can view only their own.
   */
  async findClaimRequests(userId: string, userRole: string) {
    if (userRole === UserRole.PLATFORM_ADMIN || userRole === UserRole.GOVERNMENT_OFFICER) {
      return this.claimRepo.find({
        relations: ['organization', 'requestingUser', 'reviewer'],
        order: { submitted_at: 'DESC' },
      });
    }

    return this.claimRepo.find({
      where: { requesting_user_id: userId },
      relations: ['organization'],
      order: { submitted_at: 'DESC' },
    });
  }

  /**
   * Approves an organization claim request (Scenario A).
   * 1. Marks organization is_claimed = true, claimed_at = now
   * 2. Invariant: Does NOT automatically make availability FRESH
   * 3. Creates/activates OrganizationMembership with ADMIN role
   * 4. Elevates user role if currently CITIZEN
   * 5. Sets claim status to APPROVED
   */
  async approveClaimRequest(claimId: string, reviewerId: string, notes?: string) {
    const claim = await this.claimRepo.findOne({
      where: { id: claimId },
      relations: ['organization', 'requestingUser'],
    });

    if (!claim) {
      throw new NotFoundException(`Claim request "${claimId}" not found.`);
    }

    if (claim.status !== ClaimRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot approve claim with status "${claim.status}". Only PENDING claims can be approved.`);
    }

    // 1. Mark organization claimed (Availability remains unchanged per invariant)
    const org = claim.organization;
    org.is_claimed = true;
    org.claimed_at = new Date();
    await this.orgRepo.save(org);

    // 2. Create or activate OrganizationMembership
    let membership = await this.membershipRepo.findOne({
      where: {
        organization_id: org.id,
        user_id: claim.requesting_user_id,
      },
    });

    if (!membership) {
      membership = this.membershipRepo.create({
        organization_id: org.id,
        user_id: claim.requesting_user_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      });
    } else {
      membership.organization_role = OrganizationRole.ADMIN;
      membership.membership_status = MembershipStatus.ACTIVE;
    }
    await this.membershipRepo.save(membership);

    // 3. Role elevation if user is currently CITIZEN
    const user = claim.requestingUser;
    if (user && user.role === UserRole.CITIZEN && this.userRepo) {
      if (org.organization_type === OrganizationType.INSTITUTION) {
        user.role = UserRole.UNIVERSITY_ADMIN;
      } else {
        user.role = UserRole.INDUSTRY_ADMIN;
      }
      await this.userRepo.save(user);
    }

    // 4. Update claim
    claim.status = ClaimRequestStatus.APPROVED;
    claim.reviewed_by = reviewerId;
    claim.reviewed_at = new Date();
    claim.review_notes = notes || 'Claim approved by administrator.';
    const savedClaim = await this.claimRepo.save(claim);

    return {
      message: `Claim for organization "${org.name}" approved successfully.`,
      claim: savedClaim,
      organization: org,
    };
  }

  /**
   * Rejects an organization claim request.
   */
  async rejectClaimRequest(claimId: string, reviewerId: string, notes: string) {
    if (!notes || !notes.trim()) {
      throw new BadRequestException('A reason/note explaining rejection is mandatory.');
    }

    const claim = await this.claimRepo.findOne({ where: { id: claimId } });
    if (!claim) {
      throw new NotFoundException(`Claim request "${claimId}" not found.`);
    }

    if (claim.status !== ClaimRequestStatus.PENDING) {
      throw new BadRequestException(`Cannot reject claim with status "${claim.status}". Only PENDING claims can be rejected.`);
    }

    claim.status = ClaimRequestStatus.REJECTED;
    claim.reviewed_by = reviewerId;
    claim.reviewed_at = new Date();
    claim.review_notes = notes.trim();
    const savedClaim = await this.claimRepo.save(claim);

    return {
      message: 'Claim request rejected.',
      claim: savedClaim,
    };
  }
}
