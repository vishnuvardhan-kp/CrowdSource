import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, ILike } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';

import {
  ProposedSolutionStatus,
  SolutionVisibility,
  SolutionCollaborationType,
  SolutionCollaborationStatus,
  SolutionTeamRole,
  SolutionDocumentType,
  ProjectStatus,
  ChallengeStatus,
  UserRole,
  MembershipStatus,
  OrganizationRole,
  ProjectContributionType,
  ContributionStatus,
  NotificationType,
  AcademicMemberRole,
  AcademicMemberStatus,
  MilestoneStatus,
} from '../../common/enums';

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
import { ProjectMilestone } from '../projects/entities/project-milestone.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { ProjectAcademicMember } from '../projects/entities/project-academic-member.entity';
import { ProjectContribution } from '../projects/entities/project-contribution.entity';
import { NotificationsService } from '../notifications/notifications.service';

import {
  CreateProposedSolutionDto,
  UpdateProposedSolutionDto,
  QuerySolutionsDto,
  AddSolutionMemberDto,
  CreateCollaborationOfferDto,
  RespondCollaborationOfferDto,
  ConvertSolutionToProjectDto,
} from './dto';

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  filename?: string;
  path?: string;
}

@Injectable()
export class SolutionsService {
  private readonly logger = new Logger(SolutionsService.name);
  private readonly uploadDir: string;

  constructor(
    @InjectRepository(ProposedSolution)
    private readonly solutionRepo: Repository<ProposedSolution>,
    @InjectRepository(SolutionTeamMember)
    private readonly teamMemberRepo: Repository<SolutionTeamMember>,
    @InjectRepository(SolutionDocument)
    private readonly documentRepo: Repository<SolutionDocument>,
    @InjectRepository(SolutionCollaboration)
    private readonly collaborationRepo: Repository<SolutionCollaboration>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ProblemCluster)
    private readonly clusterRepo: Repository<ProblemCluster>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepo: Repository<ProjectParticipant>,
    @InjectRepository(ProjectAcademicMember)
    private readonly acadMemberRepo: Repository<ProjectAcademicMember>,
    @InjectRepository(ProjectContribution)
    private readonly contribRepo: Repository<ProjectContribution>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notifService?: NotificationsService,
  ) {
    this.uploadDir = path.resolve(
      process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'solutions'),
    );
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // =========================================================================
  // 1. AUTHORIZATION HELPERS
  // =========================================================================

  private async assertOrgMembership(
    orgId: string,
    userId: string,
    requireAdmin: boolean = false,
  ): Promise<OrganizationMembership> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (
      user &&
      (user.role === UserRole.PLATFORM_ADMIN ||
        user.role === UserRole.GOVERNMENT_ADMIN ||
        user.role === UserRole.GOVERNMENT_OFFICER)
    ) {
      return {
        id: 'admin-override',
        organization_id: orgId,
        user_id: userId,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      } as any;
    }

    const membership = await this.memberRepo.findOne({
      where: {
        organization_id: orgId,
        user_id: userId,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not an active member of this organization.');
    }

    if (requireAdmin && membership.organization_role !== OrganizationRole.ADMIN) {
      throw new ForbiddenException('Only organization administrators can perform this action.');
    }

    return membership;
  }

  private async assertSolutionAccess(
    solution: ProposedSolution,
    userId: string,
    requireAdmin: boolean = false,
  ): Promise<void> {
    await this.assertOrgMembership(solution.proposing_organization_id, userId, requireAdmin);
  }

  // =========================================================================
  // 2. PROPOSED SOLUTION CRUD
  // =========================================================================

  async createSolution(
    orgId: string,
    userId: string,
    dto: CreateProposedSolutionDto,
  ): Promise<ProposedSolution> {
    await this.assertOrgMembership(orgId, userId);

    const challenge = await this.challengeRepo.findOne({
      where: { id: dto.challenge_id },
      relations: ['cluster'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${dto.challenge_id}" not found.`);
    }

    const clusterId = dto.cluster_id || challenge.cluster_id || null;

    const solution = this.solutionRepo.create({
      challenge_id: challenge.id,
      cluster_id: clusterId,
      proposing_organization_id: orgId,
      title: dto.title.trim(),
      executive_summary: dto.executive_summary?.trim() || null,
      problem_understanding: dto.problem_understanding?.trim() || null,
      proposed_approach: dto.proposed_approach?.trim() || null,
      technical_approach: dto.technical_approach?.trim() || null,
      required_capabilities: dto.required_capabilities || [],
      expected_outcomes: dto.expected_outcomes?.trim() || null,
      expected_social_impact: dto.expected_social_impact?.trim() || null,
      estimated_budget: dto.estimated_budget ?? null,
      estimated_timeline: dto.estimated_timeline?.trim() || null,
      required_resources: dto.required_resources?.trim() || null,
      prototype_requirements: dto.prototype_requirements?.trim() || null,
      deployment_requirements: dto.deployment_requirements?.trim() || null,
      innovation_potential: dto.innovation_potential?.trim() || null,
      ip_potential: dto.ip_potential?.trim() || null,
      status: ProposedSolutionStatus.DRAFT,
      visibility: dto.visibility || SolutionVisibility.PUBLIC,
      created_by: userId,
    });

    const saved = await this.solutionRepo.save(solution);
    return this.getSolutionById(saved.id, userId);
  }

  async updateSolution(
    solutionId: string,
    userId: string,
    dto: UpdateProposedSolutionDto,
  ): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    if (
      solution.status === ProposedSolutionStatus.CONVERTED_TO_PROJECT ||
      solution.status === ProposedSolutionStatus.COMPLETED ||
      solution.status === ProposedSolutionStatus.ARCHIVED
    ) {
      throw new BadRequestException(
        `Cannot update solution in status "${solution.status}".`,
      );
    }

    if (dto.title !== undefined) solution.title = dto.title.trim();
    if (dto.cluster_id !== undefined) solution.cluster_id = dto.cluster_id;
    if (dto.executive_summary !== undefined) solution.executive_summary = dto.executive_summary?.trim() || null;
    if (dto.problem_understanding !== undefined) solution.problem_understanding = dto.problem_understanding?.trim() || null;
    if (dto.proposed_approach !== undefined) solution.proposed_approach = dto.proposed_approach?.trim() || null;
    if (dto.technical_approach !== undefined) solution.technical_approach = dto.technical_approach?.trim() || null;
    if (dto.required_capabilities !== undefined) solution.required_capabilities = dto.required_capabilities;
    if (dto.expected_outcomes !== undefined) solution.expected_outcomes = dto.expected_outcomes?.trim() || null;
    if (dto.expected_social_impact !== undefined) solution.expected_social_impact = dto.expected_social_impact?.trim() || null;
    if (dto.estimated_budget !== undefined) solution.estimated_budget = dto.estimated_budget;
    if (dto.estimated_timeline !== undefined) solution.estimated_timeline = dto.estimated_timeline?.trim() || null;
    if (dto.required_resources !== undefined) solution.required_resources = dto.required_resources?.trim() || null;
    if (dto.prototype_requirements !== undefined) solution.prototype_requirements = dto.prototype_requirements?.trim() || null;
    if (dto.deployment_requirements !== undefined) solution.deployment_requirements = dto.deployment_requirements?.trim() || null;
    if (dto.innovation_potential !== undefined) solution.innovation_potential = dto.innovation_potential?.trim() || null;
    if (dto.ip_potential !== undefined) solution.ip_potential = dto.ip_potential?.trim() || null;
    if (dto.visibility !== undefined) solution.visibility = dto.visibility;

    await this.solutionRepo.save(solution);
    return this.getSolutionById(solution.id, userId);
  }

  async getSolutionById(solutionId: string, requestingUserId?: string): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: [
        'challenge',
        'cluster',
        'proposingOrganization',
        'proposingOrganization.institutionProfile',
        'teamMembers',
        'teamMembers.organization',
        'teamMembers.user',
        'documents',
        'documents.uploader',
        'collaborations',
        'collaborations.offeringOrganization',
        'collaborations.offeringUser',
        'project',
        'creator',
      ],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed Solution with ID "${solutionId}" not found.`);
    }

    const departmentCounts: Record<string, number> = {};
    for (const tm of solution.teamMembers || []) {
      const dept = tm.department || 'General / Interdisciplinary';
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
    }
    (solution as any).multidisciplinary_summary = {
      department_counts: departmentCounts,
      departments_represented: Object.keys(departmentCounts),
      total_departments: Object.keys(departmentCounts).length,
      total_members: (solution.teamMembers || []).length,
      has_multidisciplinary_team: Object.keys(departmentCounts).length > 1,
    };

    // Phase 3: Confidentiality & Scoping Authorization
    let isInternalTeamOrAdmin = false;
    let isAcceptedPartner = false;
    const userOrgIds: string[] = [];

    if (requestingUserId) {
      const requestingUser = await this.userRepo.findOne({
        where: { id: requestingUserId },
        relations: ['memberships'],
      });
      if (requestingUser) {
        if (requestingUser.organization_id) {
          userOrgIds.push(requestingUser.organization_id);
        }
        for (const m of requestingUser.memberships || []) {
          if (m.membership_status === MembershipStatus.ACTIVE && m.organization_id) {
            userOrgIds.push(m.organization_id);
          }
        }

        if (
          requestingUser.role === UserRole.PLATFORM_ADMIN ||
          requestingUser.role === UserRole.GOVERNMENT_ADMIN ||
          requestingUser.role === UserRole.GOVERNMENT_OFFICER
        ) {
          isInternalTeamOrAdmin = true;
        }

        if (userOrgIds.includes(solution.proposing_organization_id)) {
          isInternalTeamOrAdmin = true;
        }

        if (solution.teamMembers?.some((tm) => tm.user_id === requestingUserId)) {
          isInternalTeamOrAdmin = true;
        }
      }
    }

    if (!isInternalTeamOrAdmin && userOrgIds.length > 0) {
      const hasAcceptedCollab = (solution.collaborations || []).some(
        (c) =>
          userOrgIds.includes(c.offering_organization_id) &&
          (c.status === SolutionCollaborationStatus.ACCEPTED ||
            c.status === SolutionCollaborationStatus.CONVERTED_TO_PROJECT),
      );
      if (hasAcceptedCollab) {
        isAcceptedPartner = true;
      }
    }

    // Apply scoping and masking for external users before acceptance
    if (!isInternalTeamOrAdmin && !isAcceptedPartner) {
      // 1. External organizations only see their own collaboration offers (not competitors' private offers)
      if (userOrgIds.length > 0) {
        solution.collaborations = (solution.collaborations || []).filter((c) =>
          userOrgIds.includes(c.offering_organization_id),
        );
      } else {
        solution.collaborations = [];
      }

      // 2. Sensitive documents (BLUEPRINT, PROTOTYPE_SPECIFICATION) are masked
      if (solution.documents && solution.documents.length > 0) {
        solution.documents = solution.documents.map((doc) => {
          const isSensitive =
            doc.document_type === SolutionDocumentType.BLUEPRINT ||
            doc.document_type === SolutionDocumentType.PROTOTYPE_SPECIFICATION;
          if (isSensitive) {
            return {
              ...doc,
              storage_key: '[CONFIDENTIAL_RESTRICTED]',
              file_url: null,
              title: `${doc.title} (Restricted - Requires Accepted Collaboration)`,
              is_confidential: true,
            } as SolutionDocument;
          }
          return doc;
        });
      }

      (solution as any).confidentiality_status = {
        is_external_view: true,
        is_ip_protected: true,
        confidential_documents_masked: true,
        collaboration_offers_scoped: true,
        full_access_granted: false,
      };
    } else {
      (solution as any).confidentiality_status = {
        is_external_view: false,
        is_ip_protected: false,
        confidential_documents_masked: false,
        collaboration_offers_scoped: false,
        full_access_granted: true,
      };
    }

    return solution;
  }

  async getPublicSolutions(query: QuerySolutionsDto): Promise<{
    items: ProposedSolution[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const qb = this.solutionRepo
      .createQueryBuilder('sol')
      .leftJoinAndSelect('sol.challenge', 'ch')
      .leftJoinAndSelect('sol.cluster', 'cl')
      .leftJoinAndSelect('sol.proposingOrganization', 'org')
      .leftJoinAndSelect('sol.teamMembers', 'tm')
      .leftJoinAndSelect('sol.collaborations', 'collab')
      .leftJoinAndSelect('collab.offeringOrganization', 'collabOrg')
      .leftJoinAndSelect('sol.project', 'proj');

    // Default: Only show published or open solutions in public workspace, unless explicitly queried
    if (query.status && (query.status as string) !== 'ALL') {
      qb.andWhere('sol.status = :status', { status: query.status });
    } else if (!query.status) {
      qb.andWhere('sol.status IN (:...openStatuses)', {
        openStatuses: [
          ProposedSolutionStatus.PUBLISHED,
          ProposedSolutionStatus.COLLABORATION_OPEN,
          ProposedSolutionStatus.CONVERTED_TO_PROJECT,
        ],
      });
    }

    if (query.challenge_id) {
      qb.andWhere('sol.challenge_id = :challenge_id', { challenge_id: query.challenge_id });
    }

    if (query.cluster_id) {
      qb.andWhere('sol.cluster_id = :cluster_id', { cluster_id: query.cluster_id });
    }

    if (query.organization_id) {
      qb.andWhere('sol.proposing_organization_id = :org_id', { org_id: query.organization_id });
    }

    if (query.district) {
      qb.andWhere('ch.district ILIKE :dist', { dist: `%${query.district}%` });
    }

    if (query.domain) {
      qb.andWhere('ch.category ILIKE :cat', { cat: `%${query.domain}%` });
    }

    if (query.search) {
      qb.andWhere(
        '(sol.title ILIKE :s OR sol.executive_summary ILIKE :s OR sol.proposed_approach ILIKE :s OR org.name ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    if (query.collaboration_type) {
      qb.andWhere('collab.collaboration_type = :ctype', { ctype: query.collaboration_type });
    }

    qb.orderBy('sol.created_at', 'DESC');

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMyOrganizationSolutions(orgId: string, userId: string): Promise<ProposedSolution[]> {
    await this.assertOrgMembership(orgId, userId);

    return this.solutionRepo.find({
      where: { proposing_organization_id: orgId },
      relations: [
        'challenge',
        'teamMembers',
        'collaborations',
        'collaborations.offeringOrganization',
        'project',
      ],
      order: { created_at: 'DESC' },
    });
  }

  // =========================================================================
  // 3. TEAM MEMBER MANAGEMENT
  // =========================================================================

  async addTeamMember(
    solutionId: string,
    userId: string,
    dto: AddSolutionMemberDto,
  ): Promise<SolutionTeamMember> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    let candidateUser: User | null = null;
    if (dto.user_id) {
      candidateUser = await this.userRepo.findOne({
        where: { id: dto.user_id },
        relations: ['memberships'],
      });
      if (!candidateUser) {
        throw new NotFoundException(`User with ID "${dto.user_id}" not found.`);
      }
    } else if (dto.email) {
      candidateUser = await this.userRepo.findOne({
        where: { email: dto.email.trim().toLowerCase() },
        relations: ['memberships'],
      });
    }

    if (candidateUser) {
      // 1. User must belong to the proposing university
      const belongsToProposingOrg =
        candidateUser.organization_id === solution.proposing_organization_id ||
        candidateUser.memberships?.some(
          (m) =>
            m.organization_id === solution.proposing_organization_id &&
            m.membership_status === MembershipStatus.ACTIVE,
        );

      if (!belongsToProposingOrg) {
        throw new ForbiddenException(
          'User from another organization cannot be added as an internal university team member.',
        );
      }

      // 2. Inactive membership cannot be assigned
      const membership = candidateUser.memberships?.find(
        (m) => m.organization_id === solution.proposing_organization_id,
      );
      if (
        candidateUser.is_active === false ||
        (membership && membership.membership_status !== MembershipStatus.ACTIVE)
      ) {
        throw new BadRequestException('Inactive members cannot be added to a solution team.');
      }

      // 3. STUDENT cannot be assigned FACULTY_MENTOR
      const isStudent = candidateUser.role === UserRole.STUDENT || (candidateUser.role as string) === 'STUDENT';
      if (
        isStudent &&
        dto.role === SolutionTeamRole.FACULTY_MENTOR
      ) {
        throw new BadRequestException('A student cannot be assigned as a faculty mentor.');
      }

      // 4. Duplicate team member is prevented
      const duplicate = await this.teamMemberRepo.findOne({
        where: { solution_id: solution.id, user_id: candidateUser.id },
      });
      if (duplicate) {
        throw new ConflictException('This member is already part of the solution team.');
      }
    } else if (dto.email) {
      const duplicateByEmail = await this.teamMemberRepo.findOne({
        where: { solution_id: solution.id, email: dto.email.trim().toLowerCase() },
      });
      if (duplicateByEmail) {
        throw new ConflictException('A member with this email is already part of the solution team.');
      }
    }

    const memberName = dto.name?.trim() || candidateUser?.name;
    if (!memberName) {
      throw new BadRequestException('Member name is required.');
    }

    const memberEmail = dto.email?.trim() || candidateUser?.email || null;
    const memberDept = dto.department?.trim() || candidateUser?.department || null;
    const memberDesig = dto.designation?.trim() || candidateUser?.designation || null;
    const memberSkills =
      dto.specialization_skills && dto.specialization_skills.length > 0
        ? dto.specialization_skills
        : (candidateUser?.specializations || []);

    const member = this.teamMemberRepo.create({
      solution_id: solution.id,
      user_id: candidateUser?.id || null,
      organization_id: solution.proposing_organization_id,
      name: memberName,
      email: memberEmail,
      role: dto.role,
      department: memberDept,
      designation: memberDesig,
      degree_program: dto.degree_program?.trim() || null,
      student_year: dto.student_year ?? null,
      weekly_commitment_hours: dto.weekly_commitment_hours ?? null,
      specialization_skills: memberSkills,
    });

    return this.teamMemberRepo.save(member);
  }

  async removeTeamMember(
    solutionId: string,
    memberId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    const member = await this.teamMemberRepo.findOne({
      where: { id: memberId, solution_id: solutionId },
    });

    if (!member) {
      throw new NotFoundException(`Team member "${memberId}" not found.`);
    }

    await this.teamMemberRepo.delete(memberId);
    return { success: true, message: 'Team member removed successfully.' };
  }

  // =========================================================================
  // 4. SUBMIT & PUBLISH WORKFLOW
  // =========================================================================

  async submitSolution(solutionId: string, userId: string): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: ['challenge', 'proposingOrganization'],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    if (!solution.title || solution.title.length < 5) {
      throw new BadRequestException('A descriptive solution title is required.');
    }

    if (!solution.executive_summary && !solution.proposed_approach) {
      throw new BadRequestException('Executive summary or proposed approach is required.');
    }

    solution.status = ProposedSolutionStatus.SUBMITTED;
    solution.submitted_at = new Date();
    await this.solutionRepo.save(solution);

    // Notify government officers
    try {
      if (solution.challenge?.district) {
        await this.notifService?.notifyDistrictOfficers(
          solution.challenge.district,
          NotificationType.SOLUTION_UPDATE,
          `New Solution Submitted: ${solution.title}`,
          `Institution "${solution.proposingOrganization?.name || 'University'}" submitted a proposed solution for "${solution.challenge?.title}".`,
          'SOLUTION',
          solution.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch solution submission notification: ${e}`);
    }

    return this.getSolutionById(solution.id, userId);
  }

  async publishSolution(solutionId: string, userId: string): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: ['challenge', 'proposingOrganization'],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    // Proposing university admin OR platform/gov admin can publish
    await this.assertSolutionAccess(solution, userId, true);

    solution.status = ProposedSolutionStatus.COLLABORATION_OPEN;
    solution.published_at = new Date();
    await this.solutionRepo.save(solution);

    try {
      await this.notifService?.notifyOrganization(
        solution.proposing_organization_id,
        NotificationType.SOLUTION_UPDATE,
        `Solution Published: ${solution.title}`,
        `Your proposed solution is now live in the Open Solution Workspace. Partner universities, startups, and industries can now discover it and offer collaboration.`,
        'SOLUTION',
        solution.id,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch solution published notification: ${e}`);
    }

    return this.getSolutionById(solution.id, userId);
  }

  async reviewSolution(
    solutionId: string,
    reviewerId: string,
    reviewNotes?: string,
  ): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: ['challenge', 'proposingOrganization'],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    solution.status = ProposedSolutionStatus.UNDER_REVIEW;
    if (reviewNotes) {
      solution.review_notes = reviewNotes.trim();
    }
    await this.solutionRepo.save(solution);

    try {
      await this.notifService?.notifyOrganization(
        solution.proposing_organization_id,
        NotificationType.SOLUTION_UPDATE,
        `Solution Under Review: ${solution.title}`,
        `Your proposed solution is currently being reviewed by government administrators.${reviewNotes ? ` Review notes: ${reviewNotes}` : ''}`,
        'SOLUTION',
        solution.id,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch review notification: ${e}`);
    }

    return this.getSolutionById(solution.id, reviewerId);
  }

  async rejectSolution(
    solutionId: string,
    reviewerId: string,
    reason: string,
  ): Promise<ProposedSolution> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: ['challenge', 'proposingOrganization'],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    if (!reason || reason.trim().length < 5) {
      throw new BadRequestException('A reason for rejection is required (minimum 5 characters).');
    }

    solution.status = ProposedSolutionStatus.REJECTED;
    solution.rejection_reason = reason.trim();
    await this.solutionRepo.save(solution);

    try {
      await this.notifService?.notifyOrganization(
        solution.proposing_organization_id,
        NotificationType.SOLUTION_UPDATE,
        `Solution Not Approved: ${solution.title}`,
        `Your proposed solution was reviewed and not approved for the following reason: ${reason}`,
        'SOLUTION',
        solution.id,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch rejection notification: ${e}`);
    }

    return this.getSolutionById(solution.id, reviewerId);
  }

  // =========================================================================
  // 5. SUPPORTING DOCUMENTS VAULT
  // =========================================================================

  async uploadDocument(
    solutionId: string,
    userId: string,
    file: ExpressUploadedFile,
    documentType: SolutionDocumentType = SolutionDocumentType.OTHER,
    title?: string,
  ): Promise<SolutionDocument> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    if (!file) {
      throw new BadRequestException('A document file is required.');
    }

    const safeBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `sol-${Date.now()}-${safeBaseName}`;
    const targetPath = path.join(this.uploadDir, storageKey);

    await fs.promises.writeFile(targetPath, file.buffer);

    const doc = this.documentRepo.create({
      solution_id: solution.id,
      uploaded_by: userId,
      title: title || file.originalname.slice(0, 250),
      document_type: documentType,
      storage_key: storageKey,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      url: `/api/solutions/documents/${storageKey}/download`,
      metadata: { uploaded_at: new Date().toISOString() },
    });

    return this.documentRepo.save(doc);
  }

  async removeDocument(
    solutionId: string,
    documentId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId);

    const doc = await this.documentRepo.findOne({
      where: { id: documentId, solution_id: solutionId },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${documentId}" not found.`);
    }

    const filePath = path.join(this.uploadDir, doc.storage_key);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        this.logger.warn(`Failed to delete physical file: ${err}`);
      }
    }

    await this.documentRepo.delete(documentId);
    return { success: true, message: 'Document removed successfully.' };
  }

  async serveDocumentFile(filename: string, res: Response, requestingUserId?: string) {
    const safeBase = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeBase);

    const relative = path.relative(this.uploadDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Document file not found.');
    }

    // Check if document is confidential/blueprint
    const doc = await this.documentRepo.findOne({
      where: { storage_key: safeBase },
      relations: ['solution', 'solution.collaborations'],
    });

    if (doc) {
      const isSensitive =
        doc.document_type === SolutionDocumentType.BLUEPRINT ||
        doc.document_type === SolutionDocumentType.PROTOTYPE_SPECIFICATION;

      if (isSensitive) {
        if (!requestingUserId) {
          throw new ForbiddenException(
            'This confidential blueprint / technical document is restricted to the solution team and accepted consortium partners.',
          );
        }

        const user = await this.userRepo.findOne({
          where: { id: requestingUserId },
          relations: ['memberships'],
        });

        const userOrgIds: string[] = [];
        if (user) {
          if (user.organization_id) userOrgIds.push(user.organization_id);
          for (const m of user.memberships || []) {
            if (m.membership_status === MembershipStatus.ACTIVE && m.organization_id) {
              userOrgIds.push(m.organization_id);
            }
          }
        }

        const isInternalOrAdmin =
          user?.role === UserRole.PLATFORM_ADMIN ||
          user?.role === UserRole.GOVERNMENT_ADMIN ||
          user?.role === UserRole.GOVERNMENT_OFFICER ||
          userOrgIds.includes(doc.solution?.proposing_organization_id);

        const isAcceptedPartner = (doc.solution?.collaborations || []).some(
          (c) =>
            userOrgIds.includes(c.offering_organization_id) &&
            (c.status === SolutionCollaborationStatus.ACCEPTED ||
              c.status === SolutionCollaborationStatus.CONVERTED_TO_PROJECT),
        );

        if (!isInternalOrAdmin && !isAcceptedPartner) {
          throw new ForbiddenException(
            'This confidential blueprint / technical document is restricted to the solution team and accepted consortium partners.',
          );
        }
      }
    }

    res.sendFile(filePath);
  }

  // =========================================================================
  // 6. COLLABORATION OFFERS FLOW
  // =========================================================================

  async createCollaborationOffer(
    solutionId: string,
    offeringOrgId: string,
    offeringUserId: string,
    dto: CreateCollaborationOfferDto,
  ): Promise<SolutionCollaboration> {
    const solution = await this.solutionRepo.findOne({
      where: { id: solutionId },
      relations: ['proposingOrganization'],
    });

    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    if (
      solution.status !== ProposedSolutionStatus.PUBLISHED &&
      solution.status !== ProposedSolutionStatus.COLLABORATION_OPEN
    ) {
      throw new BadRequestException(
        `This solution is currently in status "${solution.status}" and is not open for collaboration offers.`,
      );
    }

    if (solution.proposing_organization_id === offeringOrgId) {
      throw new BadRequestException('An organization cannot submit a collaboration offer to its own solution.');
    }

    await this.assertOrgMembership(offeringOrgId, offeringUserId);

    const offeringOrg = await this.orgRepo.findOne({ where: { id: offeringOrgId } });
    if (!offeringOrg) {
      throw new NotFoundException(`Offering organization "${offeringOrgId}" not found.`);
    }

    const offer = this.collaborationRepo.create({
      solution_id: solution.id,
      offering_organization_id: offeringOrgId,
      offering_user_id: offeringUserId,
      collaboration_type: dto.collaboration_type,
      title: dto.title.trim(),
      description: dto.description.trim(),
      financial_contribution: dto.financial_contribution ?? null,
      resources_offered: dto.resources_offered?.trim() || null,
      estimated_timeline: dto.estimated_timeline?.trim() || null,
      status: SolutionCollaborationStatus.OFFERED,
    });

    const savedOffer = await this.collaborationRepo.save(offer);

    // Notify the proposing university of the new collaboration offer!
    try {
      await this.notifService?.notifyOrganization(
        solution.proposing_organization_id,
        NotificationType.COLLABORATION_UPDATE,
        `New Collaboration Offer Received: ${offeringOrg.name}`,
        `"${offeringOrg.name}" has offered ${dto.collaboration_type.replace(/_/g, ' ')} collaboration for your solution "${solution.title}".`,
        'SOLUTION',
        solution.id,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch collaboration offer notification: ${e}`);
    }

    return savedOffer;
  }

  async respondToCollaborationOffer(
    solutionId: string,
    offerId: string,
    userId: string,
    dto: RespondCollaborationOfferDto,
  ): Promise<SolutionCollaboration> {
    const solution = await this.solutionRepo.findOne({ where: { id: solutionId } });
    if (!solution) {
      throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
    }

    await this.assertSolutionAccess(solution, userId, true);

    const offer = await this.collaborationRepo.findOne({
      where: { id: offerId, solution_id: solutionId },
      relations: ['offeringOrganization'],
    });

    if (!offer) {
      throw new NotFoundException(`Collaboration offer "${offerId}" not found.`);
    }

    if (offer.status === SolutionCollaborationStatus.CONVERTED_TO_PROJECT) {
      throw new BadRequestException('Cannot modify an offer that has already been converted into an active project.');
    }

    offer.reviewed_by = userId;

    const rawAction = (dto.action || dto.status || '').toUpperCase();
    if (!rawAction) {
      throw new BadRequestException('Either action or status must be provided.');
    }

    let normalizedAction: 'ACCEPT' | 'DECLINE' | 'DISCUSS';
    if (rawAction === 'ACCEPT' || rawAction === 'ACCEPTED') {
      normalizedAction = 'ACCEPT';
    } else if (rawAction === 'DECLINE' || rawAction === 'DECLINED') {
      normalizedAction = 'DECLINE';
    } else if (
      rawAction === 'DISCUSS' ||
      rawAction === 'CLARIFY' ||
      rawAction === 'UNDER_DISCUSSION' ||
      rawAction === 'CLARIFICATION_REQUESTED'
    ) {
      normalizedAction = 'DISCUSS';
    } else {
      throw new BadRequestException(`Unrecognized action or status: "${rawAction}".`);
    }

    const notes = dto.discussion_notes || dto.response_notes;

    if (normalizedAction === 'ACCEPT') {
      offer.status = SolutionCollaborationStatus.ACCEPTED;
      offer.accepted_at = new Date();
      if (notes) offer.response_notes = notes.trim();

      // Notify offering organization
      try {
        await this.notifService?.notifyOrganization(
          offer.offering_organization_id,
          NotificationType.COLLABORATION_UPDATE,
          'Collaboration Offer Accepted!',
          `Your collaboration offer for "${solution.title}" has been accepted. You are now part of the solution consortium.`,
          'SOLUTION',
          solution.id,
        );
      } catch (e) {
        this.logger.warn(`Failed to dispatch offer accepted notification: ${e}`);
      }
    } else if (normalizedAction === 'DECLINE') {
      offer.status = SolutionCollaborationStatus.DECLINED;
      offer.declined_at = new Date();
      if (notes) offer.response_notes = notes.trim();

      // Notify offering organization
      try {
        await this.notifService?.notifyOrganization(
          offer.offering_organization_id,
          NotificationType.COLLABORATION_UPDATE,
          'Collaboration Offer Update',
          `Your collaboration offer for "${solution.title}" was not accepted at this time: ${notes || 'No notes provided.'}`,
          'SOLUTION',
          solution.id,
        );
      } catch (e) {
        this.logger.warn(`Failed to dispatch offer declined notification: ${e}`);
      }
    } else if (normalizedAction === 'DISCUSS') {
      offer.status = SolutionCollaborationStatus.UNDER_DISCUSSION;
      if (notes) offer.discussion_notes = notes.trim();
      if (dto.response_notes) offer.response_notes = dto.response_notes.trim();

      // Notify offering organization
      try {
        await this.notifService?.notifyOrganization(
          offer.offering_organization_id,
          NotificationType.COLLABORATION_UPDATE,
          'Discussion / Clarification Requested on Collaboration Offer',
          `Clarification requested on your offer for "${solution.title}": ${notes || 'Please connect for discussion.'}`,
          'SOLUTION',
          solution.id,
        );
      } catch (e) {
        this.logger.warn(`Failed to dispatch offer discussion notification: ${e}`);
      }
    }

    return this.collaborationRepo.save(offer);
  }

  // =========================================================================
  // 7. CONVERSION TO PROJECT
  // =========================================================================

  async convertToProject(
    solutionId: string,
    reviewerOrUserId: string,
    dto: ConvertSolutionToProjectDto,
  ): Promise<Project> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock solution row (without relations to avoid Postgres 'FOR UPDATE cannot be applied to nullable side of outer join')
      const lockedSolution = await queryRunner.manager.findOne(ProposedSolution, {
        where: { id: solutionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedSolution) {
        throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
      }

      // Load full solution details with relations
      const solution = await queryRunner.manager.findOne(ProposedSolution, {
        where: { id: solutionId },
        relations: [
          'challenge',
          'proposingOrganization',
          'proposingOrganization.institutionProfile',
          'teamMembers',
          'collaborations',
          'collaborations.offeringOrganization',
          'documents',
        ],
      });

      if (!solution) {
        throw new NotFoundException(`Proposed solution "${solutionId}" not found.`);
      }

      // Verify authorization: Proposing university admin or Government/Platform Reviewer
      await this.assertSolutionAccess(solution, reviewerOrUserId, true);

      if (solution.status === ProposedSolutionStatus.CONVERTED_TO_PROJECT && solution.project_id) {
        throw new BadRequestException(
          `This solution has already been converted to Project "${solution.project_id}".`,
        );
      }

      // 2. Lock challenge row
      const challenge = await queryRunner.manager.findOne(Challenge, {
        where: { id: solution.challenge_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!challenge) {
        throw new NotFoundException(`Associated challenge "${solution.challenge_id}" not found.`);
      }

      if (
        challenge.status === ChallengeStatus.CLOSED ||
        challenge.status === ChallengeStatus.ARCHIVED
      ) {
        throw new BadRequestException(
          `Cannot create project for challenge with status "${challenge.status}".`,
        );
      }

      // 3. Create Project
      const projectTitle = dto.title || solution.title;
      const projectDescription =
        dto.description ||
        solution.executive_summary ||
        solution.problem_understanding ||
        `Collaborative execution of: ${solution.title}`;

      const leadInstProfileId =
        solution.proposingOrganization?.institutionProfile?.id || null;

      const project = queryRunner.manager.create(Project, {
        challenge_id: solution.challenge_id,
        cluster_id: solution.cluster_id || challenge.cluster_id,
        proposed_solution_id: solution.id,
        title: projectTitle,
        description: projectDescription,
        objectives: solution.proposed_approach || null,
        expected_outcomes: solution.expected_outcomes || null,
        lead_institution_id: leadInstProfileId,
        status: ProjectStatus.PROPOSED,
        budget_allocated: dto.budget_allocated ?? solution.estimated_budget ?? null,
        start_date: dto.start_date ? new Date(dto.start_date) : new Date(),
        target_completion_date: dto.target_completion_date
          ? new Date(dto.target_completion_date)
          : null,
        metadata: {
          converted_from_solution_id: solution.id,
          converted_by: reviewerOrUserId,
          converted_at: new Date().toISOString(),
          initial_team_size: solution.teamMembers.length,
          accepted_collaborators_count: solution.collaborations.filter(
            (c) => c.status === SolutionCollaborationStatus.ACCEPTED,
          ).length,
        },
      });

      const savedProject = await queryRunner.manager.save(project);

      // 4. Add Proposing HEI as LEAD_INSTITUTION participant
      const leadParticipant = queryRunner.manager.create(ProjectParticipant, {
        project_id: savedProject.id,
        organization_id: solution.proposing_organization_id,
        participant_role: 'LEAD_INSTITUTION',
        status: 'ACTIVE',
        joined_at: new Date(),
      });
      await queryRunner.manager.save(leadParticipant);

      // 5. Carry over Solution Team Members into ProjectAcademicMembers
      for (const tm of solution.teamMembers) {
        if (tm.user_id) {
          const acadMember = queryRunner.manager.create(ProjectAcademicMember, {
            project_id: savedProject.id,
            user_id: tm.user_id,
            organization_id: tm.organization_id,
            role:
              tm.role === SolutionTeamRole.STUDENT_RESEARCHER
                ? AcademicMemberRole.STUDENT
                : tm.role === SolutionTeamRole.FACULTY_MENTOR
                ? AcademicMemberRole.FACULTY_MENTOR
                : AcademicMemberRole.ACADEMIC_COORDINATOR,
            department: tm.department || null,
            specialization:
              tm.specialization_skills && tm.specialization_skills.length > 0
                ? tm.specialization_skills.join(', ')
                : null,
            status: AcademicMemberStatus.ACTIVE,
          });
          await queryRunner.manager.save(acadMember);
        }
      }

      // 5b. Auto-initialize default milestones for project execution
      const defaultMilestones = [
        {
          title: 'Milestone 1: Prototype Architecture & Lab Verification',
          description: 'Consortium setup, hardware fabrication, and initial bench testing.',
          order_index: 1,
        },
        {
          title: 'Milestone 2: Pilot Deployment & Field Testing',
          description: 'Deploy pilot units in target district and collect real-time sensor metrics.',
          order_index: 2,
        },
        {
          title: 'Milestone 3: Impact Assessment & Government Handover',
          description: 'Independent evaluation, civic handover, and technology scale-up blueprint.',
          order_index: 3,
        },
      ];
      for (const dm of defaultMilestones) {
        const milestone = queryRunner.manager.create(ProjectMilestone, {
          project_id: savedProject.id,
          title: dm.title,
          description: dm.description,
          order_index: dm.order_index,
          status: MilestoneStatus.PENDING,
        });
        await queryRunner.manager.save(milestone);
      }

      // 6. Carry over Accepted Collaborators into Participants and ProjectContributions
      const acceptedCollabs = solution.collaborations.filter(
        (c) => c.status === SolutionCollaborationStatus.ACCEPTED,
      );

      for (const collab of acceptedCollabs) {
        // Add participant if not already lead
        let participant = leadParticipant;
        if (collab.offering_organization_id !== solution.proposing_organization_id) {
          const newParticipant = queryRunner.manager.create(ProjectParticipant, {
            project_id: savedProject.id,
            organization_id: collab.offering_organization_id,
            participant_role:
              collab.collaboration_type === SolutionCollaborationType.RESEARCH_COLLABORATION
                ? 'CONSORTIUM_PARTNER'
                : 'INDUSTRY_PARTNER',
            status: 'ACTIVE',
            joined_at: new Date(),
          });
          participant = await queryRunner.manager.save(newParticipant);
        }

        // Map collaboration type to ProjectContributionType
        let mappedContribType = ProjectContributionType.TECHNOLOGY;
        const cType = collab.collaboration_type;
        if (cType === SolutionCollaborationType.FUNDING || cType === SolutionCollaborationType.CSR_SUPPORT) {
          mappedContribType = ProjectContributionType.FUNDING;
        } else if (cType === SolutionCollaborationType.MENTORSHIP) {
          mappedContribType = ProjectContributionType.MENTORSHIP;
        } else if (cType === SolutionCollaborationType.PROTOTYPING) {
          mappedContribType = ProjectContributionType.PROTOTYPING;
        } else if (cType === SolutionCollaborationType.TESTING) {
          mappedContribType = ProjectContributionType.TESTING;
        } else if (cType === SolutionCollaborationType.TECHNOLOGY || cType === SolutionCollaborationType.SOFTWARE || cType === SolutionCollaborationType.HARDWARE) {
          mappedContribType = ProjectContributionType.TECHNOLOGY;
        } else if (cType === SolutionCollaborationType.PILOT_SUPPORT || cType === SolutionCollaborationType.DEPLOYMENT_SUPPORT || cType === SolutionCollaborationType.MANUFACTURING) {
          mappedContribType = ProjectContributionType.PILOT_SUPPORT;
        } else if (cType === SolutionCollaborationType.TECHNOLOGY_TRANSFER) {
          mappedContribType = ProjectContributionType.TECHNOLOGY_TRANSFER;
        }

        const projectContrib = queryRunner.manager.create(ProjectContribution, {
          project_id: savedProject.id,
          participant_id: participant.id,
          contribution_type: mappedContribType,
          title: collab.title,
          description: collab.description,
          value: collab.financial_contribution || null,
          status: ContributionStatus.VERIFIED,
          verification_notes: 'Automatically verified from accepted solution collaboration offer.',
          verified_at: new Date(),
          verified_by_id: reviewerOrUserId,
        });
        await queryRunner.manager.save(projectContrib);

        // Update collaboration status
        collab.status = SolutionCollaborationStatus.CONVERTED_TO_PROJECT;
        await queryRunner.manager.save(collab);
      }

      // 7. Transition ProposedSolution
      solution.status = ProposedSolutionStatus.CONVERTED_TO_PROJECT;
      solution.project_id = savedProject.id;
      solution.converted_at = new Date();
      await queryRunner.manager.save(solution);

      // 8. Transition Challenge
      challenge.status = ChallengeStatus.PROJECT_INITIATED;
      await queryRunner.manager.save(challenge);

      // 9. Commit transaction atomically
      await queryRunner.commitTransaction();

      // 10. Send Notifications
      try {
        // A. Citizen who reported the challenge
        if (challenge.submitted_by) {
          await this.notifService?.notifyUser(
            challenge.submitted_by,
            NotificationType.PROJECT_GOVERNANCE,
            `Project Initiated for Your Problem: ${projectTitle}`,
            `Great news! A multi-stakeholder project has been formally initiated to solve your challenge "${challenge.title}".`,
            'PROJECT',
            savedProject.id,
            challenge.district_id,
            challenge.district,
          );
        }

        // B. Proposing University
        await this.notifService?.notifyOrganization(
          solution.proposing_organization_id,
          NotificationType.PROJECT_GOVERNANCE,
          `Project Formed: ${projectTitle}`,
          `Your proposed solution has been successfully converted into an active Project. Access the Project Workspace to coordinate kickoff and deliverables.`,
          'PROJECT',
          savedProject.id,
        );

        // C. Accepted collaborators
        for (const collab of acceptedCollabs) {
          await this.notifService?.notifyOrganization(
            collab.offering_organization_id,
            NotificationType.PROJECT_GOVERNANCE,
            `Consortium Project Formed: ${projectTitle}`,
            `The solution you collaborated on has been initiated as a formal project. Your contribution has been registered.`,
            'PROJECT',
            savedProject.id,
          );
        }
      } catch (e) {
        this.logger.warn(`Failed to dispatch project formation notifications: ${e}`);
      }

      return savedProject;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
