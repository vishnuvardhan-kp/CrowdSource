import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { createHash, randomUUID } from 'crypto';
import { Response } from 'express';
import { ImpactAssessment } from './entities/impact-assessment.entity';
import { ImpactMetric } from './entities/impact-metric.entity';
import { ImpactEvidence } from './entities/impact-evidence.entity';
import { ImpactFeedback } from './entities/impact-feedback.entity';
import { ImpactReview } from './entities/impact-review.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../users/entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ImpactAssessmentStatus,
  ImpactReviewDecision,
  ProjectStatus,
  UserRole,
  MembershipStatus,
  NotificationType,
} from '../../common/enums';
import {
  CreateImpactAssessmentDto,
  UpdateImpactAssessmentDto,
  CreateImpactMetricDto,
  UpdateImpactMetricDto,
  CreateImpactEvidenceDto,
  CreateImpactFeedbackDto,
  ImpactReviewActionDto,
  RequireRevisionDto,
  RejectImpactDto,
  RevokeImpactDto,
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
export class ImpactService {
  private readonly logger = new Logger(ImpactService.name);
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes = 50 * 1024 * 1024; // 50MB

  constructor(
    @InjectRepository(ImpactAssessment)
    private readonly assessmentRepo: Repository<ImpactAssessment>,
    @InjectRepository(ImpactMetric)
    private readonly metricRepo: Repository<ImpactMetric>,
    @InjectRepository(ImpactEvidence)
    private readonly evidenceRepo: Repository<ImpactEvidence>,
    @InjectRepository(ImpactFeedback)
    private readonly feedbackRepo: Repository<ImpactFeedback>,
    @InjectRepository(ImpactReview)
    private readonly reviewRepo: Repository<ImpactReview>,
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepo: Repository<ProjectParticipant>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notifService?: NotificationsService,
  ) {
    this.uploadDir = path.resolve(
      process.cwd(),
      process.env.IMPACT_EVIDENCE_UPLOAD_DIR || 'uploads/impact-evidence',
    );
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // =========================================================================
  // 1. ACCESS CONTROL & ROLE HELPERS
  // =========================================================================

  isGovernmentOrAdmin(userRole?: string): boolean {
    return (
      userRole === UserRole.PLATFORM_ADMIN ||
      userRole === UserRole.GOVERNMENT_OFFICER ||
      userRole === UserRole.GOVERNMENT_ADMIN
    );
  }

  isPlatformAdmin(userRole?: string): boolean {
    return userRole === UserRole.PLATFORM_ADMIN;
  }

  isLeadRole(role?: string): boolean {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === 'LEAD' || r === 'LEAD_INSTITUTION';
  }

  async getParticipantForUser(
    projectId: string,
    userId: string,
  ): Promise<ProjectParticipant | null> {
    const memberships = await this.memberRepo.find({
      where: {
        user_id: userId,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    if (!memberships || memberships.length === 0) {
      return null;
    }

    const orgIds = memberships.map((m) => m.organization_id);

    return this.participantRepo.findOne({
      where: {
        project_id: projectId,
        organization_id: In(orgIds),
        status: 'ACTIVE',
      },
      relations: ['organization'],
    });
  }

  async ensureProject(projectId: string): Promise<Project> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: [
        'challenge',
        'participants',
        'participants.organization',
        'leadInstitution',
        'partnerIndustry',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    return project;
  }

  // =========================================================================
  // 2. CONSORTIUM: GET & WORKSPACE DATA
  // =========================================================================

  async getImpactForProject(
    projectId: string,
    userId?: string,
    userRole?: string,
  ): Promise<{
    project: Project;
    assessment: ImpactAssessment | null;
    metrics: ImpactMetric[];
    evidence: ImpactEvidence[];
    feedback: ImpactFeedback[];
    reviews: ImpactReview[];
    canEdit: boolean;
    canSubmit: boolean;
    isLead: boolean;
    isEligibleForFeedback: boolean;
    hasSubmittedFeedback: boolean;
  }> {
    const project = await this.ensureProject(projectId);

    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
      relations: [
        'metrics',
        'evidence',
        'evidence.uploadedBy',
        'feedback',
        'feedback.submittedBy',
        'reviews',
        'reviews.reviewer',
      ],
    });

    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    let participant: ProjectParticipant | null = null;
    let isLead = false;

    if (userId) {
      participant = await this.getParticipantForUser(projectId, userId);
      if (participant && this.isLeadRole(participant.participant_role)) {
        isLead = true;
      }
    }

    // Editable status
    const isEditableStatus =
      assessment &&
      (assessment.status === ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING ||
        assessment.status === ImpactAssessmentStatus.REVISION_REQUIRED);

    const canEdit = !!((isLead || isGovOrAdmin) && isEditableStatus);
    const canSubmit = !!(
      isLead &&
      isEditableStatus &&
      project.status === ProjectStatus.COMPLETED &&
      assessment?.metrics?.length > 0 &&
      assessment?.evidence?.length > 0
    );

    // Feedback eligibility
    let isEligibleForFeedback = false;
    let hasSubmittedFeedback = false;

    if (userId && project.challenge) {
      const isOriginalSubmitter = project.challenge.submitted_by === userId;
      const isParticipant = !!participant;

      // Original challenge submitter who is NOT a consortium participant
      isEligibleForFeedback = isOriginalSubmitter && !isParticipant;

      if (assessment && assessment.feedback) {
        hasSubmittedFeedback = assessment.feedback.some(
          (f) => f.submitted_by_id === userId,
        );
      }
    }

    return {
      project,
      assessment,
      metrics: assessment?.metrics || [],
      evidence: assessment?.evidence || [],
      feedback: assessment?.feedback || [],
      reviews: assessment?.reviews || [],
      canEdit,
      canSubmit,
      isLead,
      isEligibleForFeedback,
      hasSubmittedFeedback,
    };
  }

  // =========================================================================
  // 3. CONSORTIUM: CREATE & EDIT IMPACT ASSESSMENT
  // =========================================================================

  async createImpactAssessment(
    projectId: string,
    userId: string,
    userRole: string | undefined,
    dto: CreateImpactAssessmentDto,
  ): Promise<ImpactAssessment> {
    const project = await this.ensureProject(projectId);

    // Invariant 10: A project cannot enter impact verification before Phase 7 marks it COMPLETED.
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot initiate impact assessment: Project status is "${project.status}". Only COMPLETED projects can begin impact verification.`,
      );
    }

    // Check authorization: Consortium lead or Gov/Admin
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && (!participant || !this.isLeadRole(participant.participant_role))) {
      throw new ForbiddenException(
        'Only the Consortium Lead or an authorized administrator can create the Impact Assessment.',
      );
    }

    // Unique per project
    const existing = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });
    if (existing) {
      throw new BadRequestException(
        'An impact assessment already exists for this project. Update the existing assessment instead.',
      );
    }

    const assessment = this.assessmentRepo.create({
      project_id: projectId,
      submitted_by_id: userId,
      status: ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING,
      summary: dto.summary,
      problem_addressed: dto.problem_addressed,
      solution_implemented: dto.solution_implemented,
      beneficiaries_reached: dto.beneficiaries_reached,
      geographic_coverage: dto.geographic_coverage,
      implementation_cost: dto.implementation_cost,
      sustainability_notes: dto.sustainability_notes,
    });

    return this.assessmentRepo.save(assessment);
  }

  async updateImpactAssessment(
    projectId: string,
    userId: string,
    userRole: string | undefined,
    dto: UpdateImpactAssessmentDto,
  ): Promise<ImpactAssessment> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
      relations: ['project'],
    });

    if (!assessment) {
      throw new NotFoundException(
        `No impact assessment found for project "${projectId}".`,
      );
    }

    // Invariant 7: Verified assessment is immutable
    if (assessment.status === ImpactAssessmentStatus.VERIFIED) {
      throw new BadRequestException(
        'This impact assessment has been VERIFIED and is immutable. Only Platform Administrator revocation can reopen it.',
      );
    }

    if (assessment.status === ImpactAssessmentStatus.REJECTED) {
      throw new BadRequestException(
        'This impact assessment has been REJECTED by the government and cannot be modified.',
      );
    }

    if (assessment.status === ImpactAssessmentStatus.UNDER_REVIEW) {
      throw new BadRequestException(
        'This impact assessment is currently UNDER_REVIEW by the government and cannot be modified.',
      );
    }

    // Authorization
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && (!participant || !this.isLeadRole(participant.participant_role))) {
      throw new ForbiddenException(
        'Only the Consortium Lead or an authorized administrator can update the Impact Assessment.',
      );
    }

    if (dto.summary !== undefined) assessment.summary = dto.summary;
    if (dto.problem_addressed !== undefined)
      assessment.problem_addressed = dto.problem_addressed;
    if (dto.solution_implemented !== undefined)
      assessment.solution_implemented = dto.solution_implemented;
    if (dto.beneficiaries_reached !== undefined)
      assessment.beneficiaries_reached = dto.beneficiaries_reached;
    if (dto.geographic_coverage !== undefined)
      assessment.geographic_coverage = dto.geographic_coverage;
    if (dto.implementation_cost !== undefined)
      assessment.implementation_cost = dto.implementation_cost;
    if (dto.sustainability_notes !== undefined)
      assessment.sustainability_notes = dto.sustainability_notes;

    return this.assessmentRepo.save(assessment);
  }

  // =========================================================================
  // 4. CONSORTIUM: SUBMIT IMPACT ASSESSMENT
  // =========================================================================

  async submitImpactAssessment(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<ImpactAssessment> {
    const project = await this.ensureProject(projectId);

    // Invariant 10: Must be COMPLETED
    if (project.status !== ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot submit impact assessment: Project is in status "${project.status}". Only COMPLETED projects can be submitted for verification.`,
      );
    }

    // Authorization: Consortium lead
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && (!participant || !this.isLeadRole(participant.participant_role))) {
      throw new ForbiddenException(
        'Only the Consortium Lead can submit the impact assessment for government verification.',
      );
    }

    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
      relations: ['metrics', 'evidence'],
    });

    if (!assessment) {
      throw new NotFoundException(
        'No impact assessment exists for this project. Create an assessment before submitting.',
      );
    }

    // Section 13: Submission Guards
    if (
      assessment.status !== ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING &&
      assessment.status !== ImpactAssessmentStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot submit assessment: Current status is "${assessment.status}". Only PENDING or REVISION_REQUIRED assessments can be submitted.`,
      );
    }

    // Guard 6: At least one structured impact metric
    if (!assessment.metrics || assessment.metrics.length === 0) {
      throw new BadRequestException(
        'Cannot submit impact assessment without at least one structured impact metric.',
      );
    }

    // Guard 7: At least one impact evidence item
    if (!assessment.evidence || assessment.evidence.length === 0) {
      throw new BadRequestException(
        'Cannot submit impact assessment without at least one verified impact evidence document.',
      );
    }

    // Guard 8: Required fields populated
    if (
      !assessment.summary ||
      !assessment.problem_addressed ||
      !assessment.solution_implemented
    ) {
      throw new BadRequestException(
        'Cannot submit impact assessment: Summary, problem addressed, and solution implemented are required.',
      );
    }

    // Transition to UNDER_REVIEW
    assessment.status = ImpactAssessmentStatus.UNDER_REVIEW;
    assessment.submitted_at = new Date();
    assessment.submitted_by_id = userId;

    const savedAssessment = await this.assessmentRepo.save(assessment);
    // IMPACT_SUBMIT_NOTIF
    try {
      if (project.challenge?.district) {
        await this.notifService?.notifyDistrictOfficers(
          project.challenge.district,
          NotificationType.IMPACT_UPDATE,
          `Impact Assessment Submitted: ${project.title}`,
          `An impact assessment has been submitted for project "${project.title}".`,
          'PROJECT',
          projectId,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch impact assessment submission notification: ${e}`);
    }
    return savedAssessment;
  }

  // =========================================================================
  // 5. METRIC MANAGEMENT
  // =========================================================================

  async addMetric(
    projectId: string,
    userId: string,
    userRole: string | undefined,
    dto: CreateImpactMetricDto,
  ): Promise<ImpactMetric> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException(
        'Cannot add metrics: No impact assessment found for this project. Create an assessment first.',
      );
    }

    if (
      assessment.status !== ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING &&
      assessment.status !== ImpactAssessmentStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot add metrics: Assessment status is "${assessment.status}". Only PENDING or REVISION_REQUIRED assessments can accept new metrics.`,
      );
    }

    // Authorization: Consortium participant or Gov/Admin
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && !participant) {
      throw new ForbiddenException(
        'You must be an active consortium participant to contribute impact metrics.',
      );
    }

    const metric = this.metricRepo.create({
      impact_assessment_id: assessment.id,
      metric_category: dto.metric_category,
      metric_name: dto.metric_name,
      baseline_value: dto.baseline_value || null,
      target_value: dto.target_value || null,
      actual_value: dto.actual_value,
      unit: dto.unit,
      measurement_method: dto.measurement_method,
    });

    return this.metricRepo.save(metric);
  }

  async updateMetric(
    projectId: string,
    metricId: string,
    userId: string,
    userRole: string | undefined,
    dto: UpdateImpactMetricDto,
  ): Promise<ImpactMetric> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException('Impact assessment not found.');
    }

    if (
      assessment.status !== ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING &&
      assessment.status !== ImpactAssessmentStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot edit metrics: Assessment status is "${assessment.status}".`,
      );
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && !participant) {
      throw new ForbiddenException(
        'You must be an active consortium participant to edit impact metrics.',
      );
    }

    const metric = await this.metricRepo.findOne({
      where: { id: metricId, impact_assessment_id: assessment.id },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with ID "${metricId}" not found.`);
    }

    if (dto.metric_category !== undefined) metric.metric_category = dto.metric_category;
    if (dto.metric_name !== undefined) metric.metric_name = dto.metric_name;
    if (dto.baseline_value !== undefined) metric.baseline_value = dto.baseline_value;
    if (dto.target_value !== undefined) metric.target_value = dto.target_value;
    if (dto.actual_value !== undefined) metric.actual_value = dto.actual_value;
    if (dto.unit !== undefined) metric.unit = dto.unit;
    if (dto.measurement_method !== undefined) metric.measurement_method = dto.measurement_method;

    return this.metricRepo.save(metric);
  }

  async deleteMetric(
    projectId: string,
    metricId: string,
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean; message: string }> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException('Impact assessment not found.');
    }

    if (
      assessment.status !== ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING &&
      assessment.status !== ImpactAssessmentStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot delete metrics: Assessment status is "${assessment.status}".`,
      );
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && (!participant || !this.isLeadRole(participant.participant_role))) {
      throw new ForbiddenException(
        'Only the Consortium Lead or an administrator can delete impact metrics.',
      );
    }

    const metric = await this.metricRepo.findOne({
      where: { id: metricId, impact_assessment_id: assessment.id },
    });

    if (!metric) {
      throw new NotFoundException(`Metric with ID "${metricId}" not found.`);
    }

    await this.metricRepo.remove(metric);
    return { success: true, message: 'Metric deleted successfully.' };
  }

  // =========================================================================
  // 6. ISOLATED EVIDENCE VAULT
  // =========================================================================

  async uploadEvidence(
    projectId: string,
    userId: string,
    userRole: string | undefined,
    file: ExpressUploadedFile,
    dto: CreateImpactEvidenceDto,
  ): Promise<ImpactEvidence> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException(
        'Cannot upload impact evidence: No impact assessment found for this project.',
      );
    }

    if (
      assessment.status !== ImpactAssessmentStatus.IMPACT_VERIFICATION_PENDING &&
      assessment.status !== ImpactAssessmentStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot upload evidence: Assessment status is "${assessment.status}". Evidence is locked.`,
      );
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    const participant = await this.getParticipantForUser(projectId, userId);

    if (!isGovOrAdmin && !participant) {
      throw new ForbiddenException(
        'You must be an active consortium participant to upload impact evidence.',
      );
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('No file payload provided.');
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File exceeds the maximum permitted size of 50MB (${file.size} bytes).`,
      );
    }

    // Path traversal protection & unique storage key
    const sanitizedBase = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `impact_${randomUUID()}_${sanitizedBase}`;
    const destinationPath = path.resolve(this.uploadDir, storageKey);

    if (!destinationPath.startsWith(this.uploadDir)) {
      throw new BadRequestException('Invalid filename: Path traversal attempt detected.');
    }

    // Compute SHA-256 checksum
    const hash = createHash('sha256');
    hash.update(file.buffer);
    const checksum = hash.digest('hex');

    // Write file to isolated directory
    fs.writeFileSync(destinationPath, file.buffer);

    const fileUrl = `/api/projects/${projectId}/impact/evidence/${storageKey}/download`;

    const evidence = this.evidenceRepo.create({
      impact_assessment_id: assessment.id,
      uploaded_by_id: userId,
      file_url: fileUrl,
      storage_key: storageKey,
      document_type: dto.document_type,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum,
      description: dto.description || null,
    });

    return this.evidenceRepo.save(evidence);
  }

  async downloadEvidence(
    projectId: string,
    evidenceId: string,
    userId?: string,
    userRole?: string,
    res?: Response,
  ): Promise<void> {
    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException('Impact assessment not found.');
    }

    const evidence = await this.evidenceRepo.findOne({
      where: { id: evidenceId, impact_assessment_id: assessment.id },
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence item with ID "${evidenceId}" not found.`);
    }

    const filePath = path.resolve(this.uploadDir, evidence.storage_key);

    if (!filePath.startsWith(this.uploadDir)) {
      throw new ForbiddenException('Access denied: Path traversal detected.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('The requested evidence file does not exist on disk.');
    }

    if (res) {
      res.setHeader('Content-Type', evidence.mime_type || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(evidence.file_name)}"`,
      );
      res.setHeader('Content-Length', evidence.file_size);
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  }

  // =========================================================================
  // 7. ANTI-ASTROTURF COMMUNITY FEEDBACK
  // =========================================================================

  async submitFeedback(
    projectId: string,
    userId: string,
    dto: CreateImpactFeedbackDto,
  ): Promise<ImpactFeedback> {
    const project = await this.ensureProject(projectId);

    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
    });

    if (!assessment) {
      throw new NotFoundException(
        'Cannot submit community feedback: No impact assessment exists for this project.',
      );
    }

    // Invariant 11 & Section 9: Prevent astroturfing
    // Consortium participants cannot review as citizens
    const participant = await this.getParticipantForUser(projectId, userId);
    if (participant) {
      throw new ForbiddenException(
        'Consortium participants cannot submit citizen community feedback for their own project.',
      );
    }

    // Must be the original Challenge Submitter
    if (!project.challenge || project.challenge.submitted_by !== userId) {
      throw new ForbiddenException(
        'Only the original citizen challenge submitter is eligible to submit community feedback for this project.',
      );
    }

    // Section 9: Prevent duplicate feedback from the same eligible user
    const existing = await this.feedbackRepo.findOne({
      where: {
        impact_assessment_id: assessment.id,
        submitted_by_id: userId,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'You have already submitted community feedback for this impact assessment.',
      );
    }

    const feedback = this.feedbackRepo.create({
      impact_assessment_id: assessment.id,
      submitted_by_id: userId,
      rating: dto.rating,
      feedback: dto.feedback,
      benefit_confirmed: dto.benefit_confirmed ?? false,
    });

    return this.feedbackRepo.save(feedback);
  }

  // =========================================================================
  // 8. GOVERNMENT GOVERNANCE: QUEUE & REVIEWS
  // =========================================================================

  async getImpactQueue(
    statusFilter?: ImpactAssessmentStatus,
  ): Promise<any[]> {
    const qb = this.assessmentRepo
      .createQueryBuilder('assessment')
      .leftJoinAndSelect('assessment.project', 'project')
      .leftJoinAndSelect('project.challenge', 'challenge')
      .leftJoinAndSelect('project.leadInstitution', 'leadInstitution')
      .leftJoinAndSelect('leadInstitution.organization', 'leadOrg')
      .leftJoinAndSelect('assessment.metrics', 'metrics')
      .leftJoinAndSelect('assessment.evidence', 'evidence')
      .leftJoinAndSelect('assessment.feedback', 'feedback')
      .leftJoinAndSelect('assessment.reviews', 'reviews')
      .orderBy('assessment.submitted_at', 'DESC', 'NULLS LAST');

    if (statusFilter) {
      qb.where('assessment.status = :status', { status: statusFilter });
    }

    const assessments = await qb.getMany();

    return assessments.map((a) => ({
      id: a.id,
      project_id: a.project_id,
      projectTitle: a.project?.title,
      challengeTitle: a.project?.challenge?.title,
      district: a.project?.challenge?.district,
      leadInstitutionName: a.project?.leadInstitution?.organization?.name || null,
      status: a.status,
      summary: a.summary,
      beneficiaries_reached: a.beneficiaries_reached,
      geographic_coverage: a.geographic_coverage,
      implementation_cost: a.implementation_cost,
      metricsCount: a.metrics?.length || 0,
      evidenceCount: a.evidence?.length || 0,
      feedbackCount: a.feedback?.length || 0,
      submitted_at: a.submitted_at,
      verified_at: a.verified_at,
      rejected_at: a.rejected_at,
      latestReview: a.reviews?.[a.reviews.length - 1] || null,
    }));
  }

  async getAdminProjectImpact(projectId: string): Promise<any> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: [
        'challenge',
        'leadInstitution',
        'partnerIndustry',
        'participants',
        'participants.organization',
        'milestones',
        'deliverables',
      ],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    const assessment = await this.assessmentRepo.findOne({
      where: { project_id: projectId },
      relations: [
        'metrics',
        'evidence',
        'evidence.uploadedBy',
        'feedback',
        'feedback.submittedBy',
        'reviews',
        'reviews.reviewer',
      ],
    });

    return {
      project,
      assessment,
      completedMilestonesCount:
        project.milestones?.filter((m) => m.status === 'APPROVED').length || 0,
      deliverablesCount: project.deliverables?.length || 0,
    };
  }

  // =========================================================================
  // 9. GOVERNMENT APPROVAL (UNDER_REVIEW -> VERIFIED -> IMPACT_VERIFIED)
  // =========================================================================

  async approveImpact(
    assessmentId: string,
    reviewerId: string,
    dto?: ImpactReviewActionDto,
    reviewerRole?: string,
  ): Promise<{ assessment: ImpactAssessment; project: Project }> {
    if (reviewerRole && !this.isGovernmentOrAdmin(reviewerRole)) {
      throw new ForbiddenException(
        'Only authorized government reviewers or platform admins can approve impact verification.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await queryRunner.manager.findOne(ImpactAssessment, {
        where: { id: assessmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assessment) {
        throw new NotFoundException(
          `Impact assessment with ID "${assessmentId}" not found.`,
        );
      }

      // Invariant 6: Self-Verification Forbidden
      const participant = await this.getParticipantForUser(
        assessment.project_id,
        reviewerId,
      );
      if (participant) {
        throw new ForbiddenException(
          'Consortium participants cannot verify their own impact assessment.',
        );
      }

      if (assessment.status !== ImpactAssessmentStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot approve impact: Assessment status is "${assessment.status}". Only UNDER_REVIEW assessments can be verified.`,
        );
      }

      // Guard 9: At least one metric, one evidence, required fields
      const metricCount = await queryRunner.manager.count(ImpactMetric, {
        where: { impact_assessment_id: assessmentId },
      });
      if (metricCount === 0) {
        throw new BadRequestException(
          'Cannot verify impact: At least one structured metric is required.',
        );
      }

      const evidenceCount = await queryRunner.manager.count(ImpactEvidence, {
        where: { impact_assessment_id: assessmentId },
      });
      if (evidenceCount === 0) {
        throw new BadRequestException(
          'Cannot verify impact: At least one impact evidence document is required.',
        );
      }

      if (
        !assessment.summary ||
        !assessment.problem_addressed ||
        !assessment.solution_implemented
      ) {
        throw new BadRequestException(
          'Cannot verify impact: Summary, problem addressed, and solution implemented are required.',
        );
      }

      const project = await queryRunner.manager.findOne(Project, {
        where: { id: assessment.project_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(
          `Project "${assessment.project_id}" not found.`,
        );
      }

      if (project.status !== ProjectStatus.COMPLETED) {
        throw new BadRequestException(
          `Cannot verify impact: Project status is "${project.status}". Only COMPLETED projects can become IMPACT_VERIFIED.`,
        );
      }

      // 1. Update assessment: VERIFIED
      assessment.status = ImpactAssessmentStatus.VERIFIED;
      assessment.verified_at = new Date();
      await queryRunner.manager.save(assessment);

      // 2. Update project: IMPACT_VERIFIED
      project.status = ProjectStatus.IMPACT_VERIFIED;
      await queryRunner.manager.save(project);

      // 3. Create immutable audit record
      const review = queryRunner.manager.create(ImpactReview, {
        impact_assessment_id: assessment.id,
        reviewer_id: reviewerId,
        decision: ImpactReviewDecision.APPROVED,
        notes: dto?.notes || 'Impact verification approved by government authority.',
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      // IMPACT_APPROVE_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          assessment.project_id,
          NotificationType.IMPACT_UPDATE,
          `Impact Verified: ${project.title}`,
          `The impact assessment for project "${project.title}" has been approved and verified by government reviewer.`,
          'PROJECT',
          assessment.project_id,
        );

        const fullProj = await this.projectRepo.findOne({
          where: { id: assessment.project_id },
          relations: ['challenge'],
        });
        if (fullProj?.challenge?.submitted_by) {
          await this.notifService?.notifyUser(
            fullProj.challenge.submitted_by,
            NotificationType.IMPACT_UPDATE,
            `Real-World Impact Verified: ${project.title}`,
            `The real-world outcomes and impact for your reported problem "${fullProj.challenge.title}" have been officially verified by government authorities. Status: IMPACT VERIFIED.`,
            'PROJECT',
            assessment.project_id,
            fullProj.challenge.district_id,
            fullProj.challenge.district,
          );
        }
      } catch (e) {
        this.logger.warn(`Failed to dispatch impact approval notification: ${e}`);
      }

      return { assessment, project };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 10. GOVERNMENT REVISION WORKFLOW (UNDER_REVIEW -> REVISION_REQUIRED)
  // =========================================================================

  async requireRevision(
    assessmentId: string,
    reviewerId: string,
    dto: RequireRevisionDto,
  ): Promise<ImpactAssessment> {
    if (!dto.notes || dto.notes.trim() === '') {
      throw new BadRequestException(
        'Mandatory reviewer notes are required when requesting revision on an impact assessment.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await queryRunner.manager.findOne(ImpactAssessment, {
        where: { id: assessmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assessment) {
        throw new NotFoundException(
          `Impact assessment with ID "${assessmentId}" not found.`,
        );
      }

      if (assessment.status !== ImpactAssessmentStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot request revision: Assessment status is "${assessment.status}". Only UNDER_REVIEW assessments can be returned for revision.`,
        );
      }

      assessment.status = ImpactAssessmentStatus.REVISION_REQUIRED;
      await queryRunner.manager.save(assessment);

      const review = queryRunner.manager.create(ImpactReview, {
        impact_assessment_id: assessment.id,
        reviewer_id: reviewerId,
        decision: ImpactReviewDecision.REVISION_REQUIRED,
        notes: dto.notes,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      return assessment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 11. GOVERNMENT REJECTION WORKFLOW (UNDER_REVIEW -> REJECTED [Terminal])
  // =========================================================================

  async rejectImpact(
    assessmentId: string,
    reviewerId: string,
    dto: RejectImpactDto,
  ): Promise<ImpactAssessment> {
    if (!dto.notes || dto.notes.trim() === '') {
      throw new BadRequestException(
        'Mandatory rejection reason is required when rejecting an impact assessment.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await queryRunner.manager.findOne(ImpactAssessment, {
        where: { id: assessmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assessment) {
        throw new NotFoundException(
          `Impact assessment with ID "${assessmentId}" not found.`,
        );
      }

      if (assessment.status !== ImpactAssessmentStatus.UNDER_REVIEW) {
        throw new BadRequestException(
          `Cannot reject assessment: Assessment status is "${assessment.status}". Only UNDER_REVIEW assessments can be rejected.`,
        );
      }

      assessment.status = ImpactAssessmentStatus.REJECTED;
      assessment.rejected_at = new Date();
      await queryRunner.manager.save(assessment);

      const review = queryRunner.manager.create(ImpactReview, {
        impact_assessment_id: assessment.id,
        reviewer_id: reviewerId,
        decision: ImpactReviewDecision.REJECTED,
        notes: dto.notes,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      return assessment;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 12. PLATFORM ADMIN AUDIT REVOCATION (VERIFIED -> REVISION_REQUIRED, Project -> COMPLETED)
  // =========================================================================

  async revokeImpact(
    assessmentId: string,
    reviewerId: string,
    reviewerRole: string,
    dto: RevokeImpactDto,
  ): Promise<{ assessment: ImpactAssessment; project: Project }> {
    // Invariant 8 & Section 17: PLATFORM_ADMIN only
    if (!this.isPlatformAdmin(reviewerRole)) {
      throw new ForbiddenException(
        'Access Denied: Only a PLATFORM_ADMIN can revoke verified impact assessments.',
      );
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException(
        'Mandatory revocation reason is required to revoke verified impact.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const assessment = await queryRunner.manager.findOne(ImpactAssessment, {
        where: { id: assessmentId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!assessment) {
        throw new NotFoundException(
          `Impact assessment with ID "${assessmentId}" not found.`,
        );
      }

      if (assessment.status !== ImpactAssessmentStatus.VERIFIED) {
        throw new BadRequestException(
          `Cannot revoke impact: Assessment status is "${assessment.status}". Only VERIFIED assessments can be revoked.`,
        );
      }

      const project = await queryRunner.manager.findOne(Project, {
        where: { id: assessment.project_id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(
          `Project "${assessment.project_id}" not found.`,
        );
      }

      // 1. Revert assessment to REVISION_REQUIRED
      assessment.status = ImpactAssessmentStatus.REVISION_REQUIRED;
      assessment.verified_at = null;
      await queryRunner.manager.save(assessment);

      // 2. Downgrade project status back to COMPLETED
      project.status = ProjectStatus.COMPLETED;
      await queryRunner.manager.save(project);

      // 3. Create immutable audit record (retains historical VERIFIED record)
      const review = queryRunner.manager.create(ImpactReview, {
        impact_assessment_id: assessment.id,
        reviewer_id: reviewerId,
        decision: ImpactReviewDecision.REVOKED,
        notes: `[REVOKED BY PLATFORM_ADMIN]: ${dto.reason}`,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      // IMPACT_REVOKE_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          assessment.project_id,
          NotificationType.IMPACT_UPDATE,
          'Impact Verification Revoked',
          `The impact verification was revoked: ${dto.reason}`,
          'PROJECT',
          assessment.project_id,
        );
      } catch (e) {
        this.logger.warn(`Failed to dispatch impact revoke notification: ${e}`);
      }

      return { assessment, project };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
