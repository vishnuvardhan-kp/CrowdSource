import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Response } from 'express';
import { ExpressionOfInterest } from './entities/expression-of-interest.entity';
import { EoiContribution } from './entities/eoi-contribution.entity';
import { EoiEvidence } from './entities/eoi-evidence.entity';
import { EoiReview } from './entities/eoi-review.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { OrganizationEvidence } from '../organizations/entities/organization-evidence.entity';
import { InstitutionCapability } from '../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../industries/entities/industry-capability.entity';
import { Project } from '../projects/entities/project.entity';
import { User } from '../users/entities/user.entity';
import { RecommendationReview } from '../reviews/entities/recommendation-review.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  EoiStatus,
  EoiReviewAction,
  EoiEvidenceType,
  ChallengeStatus,
  ProjectStatus,
  OrganizationRole,
  MembershipStatus,
  VerificationStatus,
  UserRole,
  OrganizationType,
  NotificationType,
} from '../../common/enums';
import {
  CreateEoiDto,
  UpdateEoiDto,
  WithdrawEoiDto,
  RequestDiscussionDto,
  RejectEoiDto,
  FormCollaborativeProjectDto,
  CreateEoiEvidenceDto,
} from './dto';

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class EoisService {
  private readonly logger = new Logger(EoisService.name);
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ExpressionOfInterest)
    private readonly eoiRepo: Repository<ExpressionOfInterest>,
    @InjectRepository(EoiContribution)
    private readonly eoiContributionRepo: Repository<EoiContribution>,
    @InjectRepository(EoiEvidence)
    private readonly eoiEvidenceRepo: Repository<EoiEvidence>,
    @InjectRepository(EoiReview)
    private readonly eoiReviewRepo: Repository<EoiReview>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepo: Repository<ProjectParticipant>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(OrganizationEvidence)
    private readonly orgEvidenceRepo: Repository<OrganizationEvidence>,
    @InjectRepository(InstitutionCapability)
    private readonly instCapRepo: Repository<InstitutionCapability>,
    @InjectRepository(IndustryCapability)
    private readonly indCapRepo: Repository<IndustryCapability>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(RecommendationReview)
    private readonly recReviewRepo: Repository<RecommendationReview>,
    @Optional()
    private readonly notifService?: NotificationsService,
  ) {
    this.uploadDir = path.resolve(
      process.env.EOI_UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'eoi-evidence'),
    );
    this.maxFileSizeBytes = parseInt(
      process.env.MAX_EOI_FILE_SIZE_BYTES || '20971520', // 20 MB default
      10,
    );

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ==========================================
  // 1. ORGANIZATION ELIGIBILITY & DRAFT CREATION
  // ==========================================

  /**
   * Resolves the active authorized organization for a user.
   * Server determines the organization based on active ADMIN membership.
   */
  async resolveAuthorizedOrganization(userId: string): Promise<Organization> {
    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
      relations: ['organization', 'organization.institutionProfile', 'organization.industryProfile'],
    });

    if (!membership || !membership.organization) {
      throw new ForbiddenException(
        'You must be an active administrator of an organization to express interest.',
      );
    }

    return membership.organization;
  }

  /**
   * Asserts that an organization meets all baseline eligibility requirements:
   * 1. Claim status: CLAIMED or VERIFIED
   * 2. Capability Passport: has at least one registered capability
   */
  async assertOrganizationEligibility(org: Organization): Promise<void> {
    // 1. Claim or verification check
    const isEligible = org.is_claimed || org.verification_status === VerificationStatus.VERIFIED;
    if (!isEligible) {
      throw new BadRequestException(
        'Only claimed or verified organizations may submit an Expression of Interest.',
      );
    }

    // 2. Minimum 1 capability check
    let capabilityCount = 0;
    if (org.institutionProfile) {
      capabilityCount += await this.instCapRepo.count({
        where: { institution_id: org.institutionProfile.id },
      });
    }
    if (org.industryProfile) {
      capabilityCount += await this.indCapRepo.count({
        where: { industry_id: org.industryProfile.id },
      });
    }
    if (capabilityCount === 0) {
      const evidenceCount = await this.orgEvidenceRepo.count({
        where: { organization_id: org.id },
      });
      capabilityCount += evidenceCount;
    }

    if (capabilityCount === 0) {
      throw new BadRequestException(
        'Organization must have at least one registered capability in its Capability Passport to express interest.',
      );
    }
  }

  /**
   * Creates a new Expression of Interest in DRAFT status.
   */
  async createDraft(
    challengeId: string,
    userId: string,
    dto?: CreateEoiDto,
  ): Promise<ExpressionOfInterest> {
    // 1. Resolve authorized organization
    const org = await this.resolveAuthorizedOrganization(userId);

    // 2. Validate organization eligibility
    await this.assertOrganizationEligibility(org);

    // 3. Validate challenge eligibility
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });
    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status === ChallengeStatus.PROJECT_INITIATED) {
      throw new BadRequestException('Collaboration has already been formed for this challenge.');
    }

    const openChallengeStatuses = [
      ChallengeStatus.VALIDATED,
      ChallengeStatus.MATCHING,
      ChallengeStatus.MATCHED,
    ];
    if (!openChallengeStatuses.includes(challenge.status)) {
      throw new BadRequestException(
        `This challenge is in status "${challenge.status}" and is not currently open for Expressions of Interest.`,
      );
    }

    // 4. Check duplicate active EOI
    const activeStatuses = [
      EoiStatus.DRAFT,
      EoiStatus.SUBMITTED,
      EoiStatus.UNDER_REVIEW,
      EoiStatus.DISCUSSION_REQUIRED,
      EoiStatus.ACCEPTED,
    ];

    const existingConditions: any[] = [
      {
        organization_id: org.id,
        challenge_id: challengeId,
        status: In(activeStatuses),
      },
    ];
    if (challenge.cluster_id) {
      existingConditions.push({
        organization_id: org.id,
        cluster_id: challenge.cluster_id,
        status: In(activeStatuses),
      });
    }

    const existingActive = await this.eoiRepo.findOne({
      where: existingConditions,
    });

    if (existingActive) {
      if (existingActive.challenge_id === challengeId) {
        throw new ConflictException(
          `An active Expression of Interest already exists for your organization on this challenge (Status: ${existingActive.status}).`,
        );
      } else {
        throw new ConflictException(
          `Your organization already has an active Expression of Interest for this problem cluster (Status: ${existingActive.status}).`,
        );
      }
    }

    // 5. Snapshot user details
    const user = await this.userRepo.findOne({ where: { id: userId } });

    const eoi = this.eoiRepo.create({
      challenge_id: challengeId,
      organization_id: org.id,
      proposer_user_id: userId,
      status: EoiStatus.DRAFT,
      motivation: dto?.motivation || null,
      proposed_contribution: dto?.proposed_contribution || null,
      proposed_approach: dto?.proposed_approach || null,
      resource_summary: dto?.resource_summary || null,
      timeline: dto?.timeline || null,
      timeline_notes: dto?.timeline_notes || null,
      collaboration_lead_name: dto?.collaboration_lead_name || user?.name || null,
      collaboration_lead_designation:
        dto?.collaboration_lead_designation ||
        (org.organization_type === OrganizationType.INSTITUTION
          ? 'Dean / Lead Researcher'
          : 'Project Lead'),
      collaboration_lead_email: dto?.collaboration_lead_email || user?.email || null,
      collaboration_lead_phone: dto?.collaboration_lead_phone || user?.phone || null,
      cluster_id: challenge.cluster_id || null,
    });

    const savedEoi = await this.eoiRepo.save(eoi);

    // Save contributions if provided
    if (dto?.contributions && dto.contributions.length > 0) {
      const contribEntities = dto.contributions.map((c) =>
        this.eoiContributionRepo.create({
          eoi_id: savedEoi.id,
          contribution_type: c.contribution_type,
          description: c.description || null,
        }),
      );
      await this.eoiContributionRepo.save(contribEntities);
    }

    return this.getEoiById(savedEoi.id, userId);
  }

  // ==========================================
  // 2. ORGANIZATION EOI QUERIES & MODIFICATIONS
  // ==========================================

  /**
   * Retrieves all EOIs belonging to organizations the user represents.
   */
  async getMyEois(userId: string): Promise<ExpressionOfInterest[]> {
    const memberships = await this.memberRepo.find({
      where: {
        user_id: userId,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!memberships || memberships.length === 0) {
      return [];
    }

    const orgIds = memberships.map((m) => m.organization_id);

    return this.eoiRepo.find({
      where: { organization_id: In(orgIds) },
      relations: ['challenge', 'organization', 'contributions', 'project'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Retrieves single EOI detail with access authorization.
   */
  async getEoiById(
    id: string,
    userId: string,
    userRole?: string,
  ): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({
      where: { id },
      relations: [
        'challenge',
        'organization',
        'organization.institutionProfile',
        'organization.industryProfile',
        'proposerUser',
        'contributions',
        'evidence',
        'reviews',
        'reviews.reviewer',
        'project',
        'project.participants',
        'project.participants.organization',
      ],
    });

    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    const isReviewer =
      userRole === UserRole.PLATFORM_ADMIN ||
      userRole === UserRole.GOVERNMENT_OFFICER ||
      userRole === UserRole.GOVERNMENT_ADMIN;

    if (!isReviewer) {
      const membership = await this.memberRepo.findOne({
        where: {
          user_id: userId,
          organization_id: eoi.organization_id,
          membership_status: MembershipStatus.ACTIVE,
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not authorized to view this Expression of Interest.',
        );
      }
    }

    return eoi;
  }

  /**
   * Updates an EOI. Permitted strictly in DRAFT or DISCUSSION_REQUIRED.
   */
  async updateEoi(
    id: string,
    dto: UpdateEoiDto,
    userId: string,
    userRole?: string,
  ): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({
      where: { id },
      relations: ['contributions'],
    });

    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    // Ownership check
    const isPlatformAdmin = userRole === UserRole.PLATFORM_ADMIN;
    if (!isPlatformAdmin) {
      const membership = await this.memberRepo.findOne({
        where: {
          user_id: userId,
          organization_id: eoi.organization_id,
          organization_role: OrganizationRole.ADMIN,
          membership_status: MembershipStatus.ACTIVE,
        },
      });

      if (!membership) {
        throw new ForbiddenException(
          'You are not authorized to edit this Expression of Interest.',
        );
      }
    }

    // Status invariant check: only DRAFT or DISCUSSION_REQUIRED
    const editableStatuses = [EoiStatus.DRAFT, EoiStatus.DISCUSSION_REQUIRED];
    if (!editableStatuses.includes(eoi.status)) {
      throw new BadRequestException(
        `EOI in status "${eoi.status}" cannot be modified. Edits are only permitted in DRAFT or DISCUSSION_REQUIRED status.`,
      );
    }

    // Update editable proposal fields
    if (dto.motivation !== undefined) eoi.motivation = dto.motivation;
    if (dto.proposed_contribution !== undefined) eoi.proposed_contribution = dto.proposed_contribution;
    if (dto.proposed_approach !== undefined) eoi.proposed_approach = dto.proposed_approach;
    if (dto.resource_summary !== undefined) eoi.resource_summary = dto.resource_summary;
    if (dto.timeline !== undefined) eoi.timeline = dto.timeline;
    if (dto.timeline_notes !== undefined) eoi.timeline_notes = dto.timeline_notes;
    if (dto.collaboration_lead_name !== undefined) eoi.collaboration_lead_name = dto.collaboration_lead_name;
    if (dto.collaboration_lead_designation !== undefined) eoi.collaboration_lead_designation = dto.collaboration_lead_designation;
    if (dto.collaboration_lead_email !== undefined) eoi.collaboration_lead_email = dto.collaboration_lead_email;
    if (dto.collaboration_lead_phone !== undefined) eoi.collaboration_lead_phone = dto.collaboration_lead_phone;

    await this.eoiRepo.save(eoi);

    // Sync contributions if provided
    if (dto.contributions !== undefined) {
      await this.eoiContributionRepo.delete({ eoi_id: eoi.id });
      if (dto.contributions.length > 0) {
        const contribEntities = dto.contributions.map((c) =>
          this.eoiContributionRepo.create({
            eoi_id: eoi.id,
            contribution_type: c.contribution_type,
            description: c.description || null,
          }),
        );
        await this.eoiContributionRepo.save(contribEntities);
      }
    }

    return this.getEoiById(id, userId, userRole);
  }

  /**
   * Submits an EOI (DRAFT -> UNDER_REVIEW).
   * Validates mandatory proposal fields and records SUBMIT audit log.
   */
  async submitEoi(id: string, userId: string): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({
      where: { id },
      relations: ['contributions'],
    });

    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_id: eoi.organization_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not authorized to submit this Expression of Interest.',
      );
    }

    if (eoi.status !== EoiStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit an EOI with status "${eoi.status}". Only DRAFT EOIs can be submitted.`,
      );
    }

    // Validation of mandatory submission fields
    if (!eoi.motivation || eoi.motivation.trim().length < 5) {
      throw new BadRequestException('Motivation statement (at least 5 characters) is required to submit.');
    }
    if (!eoi.proposed_contribution || eoi.proposed_contribution.trim().length < 5) {
      throw new BadRequestException('Proposed contribution (at least 5 characters) is required to submit.');
    }
    if (!eoi.proposed_approach || eoi.proposed_approach.trim().length < 5) {
      throw new BadRequestException('Proposed approach (at least 5 characters) is required to submit.');
    }
    if (!eoi.timeline) {
      throw new BadRequestException('A structured timeline estimate is required to submit.');
    }
    if (!eoi.collaboration_lead_name || !eoi.collaboration_lead_email) {
      throw new BadRequestException('Collaboration lead name and email are required.');
    }
    if (!eoi.contributions || eoi.contributions.length === 0) {
      throw new BadRequestException('At least one contribution type must be selected.');
    }

    const ch = await this.challengeRepo.findOne({ where: { id: eoi.challenge_id } });
    if (!eoi.cluster_id && ch?.cluster_id) {
      eoi.cluster_id = ch.cluster_id;
    }

    const isDirectCandidate = !!eoi.cluster_id;
    const targetStatus = isDirectCandidate ? EoiStatus.ACCEPTED : EoiStatus.UNDER_REVIEW;
    const submissionDate = new Date();
    eoi.status = targetStatus;
    eoi.submitted_at = submissionDate;
    if (isDirectCandidate) {
      eoi.accepted_at = submissionDate;
    }
    await this.eoiRepo.save(eoi);

    // Create immutable audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: userId,
      action: isDirectCandidate ? EoiReviewAction.ACCEPT : EoiReviewAction.SUBMIT,
      previous_status: EoiStatus.DRAFT,
      new_status: targetStatus,
      notes: isDirectCandidate
        ? 'EOI submitted and automatically registered as active collaboration candidate on validated problem. Secondary government approval removed.'
        : 'EOI submitted by organization administrator.',
    });
    await this.eoiReviewRepo.save(audit);

    // EOI_SUBMIT_NOTIF
    try {
      if (ch?.district) {
        await this.notifService?.notifyDistrictOfficers(
          ch.district,
          NotificationType.EOI_UPDATE,
          `New EOI Submitted: ${ch.title}`,
          `An Expression of Interest was submitted for challenge "${ch.title}".`,
          'EOI',
          eoi.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch EOI submission notification: ${e}`);
    }

    return this.getEoiById(id, userId);
  }

  /**
   * Resubmits an EOI after discussion (DISCUSSION_REQUIRED -> UNDER_REVIEW).
   */
  async resubmitEoi(id: string, userId: string): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({ where: { id } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_id: eoi.organization_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not authorized to resubmit this Expression of Interest.',
      );
    }

    if (eoi.status !== EoiStatus.DISCUSSION_REQUIRED) {
      throw new BadRequestException(
        `Cannot resubmit an EOI with status "${eoi.status}". Only EOIs in DISCUSSION_REQUIRED status can be resubmitted.`,
      );
    }

    eoi.status = EoiStatus.UNDER_REVIEW;
    eoi.submitted_at = new Date();
    await this.eoiRepo.save(eoi);

    // Create audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: userId,
      action: EoiReviewAction.RESUBMIT,
      previous_status: EoiStatus.DISCUSSION_REQUIRED,
      new_status: EoiStatus.UNDER_REVIEW,
      notes: 'EOI resubmitted following clarification.',
    });
    await this.eoiReviewRepo.save(audit);

    return this.getEoiById(id, userId);
  }

  /**
   * Withdraws an EOI (Allowed from DRAFT, SUBMITTED, UNDER_REVIEW, DISCUSSION_REQUIRED).
   * Strictly prohibited once ACCEPTED, REJECTED, or PROJECT_FORMED.
   */
  async withdrawEoi(
    id: string,
    userId: string,
    dto?: WithdrawEoiDto,
  ): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({ where: { id } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_id: eoi.organization_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        'You are not authorized to withdraw this Expression of Interest.',
      );
    }

    const withdrawableStatuses = [
      EoiStatus.DRAFT,
      EoiStatus.SUBMITTED,
      EoiStatus.UNDER_REVIEW,
      EoiStatus.DISCUSSION_REQUIRED,
    ];

    if (!withdrawableStatuses.includes(eoi.status)) {
      throw new BadRequestException(
        `EOI cannot be withdrawn in its current status "${eoi.status}". Withdrawals are prohibited once an EOI is accepted, rejected, formed into a project, or already withdrawn.`,
      );
    }

    const prevStatus = eoi.status;
    eoi.status = EoiStatus.WITHDRAWN;
    eoi.withdrawn_at = new Date();
    await this.eoiRepo.save(eoi);

    // Create audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: userId,
      action: EoiReviewAction.WITHDRAW,
      previous_status: prevStatus,
      new_status: EoiStatus.WITHDRAWN,
      reason: dto?.reason || null,
      notes: 'EOI withdrawn by organization administrator.',
    });
    await this.eoiReviewRepo.save(audit);

    return this.getEoiById(id, userId);
  }

  // ==========================================
  // 3. EOI EVIDENCE MANAGEMENT
  // ==========================================

  /**
   * Uploads supporting evidence document to an EOI.
   * Isolated from Capability Passport and challenge evidence.
   */
  async uploadEvidence(
    eoiId: string,
    file: ExpressUploadedFile,
    userId: string,
    dto?: CreateEoiEvidenceDto,
  ): Promise<EoiEvidence> {
    const eoi = await this.eoiRepo.findOne({ where: { id: eoiId } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${eoiId}" not found.`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_id: eoi.organization_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not authorized to upload evidence to this EOI.');
    }

    if (eoi.status !== EoiStatus.DRAFT && eoi.status !== EoiStatus.DISCUSSION_REQUIRED) {
      throw new BadRequestException('Evidence can only be uploaded while in DRAFT or DISCUSSION_REQUIRED status.');
    }

    if (!file) {
      throw new BadRequestException('No file provided for upload.');
    }

    if (file.size > this.maxFileSizeBytes) {
      const maxMb = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      throw new BadRequestException(`File size exceeds maximum allowed limit of ${maxMb} MB.`);
    }

    const sanitizedExt = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    const safeFilename = `${randomUUID()}${sanitizedExt}`;
    const targetPath = path.join(this.uploadDir, safeFilename);

    // Path traversal check
    const relative = path.relative(this.uploadDir, targetPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid storage path detected.');
    }

    await fs.promises.writeFile(targetPath, file.buffer);

    const evidenceRecord = this.eoiEvidenceRepo.create({
      eoi_id: eoiId,
      uploaded_by: userId,
      evidence_type: dto?.evidence_type || EoiEvidenceType.OTHER,
      title: dto?.title || file.originalname.slice(0, 250),
      description: dto?.description || null,
      storage_key: safeFilename,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      metadata: {
        safeFilename,
        storedPath: targetPath,
        uploadedAt: new Date().toISOString(),
      },
    });

    return this.eoiEvidenceRepo.save(evidenceRecord);
  }

  /**
   * Retrieves evidence records for an EOI.
   */
  async getEvidence(
    eoiId: string,
    userId: string,
    userRole?: string,
  ): Promise<EoiEvidence[]> {
    await this.getEoiById(eoiId, userId, userRole);
    return this.eoiEvidenceRepo.find({
      where: { eoi_id: eoiId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Deletes an evidence document from an EOI.
   */
  async deleteEvidence(
    eoiId: string,
    evidenceId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const eoi = await this.eoiRepo.findOne({ where: { id: eoiId } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${eoiId}" not found.`);
    }

    const membership = await this.memberRepo.findOne({
      where: {
        user_id: userId,
        organization_id: eoi.organization_id,
        organization_role: OrganizationRole.ADMIN,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not authorized to delete evidence from this EOI.');
    }

    if (eoi.status !== EoiStatus.DRAFT && eoi.status !== EoiStatus.DISCUSSION_REQUIRED) {
      throw new BadRequestException('Evidence can only be removed while in DRAFT or DISCUSSION_REQUIRED status.');
    }

    const evidence = await this.eoiEvidenceRepo.findOne({
      where: { id: evidenceId, eoi_id: eoiId },
    });
    if (!evidence) {
      throw new NotFoundException(`Evidence with ID "${evidenceId}" not found.`);
    }

    // Remove physical file
    try {
      const filePath = path.join(this.uploadDir, evidence.storage_key);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err: any) {
      this.logger.warn(`Failed to delete physical file: ${err.message}`);
    }

    await this.eoiEvidenceRepo.delete(evidenceId);
    return { success: true, message: 'Evidence successfully removed.' };
  }

  /**
   * Serves file for download/preview securely.
   */
  serveEvidenceFile(filename: string, res: Response) {
    const safeBase = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeBase);

    const relative = path.relative(this.uploadDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested evidence file was not found.');
    }

    res.sendFile(filePath);
  }

  // ==========================================
  // 4. REVIEWER ACTIONS & WORKFLOW
  // ==========================================

  /**
   * Returns queue of EOIs for government/admin reviewers.
   * By default, returns UNDER_REVIEW and DISCUSSION_REQUIRED.
   */
  async getReviewerEois(
    statusFilter?: EoiStatus,
    challengeId?: string,
  ): Promise<ExpressionOfInterest[]> {
    const qb = this.eoiRepo
      .createQueryBuilder('eoi')
      .leftJoinAndSelect('eoi.challenge', 'challenge')
      .leftJoinAndSelect('eoi.organization', 'organization')
      .leftJoinAndSelect('eoi.contributions', 'contributions')
      .leftJoinAndSelect('eoi.proposerUser', 'proposerUser')
      .leftJoinAndSelect('eoi.project', 'project');

    if (statusFilter) {
      qb.andWhere('eoi.status = :status', { status: statusFilter });
    } else {
      // Exclude DRAFT and WITHDRAWN from default reviewer queue
      qb.andWhere('eoi.status IN (:...statuses)', {
        statuses: [
          EoiStatus.UNDER_REVIEW,
          EoiStatus.DISCUSSION_REQUIRED,
          EoiStatus.ACCEPTED,
          EoiStatus.REJECTED,
        ],
      });
    }

    if (challengeId) {
      qb.andWhere('eoi.challenge_id = :challengeId', { challengeId });
    }

    qb.orderBy('eoi.submitted_at', 'ASC', 'NULLS LAST').addOrderBy('eoi.created_at', 'ASC');

    return qb.getMany();
  }

  /**
   * Returns comprehensive review detail payload for reviewers.
   */
  async getReviewerEoiDetail(id: string): Promise<any> {
    const eoi = await this.eoiRepo.findOne({
      where: { id },
      relations: [
        'challenge',
        'challenge.aiAnalysis',
        'organization',
        'organization.institutionProfile',
        'organization.industryProfile',
        'contributions',
        'evidence',
        'reviews',
        'reviews.reviewer',
        'project',
        'project.participants',
        'project.participants.organization',
      ],
    });

    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    // Load capabilities for organization
    let capabilities: any[] = [];
    if (eoi.organization.institutionProfile) {
      const instCaps = await this.instCapRepo.find({
        where: { institution_id: eoi.organization.institutionProfile.id },
        relations: ['capability', 'department', 'laboratory'],
      });
      capabilities = instCaps.map((c) => ({
        id: c.id,
        name: c.capability?.name,
        category: c.capability?.category,
        confidence_score: c.confidence_score,
        department: c.department?.name,
      }));
    } else if (eoi.organization.industryProfile) {
      const indCaps = await this.indCapRepo.find({
        where: { industry_id: eoi.organization.industryProfile.id },
        relations: ['capability', 'supportType'],
      });
      capabilities = indCaps.map((c) => ({
        id: c.id,
        name: c.capability?.name,
        category: c.capability?.category,
        support_type: c.supportType?.name,
      }));
    }

    // AI match information
    const recReview = await this.recReviewRepo.findOne({
      where: {
        challenge_id: eoi.challenge_id,
        recommended_organization_id: eoi.organization_id,
      },
    });

    return {
      id: eoi.id,
      status: eoi.status,
      challenge: {
        id: eoi.challenge.id,
        title: eoi.challenge.title,
        description: eoi.challenge.description,
        district: eoi.challenge.district,
        state: eoi.challenge.state,
        status: eoi.challenge.status,
        category: eoi.challenge.category,
        priority: eoi.challenge.priority,
        required_capabilities: eoi.challenge.aiAnalysis?.required_capabilities || [],
      },
      organization: {
        id: eoi.organization.id,
        name: eoi.organization.name,
        organization_type: eoi.organization.organization_type,
        district: eoi.organization.district,
        state: eoi.organization.state,
        geographic_reach: eoi.organization.geographic_reach,
        verification_status: eoi.organization.verification_status,
        is_claimed: eoi.organization.is_claimed,
      },
      capability_summary: {
        count: capabilities.length,
        items: capabilities,
      },
      ai_match_info: recReview
        ? {
            score: recReview.ai_recommendation_score,
            reasons: recReview.ai_match_reasons,
            human_status: recReview.human_review_status,
          }
        : null,
      proposal: {
        motivation: eoi.motivation,
        proposed_contribution: eoi.proposed_contribution,
        proposed_approach: eoi.proposed_approach,
        resource_summary: eoi.resource_summary,
        timeline: eoi.timeline,
        timeline_notes: eoi.timeline_notes,
      },
      collaboration_lead: {
        name: eoi.collaboration_lead_name,
        designation: eoi.collaboration_lead_designation,
        email: eoi.collaboration_lead_email,
        phone: eoi.collaboration_lead_phone,
      },
      contributions: eoi.contributions,
      evidence: eoi.evidence,
      reviews: eoi.reviews,
      project: eoi.project
        ? {
            id: eoi.project.id,
            title: eoi.project.title,
            status: eoi.project.status,
            participants: (eoi.project.participants || []).map((p) => ({
              id: p.id,
              organization_name: p.organization?.name,
              participant_role: p.participant_role,
              joined_at: p.joined_at,
            })),
          }
        : null,
      submitted_at: eoi.submitted_at,
      reviewed_at: eoi.reviewed_at,
      accepted_at: eoi.accepted_at,
      rejected_at: eoi.rejected_at,
      created_at: eoi.created_at,
    };
  }

  /**
   * Reviewer requests discussion/clarification (UNDER_REVIEW -> DISCUSSION_REQUIRED).
   */
  async requestDiscussion(
    id: string,
    reviewerId: string,
    dto: RequestDiscussionDto,
  ): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({ where: { id } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    if (eoi.status !== EoiStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Discussion can only be requested for EOIs currently in UNDER_REVIEW status (Current: ${eoi.status}).`,
      );
    }

    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException('A message explaining the clarification required is mandatory.');
    }

    eoi.status = EoiStatus.DISCUSSION_REQUIRED;
    eoi.reviewed_at = new Date();
    await this.eoiRepo.save(eoi);

    // Create audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: reviewerId,
      action: EoiReviewAction.REQUEST_DISCUSSION,
      previous_status: EoiStatus.UNDER_REVIEW,
      new_status: EoiStatus.DISCUSSION_REQUIRED,
      reason: dto.message.trim(),
      notes: 'Reviewer requested discussion / additional details.',
    });
    await this.eoiReviewRepo.save(audit);

    // EOI_DISCUSSION_NOTIF
    try {
      if (eoi.proposer_user_id) {
        await this.notifService?.notifyUser(
          eoi.proposer_user_id,
          NotificationType.EOI_UPDATE,
          'EOI Discussion Requested',
          `Clarification requested on your Expression of Interest: ${dto.message.trim()}`,
          'EOI',
          eoi.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch EOI discussion notification: ${e}`);
    }

    return this.getEoiById(id, reviewerId, UserRole.PLATFORM_ADMIN);
  }

  /**
   * Accepts an EOI (UNDER_REVIEW -> ACCEPTED).
   * CRITICAL INVARIANT: NEVER CREATES A PROJECT.
   */
  async acceptEoi(id: string, reviewerId: string): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({ where: { id } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    if (eoi.status !== EoiStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Only EOIs currently in UNDER_REVIEW status can be accepted (Current: ${eoi.status}).`,
      );
    }

    // Explicit invariant check: no project creation here
    eoi.status = EoiStatus.ACCEPTED;
    eoi.accepted_at = new Date();
    eoi.reviewed_at = new Date();
    await this.eoiRepo.save(eoi);

    // Create audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: reviewerId,
      action: EoiReviewAction.ACCEPT,
      previous_status: EoiStatus.UNDER_REVIEW,
      new_status: EoiStatus.ACCEPTED,
      notes: 'EOI accepted by reviewer. Awaiting consortium bundling.',
    });
    await this.eoiReviewRepo.save(audit);

    // EOI_ACCEPT_NOTIF
    try {
      if (eoi.proposer_user_id) {
        await this.notifService?.notifyUser(
          eoi.proposer_user_id,
          NotificationType.EOI_UPDATE,
          'EOI Accepted',
          'Your Expression of Interest has been accepted by government review.',
          'EOI',
          eoi.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch EOI acceptance notification: ${e}`);
    }

    return this.getEoiById(id, reviewerId, UserRole.PLATFORM_ADMIN);
  }

  /**
   * Rejects an EOI (UNDER_REVIEW -> REJECTED).
   * Rejection reason is mandatory.
   */
  async rejectEoi(
    id: string,
    reviewerId: string,
    dto: RejectEoiDto,
  ): Promise<ExpressionOfInterest> {
    const eoi = await this.eoiRepo.findOne({ where: { id } });
    if (!eoi) {
      throw new NotFoundException(`Expression of Interest with ID "${id}" not found.`);
    }

    if (eoi.status !== EoiStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        `Only EOIs currently in UNDER_REVIEW status can be rejected (Current: ${eoi.status}).`,
      );
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('A reason explaining rejection is mandatory.');
    }

    eoi.status = EoiStatus.REJECTED;
    eoi.rejected_at = new Date();
    eoi.reviewed_at = new Date();
    await this.eoiRepo.save(eoi);

    // Create audit record
    const audit = this.eoiReviewRepo.create({
      eoi_id: eoi.id,
      reviewer_id: reviewerId,
      action: EoiReviewAction.REJECT,
      previous_status: EoiStatus.UNDER_REVIEW,
      new_status: EoiStatus.REJECTED,
      reason: dto.reason.trim(),
      notes: 'EOI rejected by reviewer.',
    });
    await this.eoiReviewRepo.save(audit);

    // EOI_REJECT_NOTIF
    try {
      if (eoi.proposer_user_id) {
        await this.notifService?.notifyUser(
          eoi.proposer_user_id,
          NotificationType.EOI_UPDATE,
          'EOI Status Update',
          `Your Expression of Interest was not accepted. Reason: ${dto.reason}`,
          'EOI',
          eoi.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch EOI rejection notification: ${e}`);
    }

    return this.getEoiById(id, reviewerId, UserRole.PLATFORM_ADMIN);
  }

  // ==========================================
  // 5. PROJECT FORMATION & CONCURRENCY CONTROL
  // ==========================================

  /**
   * Retrieves all accepted EOIs for a given challenge ready for project formation.
   * Excludes PROJECT_FORMED EOIs.
   */
  async getAcceptedEoisForChallenge(challengeId: string): Promise<ExpressionOfInterest[]> {
    return this.eoiRepo.find({
      where: {
        challenge_id: challengeId,
        status: EoiStatus.ACCEPTED,
      },
      relations: ['organization', 'contributions'],
      order: { accepted_at: 'ASC' },
    });
  }

  /**
   * Forms ONE collaborative project from multiple accepted EOIs.
   *
   * Invariants enforced:
   * - Atomic PostgreSQL transaction
   * - Row-level pessimistic locking (`pessimistic_write`) on challenge and all selected EOIs
   * - Challenge must not already be PROJECT_INITIATED, CLOSED, or ARCHIVED
   * - Every selected EOI must belong to this challenge, be in ACCEPTED status, and have project_id == null
   * - Creates ONE Project
   * - Creates ProjectParticipants linking each organization to source EOI
   * - Transitions all selected EOIs to PROJECT_FORMED
   * - Transitions Challenge to PROJECT_INITIATED
   * - Double-dipping is permanently prevented
   * - Conflicting concurrent transactions fail cleanly and rollback
   */
  async formCollaborativeProject(
    challengeId: string,
    reviewerId: string,
    dto: FormCollaborativeProjectDto,
  ): Promise<Project> {
    if (!dto.eoi_ids || dto.eoi_ids.length === 0) {
      throw new BadRequestException('At least one accepted EOI must be selected to form a project.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock challenge row and verify status
      const challenge = await queryRunner.manager.findOne(Challenge, {
        where: { id: challengeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!challenge) {
        throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
      }

      if (challenge.status === ChallengeStatus.PROJECT_INITIATED) {
        throw new BadRequestException(
          'A collaborative project has already been formed for this challenge. Intake is closed.',
        );
      }

      if (
        challenge.status === ChallengeStatus.CLOSED ||
        challenge.status === ChallengeStatus.ARCHIVED ||
        challenge.status === ChallengeStatus.COMPLETED
      ) {
        throw new BadRequestException(
          `Cannot form a project on a challenge with status "${challenge.status}".`,
        );
      }

      // 2. Lock selected EOIs with pessimistic write (without relations to avoid outer join lock restrictions)
      const eois = await queryRunner.manager.find(ExpressionOfInterest, {
        where: { id: In(dto.eoi_ids) },
        lock: { mode: 'pessimistic_write' },
      });

      if (eois.length !== dto.eoi_ids.length) {
        throw new BadRequestException(
          `One or more selected EOIs were not found (Expected ${dto.eoi_ids.length}, found ${eois.length}).`,
        );
      }

      // Load organization profiles for role determination
      const orgIds = eois.map((e) => e.organization_id);
      const orgs = await queryRunner.manager.find(Organization, {
        where: { id: In(orgIds) },
        relations: ['institutionProfile', 'industryProfile'],
      });
      const orgMap = new Map(orgs.map((o) => [o.id, o]));
      for (const eoi of eois) {
        eoi.organization = orgMap.get(eoi.organization_id)!;
      }

      // 3. Validate every selected EOI
      for (const eoi of eois) {
        if (eoi.challenge_id !== challengeId) {
          throw new BadRequestException(
            `EOI "${eoi.id}" belongs to challenge "${eoi.challenge_id}", not "${challengeId}".`,
          );
        }

        if (eoi.status !== EoiStatus.ACCEPTED) {
          throw new BadRequestException(
            `EOI "${eoi.id}" is not in ACCEPTED status (Current status: ${eoi.status}). Only ACCEPTED EOIs can form a project.`,
          );
        }

        if (eoi.project_id) {
          throw new BadRequestException(
            `EOI "${eoi.id}" is already associated with project "${eoi.project_id}". Double-dipping is prohibited.`,
          );
        }
      }

      // 4. Identify lead institution and partner industry profiles if present
      const institutionEoi = eois.find(
        (e) => e.organization.organization_type === OrganizationType.INSTITUTION && e.organization.institutionProfile,
      );
      const industryEoi = eois.find(
        (e) => e.organization.organization_type === OrganizationType.INDUSTRY && e.organization.industryProfile,
      );

      // 5. Create ONE Project entity
      const projectTitle =
        dto.title || `Collaborative Project: ${challenge.title.slice(0, 200)}`;
      const projectDesc =
        dto.description ||
        `Consortium formed with ${eois.length} organization(s) addressing: ${challenge.description.slice(0, 500)}`;

      const project = queryRunner.manager.create(Project, {
        challenge_id: challengeId,
        title: projectTitle,
        description: projectDesc,
        lead_institution_id: institutionEoi?.organization?.institutionProfile?.id || null,
        partner_industry_id: industryEoi?.organization?.industryProfile?.id || null,
        status: ProjectStatus.PROPOSED,
        metadata: {
          formed_by: reviewerId,
          consortium_members_count: eois.length,
          formed_at: new Date().toISOString(),
          eoi_ids: dto.eoi_ids,
        },
      });

      const savedProject = await queryRunner.manager.save(project);

      // 6. Create ProjectParticipant for each EOI & transition EOI -> PROJECT_FORMED
      const formationDate = new Date();

      for (const eoi of eois) {
        const participantRole =
          eoi.organization.organization_type === OrganizationType.INSTITUTION
            ? 'LEAD_INSTITUTION'
            : eoi.organization.organization_type === OrganizationType.INDUSTRY
            ? 'INDUSTRY_PARTNER'
            : 'CONSORTIUM_PARTNER';

        const participant = queryRunner.manager.create(ProjectParticipant, {
          project_id: savedProject.id,
          organization_id: eoi.organization_id,
          source_eoi_id: eoi.id,
          participant_role: participantRole,
          status: 'ACTIVE',
          joined_at: formationDate,
        });
        await queryRunner.manager.save(participant);

        // Transition EOI to PROJECT_FORMED
        eoi.status = EoiStatus.PROJECT_FORMED;
        eoi.project_id = savedProject.id;
        eoi.project_formed_at = formationDate;
        await queryRunner.manager.save(eoi);

        // Record audit entry
        const audit = queryRunner.manager.create(EoiReview, {
          eoi_id: eoi.id,
          reviewer_id: reviewerId,
          action: EoiReviewAction.ACCEPT,
          previous_status: EoiStatus.ACCEPTED,
          new_status: EoiStatus.PROJECT_FORMED,
          notes: `Participated in project formation for Project "${savedProject.id}".`,
        });
        await queryRunner.manager.save(audit);
      }

      // 7. Transition Challenge to PROJECT_INITIATED
      challenge.status = ChallengeStatus.PROJECT_INITIATED;
      await queryRunner.manager.save(challenge);

      // 8. Commit everything atomically
      await queryRunner.commitTransaction();

      // Return fully populated project
      return this.projectRepo.findOne({
        where: { id: savedProject.id },
        relations: [
          'challenge',
          'participants',
          'participants.organization',
          'leadInstitution',
          'partnerIndustry',
        ],
      }) as Promise<Project>;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
