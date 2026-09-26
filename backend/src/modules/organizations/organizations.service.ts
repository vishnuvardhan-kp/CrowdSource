import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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

import { InstitutionProfile } from '../institutions/entities/institution-profile.entity';
import { Department } from '../institutions/entities/department.entity';
import { FacultyMember } from '../institutions/entities/faculty-member.entity';

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
    @Optional()
    @InjectRepository(InstitutionProfile)
    private readonly instProfileRepo?: Repository<InstitutionProfile>,
    @Optional()
    @InjectRepository(Department)
    private readonly deptRepo?: Repository<Department>,
    @Optional()
    @InjectRepository(FacultyMember)
    private readonly facultyRepo?: Repository<FacultyMember>,
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

  async assertOrgAccess(organizationId: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      user?.role === UserRole.PLATFORM_ADMIN ||
      user?.role === UserRole.GOVERNMENT_ADMIN ||
      user?.role === UserRole.GOVERNMENT_OFFICER
    ) {
      return;
    }
    const membership = await this.membershipRepo.findOne({
      where: {
        organization_id: organizationId,
        user_id: userId,
        membership_status: MembershipStatus.ACTIVE,
      },
    });
    if (!membership) {
      throw new ForbiddenException('You do not have access to view this organization roster.');
    }
  }

  async assertOrgAdmin(organizationId: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      user?.role === UserRole.PLATFORM_ADMIN ||
      user?.role === UserRole.GOVERNMENT_ADMIN
    ) {
      return;
    }
    const membership = await this.membershipRepo.findOne({
      where: {
        organization_id: organizationId,
        user_id: userId,
        membership_status: MembershipStatus.ACTIVE,
        organization_role: OrganizationRole.ADMIN,
      },
    });
    if (!membership) {
      throw new ForbiddenException('Only organization administrators can perform this action.');
    }
  }

  /**
   * Get members belonging to an organization with academic attributes and search filters.
   */
  async findMembers(
    organizationId: string,
    requestingUserId?: string,
    query?: { role?: string; department?: string; search?: string },
  ) {
    await this.findById(organizationId);
    if (requestingUserId) {
      await this.assertOrgAccess(organizationId, requestingUserId);
    }

    const qb = this.membershipRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'u')
      .where('m.organization_id = :orgId', { orgId: organizationId });

    if (query?.role) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query?.department) {
      qb.andWhere('LOWER(u.department) = :dept', {
        dept: query.department.toLowerCase().trim(),
      });
    }
    if (query?.search && query.search.trim()) {
      qb.andWhere('(LOWER(u.name) LIKE :s OR LOWER(u.email) LIKE :s)', {
        s: `%${query.search.toLowerCase().trim()}%`,
      });
    }

    qb.orderBy('m.created_at', 'ASC');

    const memberships = await qb.getMany();
    return memberships.map((m) => ({
      id: m.id,
      user_id: m.user_id,
      name: m.user?.name || '',
      email: m.user?.email || '',
      phone: m.user?.phone || null,
      role: m.user?.role || 'MEMBER',
      department: m.user?.department || null,
      designation: m.user?.designation || null,
      specializations: m.user?.specializations || [],
      organization_role: m.organization_role,
      membership_status: m.membership_status,
      is_active: m.user?.is_active ?? true,
      created_at: m.created_at,
    }));
  }

  /**
   * Adds or registers a member to the organization with department and designation.
   */
  async addMember(organizationId: string, requestingUserId: string, dto: any) {
    const org = await this.findById(organizationId);
    await this.assertOrgAdmin(organizationId, requestingUserId);

    if (!dto.email || !dto.name) {
      throw new BadRequestException('Member name and valid email are required.');
    }

    const email = dto.email.toLowerCase().trim();
    let user = await this.userRepo.findOne({ where: { email } });
    const isFaculty = dto.role === UserRole.FACULTY;
    const isStudent = dto.role === UserRole.STUDENT;

    if (!user) {
      const bcrypt = require('bcryptjs');
      const defaultHash = await bcrypt.hash('Samadhan@2026', 10);
      user = this.userRepo.create({
        email,
        name: dto.name.trim(),
        password_hash: defaultHash,
        role: dto.role || (org.organization_type === OrganizationType.INSTITUTION ? UserRole.FACULTY : UserRole.INDUSTRY_MEMBER),
        organization_id: org.id,
        department: dto.department?.trim() || null,
        designation: dto.designation?.trim() || (isStudent ? 'Student Researcher' : isFaculty ? 'Faculty Member' : null),
        specializations: Array.isArray(dto.specializations) ? dto.specializations : [],
        is_active: true,
      });
      user = await this.userRepo.save(user);
    } else {
      if (dto.role) user.role = dto.role;
      if (dto.department) user.department = dto.department.trim();
      if (dto.designation) user.designation = dto.designation.trim();
      if (dto.specializations) user.specializations = dto.specializations;
      if (!user.organization_id) user.organization_id = org.id;
      user = await this.userRepo.save(user);
    }

    let membership = await this.membershipRepo.findOne({
      where: {
        organization_id: org.id,
        user_id: user.id,
      },
    });

    if (!membership) {
      membership = this.membershipRepo.create({
        organization_id: org.id,
        user_id: user.id,
        organization_role: dto.organization_role || OrganizationRole.MEMBER,
        membership_status: MembershipStatus.ACTIVE,
      });
    } else {
      membership.membership_status = MembershipStatus.ACTIVE;
      if (dto.organization_role) {
        membership.organization_role = dto.organization_role;
      }
    }

    await this.membershipRepo.save(membership);

    // If Faculty and department is specified, create or link FacultyMember
    if (user.role === UserRole.FACULTY && dto.department && this.deptRepo && this.facultyRepo && this.instProfileRepo) {
      let inst = await this.instProfileRepo.findOne({ where: { organization_id: org.id } });
      if (!inst) {
        inst = await this.instProfileRepo.save(
          this.instProfileRepo.create({
            organization_id: org.id,
            institution_code: `HEI-${Date.now().toString().slice(-6)}`,
          }),
        );
      }
      let dept = await this.deptRepo.findOne({
        where: { institution_id: inst.id, name: dto.department.trim() },
      });
      if (!dept) {
        dept = await this.deptRepo.save(
          this.deptRepo.create({
            institution_id: inst.id,
            name: dto.department.trim(),
            code: dto.department.substring(0, 4).toUpperCase(),
          }),
        );
      }
      let faculty = await this.facultyRepo.findOne({
        where: { user_id: user.id, department_id: dept.id },
      });
      if (!faculty) {
        faculty = this.facultyRepo.create({
          department_id: dept.id,
          user_id: user.id,
          name: user.name,
          designation: user.designation || 'Faculty Member',
          email: user.email,
          specializations: user.specializations || [],
        });
        await this.facultyRepo.save(faculty);
      }
    }

    return {
      message: `Member "${user.name}" successfully added to ${org.name}.`,
      member: {
        id: membership.id,
        user_id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization_role: membership.organization_role,
        membership_status: membership.membership_status,
        department: user.department,
        designation: user.designation,
        specializations: user.specializations,
      },
    };
  }

  /**
   * Removes a member from an organization roster.
   */
  async removeMember(organizationId: string, memberIdOrUserId: string, requestingUserId: string) {
    await this.assertOrgAdmin(organizationId, requestingUserId);

    const membership = await this.membershipRepo.findOne({
      where: [
        { id: memberIdOrUserId, organization_id: organizationId },
        { user_id: memberIdOrUserId, organization_id: organizationId },
      ],
    });

    if (!membership) {
      throw new NotFoundException('Member not found in this organization.');
    }

    membership.membership_status = MembershipStatus.INACTIVE;
    await this.membershipRepo.save(membership);

    return { success: true, message: 'Member successfully removed from organization roster.' };
  }

  /**
   * Retrieves departments for an organization's institution profile.
   */
  async getDepartments(organizationId: string, requestingUserId?: string) {
    if (requestingUserId) {
      await this.assertOrgAccess(organizationId, requestingUserId);
    }
    const org = await this.findById(organizationId);
    let inst = await this.instProfileRepo?.findOne({ where: { organization_id: org.id } });
    if (!inst) {
      return [];
    }
    return this.deptRepo?.find({
      where: { institution_id: inst.id },
      relations: ['faculty'],
      order: { name: 'ASC' },
    }) || [];
  }

  /**
   * Creates a department for an organization's institution profile.
   */
  async createDepartment(organizationId: string, requestingUserId: string, dto: any) {
    await this.assertOrgAdmin(organizationId, requestingUserId);
    if (!dto.name || dto.name.trim().length < 2) {
      throw new BadRequestException('A valid department name is required.');
    }
    const org = await this.findById(organizationId);
    if (!this.instProfileRepo || !this.deptRepo) {
      throw new BadRequestException('Department repository not configured.');
    }

    let inst = await this.instProfileRepo.findOne({ where: { organization_id: org.id } });
    if (!inst) {
      inst = await this.instProfileRepo.save(
        this.instProfileRepo.create({
          organization_id: org.id,
          institution_code: `HEI-${Date.now().toString().slice(-6)}`,
        }),
      );
    }

    let dept = await this.deptRepo.findOne({
      where: { institution_id: inst.id, name: dto.name.trim() },
    });
    if (dept) {
      throw new ConflictException(`Department "${dto.name.trim()}" already exists in this institution.`);
    }

    dept = this.deptRepo.create({
      institution_id: inst.id,
      name: dto.name.trim(),
      code: dto.code?.trim() || dto.name.substring(0, 4).toUpperCase(),
      head_of_department: dto.head_of_department?.trim() || null,
      contact_email: dto.contact_email?.trim() || null,
      description: dto.description?.trim() || null,
      status: 'ACTIVE',
    });

    return this.deptRepo.save(dept);
  }

  /**
   * Deletes a department from an organization's institution profile.
   */
  async deleteDepartment(organizationId: string, departmentId: string, requestingUserId: string) {
    await this.assertOrgAdmin(organizationId, requestingUserId);
    const org = await this.findById(organizationId);
    let inst = await this.instProfileRepo?.findOne({ where: { organization_id: org.id } });
    if (!inst) {
      throw new NotFoundException('Institution profile not found.');
    }
    const dept = await this.deptRepo?.findOne({
      where: { id: departmentId, institution_id: inst.id },
    });
    if (!dept) {
      throw new NotFoundException('Department not found.');
    }
    await this.deptRepo.delete(dept.id);
    return { success: true, message: 'Department deleted successfully.' };
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
