import { ProjectAcademicMember } from './entities/project-academic-member.entity';
import { ProjectInnovationOutcome } from './entities/project-innovation-outcome.entity';
import { ProjectContribution } from './entities/project-contribution.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AcademicMemberRole,
  AcademicMemberStatus,
  ProjectContributionType,
  ContributionStatus,
  ContributionVisibility,
  OrganizationType,
  NotificationType,
  InnovationOutcomeType,
  InnovationOutcomeStatus,
  ProjectIpAssessmentStatus,
} from '../../common/enums';
import {
  CreateAcademicMemberDto,
  UpdateAcademicMemberDto,
  CreateProjectContributionDto,
  UpdateProjectContributionDto,
  VerifyContributionDto,
  CreateInnovationOutcomeDto,
  UpdateInnovationOutcomeDto,
  VerifyInnovationOutcomeDto,
  RecordIpAssessmentDto,
} from './dto';
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
import { Project } from './entities/project.entity';
import { ProjectParticipant } from './entities/project-participant.entity';
import { ProjectMilestone } from './entities/project-milestone.entity';
import { ProjectTask } from './entities/project-task.entity';
import { ProjectDeliverable } from './entities/project-deliverable.entity';
import { ProjectUpdate } from './entities/project-update.entity';
import { ProjectReview } from './entities/project-review.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { User } from '../users/entities/user.entity';
import {
  ProjectStatus,
  MilestoneStatus,
  TaskStatus,
  DeliverableDocumentType,
  ProjectUpdateType,
  ProjectReviewAction,
  UserRole,
  MembershipStatus,
} from '../../common/enums';
import {
  ProjectKickoffDto,
  KickoffReviewDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  MilestoneReviewDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateDeliverableDto,
  CreateProjectUpdateDto,
  ProjectTerminationDto,
  BlockerReviewDto,
  ProjectCompletionDto,
  ImpactVerificationDto,
  RecordPrototypeDto,
  RecordTestValidationDto,
  RecordPilotDeploymentDto,
  RecordFinalDeploymentDto,
  TransitionLifecycleStageDto,
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
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes = 50 * 1024 * 1024; // 50MB
  private acadMemberRepo: Repository<ProjectAcademicMember>;
  private contribRepo: Repository<ProjectContribution>;
  private orgRepo: Repository<Organization>;
  private notifService?: NotificationsService;
  private outcomeRepo: Repository<ProjectInnovationOutcome>;

  constructor(
    @InjectRepository(Project)
    private readonly projectRepo: Repository<Project>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepo: Repository<ProjectParticipant>,
    @InjectRepository(ProjectMilestone)
    private readonly milestoneRepo: Repository<ProjectMilestone>,
    @InjectRepository(ProjectTask)
    private readonly taskRepo: Repository<ProjectTask>,
    @InjectRepository(ProjectDeliverable)
    private readonly deliverableRepo: Repository<ProjectDeliverable>,
    @InjectRepository(ProjectUpdate)
    private readonly updateRepo: Repository<ProjectUpdate>,
    @InjectRepository(ProjectReview)
    private readonly reviewRepo: Repository<ProjectReview>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    @Optional()
    @InjectRepository(ProjectAcademicMember)
    acadMemberRepo?: Repository<ProjectAcademicMember>,
    @Optional()
    @InjectRepository(ProjectContribution)
    contribRepo?: Repository<ProjectContribution>,
    @Optional()
    @InjectRepository(Organization)
    orgRepo?: Repository<Organization>,
    @Optional()
    notifService?: NotificationsService,
    @Optional()
    @InjectRepository(ProjectInnovationOutcome)
    outcomeRepo?: Repository<ProjectInnovationOutcome>,
  ) {
    this.acadMemberRepo =
      acadMemberRepo || this.dataSource.getRepository(ProjectAcademicMember);
    this.contribRepo =
      contribRepo || this.dataSource.getRepository(ProjectContribution);
    this.orgRepo =
      orgRepo || this.dataSource.getRepository(Organization);
    this.notifService = notifService;
    this.outcomeRepo = outcomeRepo || this.dataSource.getRepository(ProjectInnovationOutcome);

    this.uploadDir = path.resolve(
      process.cwd(),
      process.env.DELIVERABLES_UPLOAD_DIR || 'uploads/project-deliverables',
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

  isLeadRole(role?: string): boolean {
    if (!role) return false;
    const r = role.toUpperCase();
    return r === 'LEAD' || r === 'LEAD_INSTITUTION';
  }

  isProjectActiveStatus(status: ProjectStatus): boolean {
    return [
      ProjectStatus.ACTIVE,
      ProjectStatus.PLANNING,
      ProjectStatus.PROTOTYPE_DEVELOPMENT,
      ProjectStatus.TESTING,
      ProjectStatus.PILOT,
      ProjectStatus.DEPLOYMENT,
    ].includes(status);
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
      relations: ['challenge'],
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }
    return project;
  }

  async ensureAccess(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<{
    project: Project;
    participant?: ProjectParticipant;
    isGovOrAdmin: boolean;
  }> {
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['participants', 'participants.organization'],
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    if (isGovOrAdmin) {
      return { project, isGovOrAdmin };
    }

    const participant = await this.getParticipantForUser(projectId, userId);
    if (!participant) {
      throw new ForbiddenException(
        'You do not have access to this collaborative project.',
      );
    }

    return { project, participant, isGovOrAdmin };
  }

  async ensureLeadOrGov(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<{
    project: Project;
    participant?: ProjectParticipant;
    isGovOrAdmin: boolean;
  }> {
    const { project, participant, isGovOrAdmin } = await this.ensureAccess(
      projectId,
      userId,
      userRole,
    );

    if (isGovOrAdmin) {
      return { project, isGovOrAdmin };
    }

    if (!participant || !this.isLeadRole(participant.participant_role)) {
      throw new ForbiddenException(
        'Only the Lead institution or a Government officer can perform this action.',
      );
    }

    return { project, participant, isGovOrAdmin };
  }

  // =========================================================================
  // 2. PROJECT QUERIES & DETAIL
  // =========================================================================

  async getProjects(
    userId: string,
    userRole?: string,
    statusFilter?: ProjectStatus,
  ): Promise<Project[]> {
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);

    const qb = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.challenge', 'challenge')
      .leftJoinAndSelect('project.participants', 'participants')
      .leftJoinAndSelect('participants.organization', 'organization')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .orderBy('project.created_at', 'DESC');

    if (statusFilter) {
      qb.andWhere('project.status = :status', { status: statusFilter });
    }

    if (!isGovOrAdmin) {
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

      qb.innerJoin(
        'project_participants',
        'pp_filter',
        'pp_filter.project_id = project.id AND pp_filter.organization_id IN (:...orgIds) AND pp_filter.status = :activeStatus',
        { orgIds, activeStatus: 'ACTIVE' },
      );
    }

    return qb.getMany();
  }

  async getProjectById(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<Project> {
    await this.ensureAccess(projectId, userId, userRole);

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: [
        'challenge',
        'leadInstitution',
        'partnerIndustry',
        'participants',
        'participants.organization',
        'milestones',
        'milestones.tasks',
        'milestones.tasks.assignedParticipant',
        'milestones.tasks.assignedParticipant.organization',
        'deliverables',
        'deliverables.uploadedByParticipant',
        'deliverables.uploadedByParticipant.organization',
        'deliverables.uploadedByUser',
        'updates',
        'updates.authorParticipant',
        'updates.authorParticipant.organization',
        'updates.authorUser',
        'updates.resolvedByReview',
        'reviews',
        'reviews.reviewerUser',
        'academicMembers',
        'academicMembers.user',
        'academicMembers.organization',
      ],
      order: {
        milestones: {
          order_index: 'ASC',
        },
        updates: {
          created_at: 'DESC',
        },
        deliverables: {
          created_at: 'DESC',
        },
        reviews: {
          created_at: 'DESC',
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    return project;
  }

  // =========================================================================
  // 3. KICKOFF WORKFLOW
  // =========================================================================

  async submitKickoff(
    projectId: string,
    userId: string,
    userRole: string,
    dto: ProjectKickoffDto,
  ): Promise<Project> {
    const { project } = await this.ensureLeadOrGov(
      projectId,
      userId,
      userRole,
    );

    const allowedStatuses: ProjectStatus[] = [
      ProjectStatus.INITIATED,
      ProjectStatus.PROPOSED,
      ProjectStatus.KICKOFF_REVISION,
    ];

    if (!allowedStatuses.includes(project.status)) {
      throw new BadRequestException(
        `Kickoff plan cannot be submitted while project is in status "${project.status}". Only INITIATED, PROPOSED, or KICKOFF_REVISION projects can submit a kickoff plan.`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (dto.objectives !== undefined) {
        project.objectives = dto.objectives;
      }
      if (dto.expected_outcomes !== undefined) {
        project.expected_outcomes = dto.expected_outcomes;
      }
      if (dto.start_date) {
        project.start_date = new Date(dto.start_date);
      }
      if (dto.target_completion_date) {
        project.target_completion_date = new Date(dto.target_completion_date);
      }

      project.status = ProjectStatus.KICKOFF_PENDING;
      await queryRunner.manager.save(project);

      // Create initial milestones if supplied
      if (dto.initial_milestones && dto.initial_milestones.length > 0) {
        let index = 1;
        for (const mDto of dto.initial_milestones) {
          const milestone = queryRunner.manager.create(ProjectMilestone, {
            project_id: project.id,
            title: mDto.title,
            description: mDto.description || null,
            due_date: mDto.due_date ? new Date(mDto.due_date) : null,
            order_index: mDto.order_index || index++,
            status: MilestoneStatus.PENDING,
          });
          await queryRunner.manager.save(milestone);
        }
      }

      await queryRunner.commitTransaction();
      // KICKOFF_SUBMITTED_NOTIF
      try {
        const fullProj = await this.projectRepo.findOne({ where: { id: projectId }, relations: ['challenge'] });
        if (fullProj?.challenge?.district) {
          await this.notifService?.notifyDistrictOfficers(
            fullProj.challenge.district,
            NotificationType.PROJECT_GOVERNANCE,
            `Kickoff Plan Submitted: ${fullProj.title}`,
            `A kickoff plan has been submitted for project "${fullProj.title}".`,
            'PROJECT',
            projectId,
          );
        }
      } catch (e) {
        this.logger.warn(`Failed to send kickoff submitted notification: ${e}`);
      }
      return this.getProjectById(projectId, userId, userRole);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reviewKickoff(
    projectId: string,
    reviewerId: string,
    dto: KickoffReviewDto,
  ): Promise<Project> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found.`);
      }

      if (project.status !== ProjectStatus.KICKOFF_PENDING) {
        throw new BadRequestException(
          `Cannot review kickoff: Project status is "${project.status}". Expected "KICKOFF_PENDING".`,
        );
      }

      let action: ProjectReviewAction;
      if (dto.decision === 'APPROVE') {
        project.status = ProjectStatus.ACTIVE;
        if (!project.start_date) {
          project.start_date = new Date();
        }
        action = ProjectReviewAction.KICKOFF_APPROVED;

        // Auto-activate first pending milestone if it exists
        const firstMilestone = await queryRunner.manager.findOne(
          ProjectMilestone,
          {
            where: {
              project_id: project.id,
              status: MilestoneStatus.PENDING,
            },
            order: { order_index: 'ASC' },
          },
        );
        if (firstMilestone) {
          firstMilestone.status = MilestoneStatus.IN_PROGRESS;
          await queryRunner.manager.save(firstMilestone);
        }
      } else {
        project.status = ProjectStatus.KICKOFF_REVISION;
        action = ProjectReviewAction.KICKOFF_REVISION_REQUIRED;
      }

      await queryRunner.manager.save(project);

      // Create review audit log
      const review = queryRunner.manager.create(ProjectReview, {
        project_id: project.id,
        reviewer_user_id: reviewerId,
        action,
        comments: dto.comments || null,
        feedback: dto.feedback || null,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      // KICKOFF_REVIEWED_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          projectId,
          NotificationType.PROJECT_GOVERNANCE,
          `Kickoff Plan ${dto.decision === 'APPROVE' ? 'Approved' : 'Revision Requested'}: ${project.title}`,
          `The kickoff plan for project "${project.title}" has been reviewed: ${dto.decision}. ${dto.comments || ''}`,
          'PROJECT',
          projectId,
        );
      } catch (e) {
        this.logger.warn(`Failed to send kickoff review notification: ${e}`);
      }
      return this.getProjectById(projectId, reviewerId, UserRole.GOVERNMENT_OFFICER);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 4. MILESTONES & CASCADING LOCKS
  // =========================================================================

  async getMilestones(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectMilestone[]> {
    await this.ensureAccess(projectId, userId, userRole);

    return this.milestoneRepo.find({
      where: { project_id: projectId },
      relations: ['tasks', 'tasks.assignedParticipant', 'deliverables', 'reviews'],
      order: { order_index: 'ASC' },
    });
  }

  async createMilestone(
    projectId: string,
    userId: string,
    userRole: string,
    dto: CreateMilestoneDto,
  ): Promise<ProjectMilestone> {
    const { project } = await this.ensureLeadOrGov(
      projectId,
      userId,
      userRole,
    );

    const creatableStatuses: ProjectStatus[] = [
      ProjectStatus.INITIATED,
      ProjectStatus.PROPOSED,
      ProjectStatus.KICKOFF_REVISION,
      ProjectStatus.ACTIVE,
      ProjectStatus.PLANNING,
      ProjectStatus.PROTOTYPE_DEVELOPMENT,
      ProjectStatus.TESTING,
      ProjectStatus.PILOT,
      ProjectStatus.DEPLOYMENT,
    ];

    if (!creatableStatuses.includes(project.status)) {
      throw new BadRequestException(
        `Cannot create milestones while project is in status "${project.status}".`,
      );
    }

    // Determine order index if not specified
    let orderIndex = dto.order_index;
    if (orderIndex === undefined || orderIndex === null) {
      const maxOrder = await this.milestoneRepo
        .createQueryBuilder('m')
        .where('m.project_id = :projectId', { projectId })
        .select('MAX(m.order_index)', 'max')
        .getRawOne();
      orderIndex = (maxOrder?.max || 0) + 1;
    }

    const milestone = this.milestoneRepo.create({
      project_id: projectId,
      title: dto.title,
      description: dto.description || null,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      order_index: orderIndex,
      status: MilestoneStatus.PENDING,
    });

    return this.milestoneRepo.save(milestone);
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    userId: string,
    userRole: string,
    dto: UpdateMilestoneDto,
  ): Promise<ProjectMilestone> {
    await this.ensureLeadOrGov(projectId, userId, userRole);

    const milestone = await this.milestoneRepo.findOne({
      where: { id: milestoneId, project_id: projectId },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone with ID "${milestoneId}" not found in this project.`,
      );
    }

    // Cascading Lock Check: Milestone cannot be modified if in REVIEW_REQUESTED or APPROVED
    if (
      milestone.status === MilestoneStatus.REVIEW_REQUESTED ||
      milestone.status === MilestoneStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Milestone is locked (${milestone.status}) and cannot be modified.`,
      );
    }

    if (dto.title !== undefined) milestone.title = dto.title;
    if (dto.description !== undefined) milestone.description = dto.description;
    if (dto.due_date !== undefined)
      milestone.due_date = dto.due_date ? new Date(dto.due_date) : (null as any);
    if (dto.order_index !== undefined) milestone.order_index = dto.order_index;

    return this.milestoneRepo.save(milestone);
  }

  async startMilestone(
    projectId: string,
    milestoneId: string,
    userId: string,
    userRole: string,
  ): Promise<ProjectMilestone> {
    const { project } = await this.ensureLeadOrGov(
      projectId,
      userId,
      userRole,
    );

    if (!this.isProjectActiveStatus(project.status)) {
      throw new BadRequestException(
        `Cannot start milestone: Project is in status "${project.status}". Project must be in an active status.`,
      );
    }

    const milestone = await this.milestoneRepo.findOne({
      where: { id: milestoneId, project_id: projectId },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID "${milestoneId}" not found.`);
    }

    if (milestone.status !== MilestoneStatus.PENDING) {
      throw new BadRequestException(
        `Cannot start milestone: Milestone is currently "${milestone.status}". Only PENDING milestones can be started.`,
      );
    }

    milestone.status = MilestoneStatus.IN_PROGRESS;
    return this.milestoneRepo.save(milestone);
  }

  async requestMilestoneReview(
    projectId: string,
    milestoneId: string,
    userId: string,
    userRole: string,
  ): Promise<ProjectMilestone> {
    const { project } = await this.ensureLeadOrGov(
      projectId,
      userId,
      userRole,
    );

    if (!this.isProjectActiveStatus(project.status)) {
      throw new BadRequestException(
        `Cannot request milestone review: Project is in status "${project.status}". Project must be in an active status.`,
      );
    }

    const milestone = await this.milestoneRepo.findOne({
      where: { id: milestoneId, project_id: projectId },
    });

    if (!milestone) {
      throw new NotFoundException(`Milestone with ID "${milestoneId}" not found.`);
    }

    if (
      milestone.status !== MilestoneStatus.IN_PROGRESS &&
      milestone.status !== MilestoneStatus.REVISION_REQUIRED
    ) {
      throw new BadRequestException(
        `Cannot request review for milestone in status "${milestone.status}". Only IN_PROGRESS or REVISION_REQUIRED milestones can request review.`,
      );
    }

    // Lock engaged: REVIEW_REQUESTED freezes all milestone tasks & deliverables
    milestone.status = MilestoneStatus.REVIEW_REQUESTED;
    const savedMilestone = await this.milestoneRepo.save(milestone);
    // MILESTONE_REQUEST_REVIEW_NOTIF
    try {
      const fullProj = await this.projectRepo.findOne({ where: { id: projectId }, relations: ['challenge'] });
      if (fullProj?.challenge?.district) {
        await this.notifService?.notifyDistrictOfficers(
          fullProj.challenge.district,
          NotificationType.MILESTONE_ACTION,
          `Milestone Review Requested: ${milestone.title}`,
          `Milestone "${milestone.title}" has been submitted for review in project "${fullProj.title}".`,
          'PROJECT',
          projectId,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to send milestone review request notification: ${e}`);
    }
    return savedMilestone;
  }

  async reviewMilestone(
    projectId: string,
    milestoneId: string,
    reviewerId: string,
    dto: MilestoneReviewDto,
  ): Promise<ProjectMilestone> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const milestone = await queryRunner.manager.findOne(ProjectMilestone, {
        where: { id: milestoneId, project_id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!milestone) {
        throw new NotFoundException(
          `Milestone with ID "${milestoneId}" not found in this project.`,
        );
      }

      if (milestone.status !== MilestoneStatus.REVIEW_REQUESTED) {
        throw new BadRequestException(
          `Cannot review milestone: Milestone is in status "${milestone.status}". Expected "REVIEW_REQUESTED".`,
        );
      }

      let action: ProjectReviewAction;
      if (dto.decision === 'APPROVE') {
        milestone.status = MilestoneStatus.APPROVED;
        action = ProjectReviewAction.MILESTONE_APPROVED;

        // Auto-activate the next sequential pending milestone if one exists
        const nextMilestone = await queryRunner.manager.findOne(
          ProjectMilestone,
          {
            where: {
              project_id: projectId,
              status: MilestoneStatus.PENDING,
            },
            order: { order_index: 'ASC' },
          },
        );

        if (nextMilestone) {
          nextMilestone.status = MilestoneStatus.IN_PROGRESS;
          await queryRunner.manager.save(nextMilestone);
        }
      } else {
        milestone.status = MilestoneStatus.REVISION_REQUIRED;
        action = ProjectReviewAction.MILESTONE_REVISION_REQUIRED;
      }

      await queryRunner.manager.save(milestone);

      // Audit review record
      const review = queryRunner.manager.create(ProjectReview, {
        project_id: projectId,
        milestone_id: milestone.id,
        reviewer_user_id: reviewerId,
        action,
        comments: dto.comments || null,
        feedback: dto.feedback || null,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      // MILESTONE_REVIEWED_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          projectId,
          NotificationType.MILESTONE_ACTION,
          `Milestone ${dto.decision === 'APPROVE' ? 'Approved' : 'Revision Requested'}: ${milestone.title}`,
          `Milestone "${milestone.title}" review result: ${dto.decision}. ${dto.comments || ''}`,
          'PROJECT',
          projectId,
        );

        if (dto.decision === 'APPROVE') {
          const projWithChal = await this.projectRepo.findOne({
            where: { id: projectId },
            relations: ['challenge'],
          });
          if (projWithChal?.challenge?.submitted_by) {
            await this.notifService?.notifyUser(
              projWithChal.challenge.submitted_by,
              NotificationType.PROJECT_GOVERNANCE,
              `Project Milestone Completed: ${milestone.title}`,
              `Good news! Milestone "${milestone.title}" has been successfully completed and approved on the project addressing your reported problem: "${projWithChal.challenge.title}".`,
              'PROJECT',
              projectId,
              projWithChal.challenge.district_id,
              projWithChal.challenge.district,
            );
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to send milestone review notification: ${e}`);
      }

      return this.milestoneRepo.findOneOrFail({
        where: { id: milestone.id },
        relations: ['tasks', 'deliverables', 'reviews'],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 5. TASKS MANAGEMENT
  // =========================================================================

  async getTasks(
    projectId: string,
    userId: string,
    userRole?: string,
    milestoneId?: string,
  ): Promise<ProjectTask[]> {
    await this.ensureAccess(projectId, userId, userRole);

    const qb = this.taskRepo
      .createQueryBuilder('task')
      .innerJoin('task.milestone', 'milestone')
      .leftJoinAndSelect('task.assignedParticipant', 'assignedParticipant')
      .leftJoinAndSelect('assignedParticipant.organization', 'organization')
      .where('milestone.project_id = :projectId', { projectId })
      .orderBy('task.created_at', 'ASC');

    if (milestoneId) {
      qb.andWhere('task.milestone_id = :milestoneId', { milestoneId });
    }

    return qb.getMany();
  }

  async createTask(
    projectId: string,
    userId: string,
    userRole: string,
    dto: CreateTaskDto,
  ): Promise<ProjectTask> {
    const { project } = await this.ensureAccess(projectId, userId, userRole);

    if (project.status === ProjectStatus.TERMINATED || project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot create tasks: Project is in terminal status "${project.status}".`,
      );
    }

    const milestone = await this.milestoneRepo.findOne({
      where: { id: dto.milestone_id, project_id: projectId },
    });

    if (!milestone) {
      throw new NotFoundException(
        `Milestone with ID "${dto.milestone_id}" does not exist in this project.`,
      );
    }

    // Cascading Lock Check: Tasks cannot be created if milestone is locked
    if (
      milestone.status === MilestoneStatus.REVIEW_REQUESTED ||
      milestone.status === MilestoneStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot add tasks to milestone "${milestone.title}" because it is locked (${milestone.status}).`,
      );
    }

    let assignedId = dto.assigned_participant_id || null;
    if (assignedId) {
      const part = await this.participantRepo.findOne({
        where: { id: assignedId, project_id: projectId },
      });
      if (!part) {
        throw new BadRequestException(
          `Assigned participant with ID "${assignedId}" does not belong to this project.`,
        );
      }
    }

    const task = this.taskRepo.create({
      milestone_id: dto.milestone_id,
      assigned_participant_id: assignedId,
      title: dto.title,
      description: dto.description || null,
      status: dto.status || TaskStatus.TODO,
    });

    return this.taskRepo.save(task);
  }

  async updateTask(
    projectId: string,
    taskId: string,
    userId: string,
    userRole: string,
    dto: UpdateTaskDto,
  ): Promise<ProjectTask> {
    const { project } = await this.ensureAccess(projectId, userId, userRole);

    if (project.status === ProjectStatus.TERMINATED || project.status === ProjectStatus.COMPLETED) {
      throw new BadRequestException(
        `Cannot modify tasks: Project is in terminal status "${project.status}".`,
      );
    }

    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['milestone'],
    });

    if (!task || task.milestone.project_id !== projectId) {
      throw new NotFoundException(`Task with ID "${taskId}" not found in this project.`);
    }

    // Cascading Lock Check: Tasks cannot be modified if milestone is locked
    if (
      task.milestone.status === MilestoneStatus.REVIEW_REQUESTED ||
      task.milestone.status === MilestoneStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot modify task in milestone "${task.milestone.title}" because it is locked (${task.milestone.status}).`,
      );
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.assigned_participant_id !== undefined) {
      task.assigned_participant_id = dto.assigned_participant_id || null;
    }

    return this.taskRepo.save(task);
  }

  // =========================================================================
  // 6. DELIVERABLES & ISOLATED VAULT
  // =========================================================================

  async getDeliverables(
    projectId: string,
    userId: string,
    userRole?: string,
    milestoneId?: string,
  ): Promise<ProjectDeliverable[]> {
    await this.ensureAccess(projectId, userId, userRole);

    const qb = this.deliverableRepo
      .createQueryBuilder('deliv')
      .leftJoinAndSelect('deliv.milestone', 'milestone')
      .leftJoinAndSelect('deliv.uploadedByParticipant', 'uploadedByParticipant')
      .leftJoinAndSelect('uploadedByParticipant.organization', 'organization')
      .leftJoinAndSelect('deliv.uploadedByUser', 'uploadedByUser')
      .where('deliv.project_id = :projectId', { projectId })
      .orderBy('deliv.created_at', 'DESC');

    if (milestoneId) {
      qb.andWhere('deliv.milestone_id = :milestoneId', { milestoneId });
    }

    return qb.getMany();
  }

  async uploadDeliverable(
    projectId: string,
    file: ExpressUploadedFile,
    userId: string,
    userRole: string,
    dto: CreateDeliverableDto,
  ): Promise<ProjectDeliverable> {
    const { project, participant, isGovOrAdmin } = await this.ensureAccess(
      projectId,
      userId,
      userRole,
    );

    if (
      project.status === ProjectStatus.TERMINATED ||
      project.status === ProjectStatus.COMPLETED ||
      project.status === ProjectStatus.BLOCKED
    ) {
      throw new BadRequestException(
        `Cannot upload deliverables: Project is currently in status "${project.status}".`,
      );
    }

    let milestone: ProjectMilestone | null = null;
    if (dto.milestone_id) {
      milestone = await this.milestoneRepo.findOne({
        where: { id: dto.milestone_id, project_id: projectId },
      });
      if (!milestone) {
        throw new NotFoundException(
          `Milestone with ID "${dto.milestone_id}" does not exist in this project.`,
        );
      }

      // Cascading Lock Check: Cannot upload deliverable to locked milestone
      if (
        milestone.status === MilestoneStatus.REVIEW_REQUESTED ||
        milestone.status === MilestoneStatus.APPROVED
      ) {
        throw new BadRequestException(
          `Cannot upload deliverables to milestone "${milestone.title}" because it is locked (${milestone.status}).`,
        );
      }
    }

    if (!file) {
      throw new BadRequestException('No deliverable file provided for upload.');
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

    // Prevent path traversal
    const relative = path.relative(this.uploadDir, targetPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid storage path detected.');
    }

    await fs.promises.writeFile(targetPath, file.buffer);

    const deliverable = this.deliverableRepo.create({
      project_id: projectId,
      milestone_id: milestone ? milestone.id : null,
      uploaded_by_participant_id: participant ? participant.id : null,
      uploaded_by_user_id: userId,
      document_type: dto.document_type || DeliverableDocumentType.REPORT,
      title: dto.title || file.originalname.slice(0, 250),
      description: dto.description || null,
      storage_key: safeFilename,
      file_name: file.originalname,
      mime_type: file.mimetype,
      file_size: file.size,
      metadata: {
        safeFilename,
        storedPath: targetPath,
        uploadedAt: new Date().toISOString(),
        ...(dto.metadata || {}),
      },
    });

    return this.deliverableRepo.save(deliverable);
  }

  async downloadDeliverable(
    projectId: string,
    deliverableId: string,
    userId: string,
    userRole: string,
    res: Response,
  ) {
    await this.ensureAccess(projectId, userId, userRole);

    const deliverable = await this.deliverableRepo.findOne({
      where: { id: deliverableId, project_id: projectId },
    });

    if (!deliverable) {
      throw new NotFoundException(`Deliverable with ID "${deliverableId}" not found.`);
    }

    const safeBase = path.basename(deliverable.storage_key);
    const filePath = path.join(this.uploadDir, safeBase);

    const relative = path.relative(this.uploadDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested deliverable file was not found on server.');
    }

    res.download(filePath, deliverable.file_name);
  }

  // =========================================================================
  // 7. UPDATES, BLOCKERS & RESOLUTION
  // =========================================================================

  async getUpdates(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectUpdate[]> {
    await this.ensureAccess(projectId, userId, userRole);

    return this.updateRepo.find({
      where: { project_id: projectId },
      relations: [
        'authorParticipant',
        'authorParticipant.organization',
        'authorUser',
        'resolvedByReview',
      ],
      order: { created_at: 'DESC' },
    });
  }

  async createUpdate(
    projectId: string,
    userId: string,
    userRole: string,
    dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdate> {
    const { project, participant } = await this.ensureAccess(
      projectId,
      userId,
      userRole,
    );

    if (
      project.status === ProjectStatus.TERMINATED ||
      project.status === ProjectStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Cannot post updates: Project is in terminal status "${project.status}".`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let blockerStatus: string | null = null;

      if (dto.update_type === ProjectUpdateType.BLOCKER) {
        if (project.status === ProjectStatus.BLOCKED) {
          // Already blocked, but allow posting another blocker note
          blockerStatus = 'OPEN';
        } else {
          if (!project.metadata) project.metadata = {};
          project.metadata.status_before_blocked = project.status;
          project.status = ProjectStatus.BLOCKED;
          blockerStatus = 'OPEN';
          await queryRunner.manager.save(project);
        }
      }

      const update = queryRunner.manager.create(ProjectUpdate, {
        project_id: projectId,
        author_participant_id: participant ? participant.id : null,
        author_user_id: userId,
        update_type: dto.update_type,
        summary: dto.summary,
        details: dto.details || null,
        blocker_status: blockerStatus,
      });

      const saved = await queryRunner.manager.save(update);
      await queryRunner.commitTransaction();
      // BLOCKER_SUBMITTED_NOTIF
      if (dto.update_type === ProjectUpdateType.BLOCKER) {
        try {
          const fullProj = await this.projectRepo.findOne({ where: { id: projectId }, relations: ['challenge'] });
          if (fullProj?.challenge?.district) {
            await this.notifService?.notifyDistrictOfficers(
              fullProj.challenge.district,
              NotificationType.PROJECT_GOVERNANCE,
              `Blocker Reported: ${dto.summary}`,
              `A blocker was reported on project "${fullProj.title}": ${dto.summary}`,
              'PROJECT',
              projectId,
            );
          }
        } catch (e) {
          this.logger.warn(`Failed to send blocker notification: ${e}`);
        }
      }

      return this.updateRepo.findOneOrFail({
        where: { id: saved.id },
        relations: [
          'authorParticipant',
          'authorParticipant.organization',
          'authorUser',
        ],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async reviewBlocker(
    projectId: string,
    updateId: string,
    reviewerId: string,
    dto: BlockerReviewDto,
  ): Promise<ProjectUpdate> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const update = await queryRunner.manager.findOne(ProjectUpdate, {
        where: { id: updateId, project_id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!update) {
        throw new NotFoundException(`Update record with ID "${updateId}" not found.`);
      }

      if (update.update_type !== ProjectUpdateType.BLOCKER) {
        throw new BadRequestException('Only updates of type BLOCKER can be reviewed or resolved.');
      }

      let action = ProjectReviewAction.BLOCKER_REVIEWED;

      if (dto.decision === 'RESOLVE') {
        update.blocker_status = 'RESOLVED';
        action = ProjectReviewAction.BLOCKER_RESOLVED;

        // Check if there are any other OPEN blockers on this project
        const openBlockersCount = await queryRunner.manager.count(ProjectUpdate, {
          where: {
            project_id: projectId,
            update_type: ProjectUpdateType.BLOCKER,
            blocker_status: 'OPEN',
          },
        });

        // Open count includes current update until saved, so if count <= 1, unblock project!
        if (openBlockersCount <= 1) {
          const project = await queryRunner.manager.findOne(Project, {
            where: { id: projectId },
            lock: { mode: 'pessimistic_write' },
          });
          if (project && project.status === ProjectStatus.BLOCKED) {
            project.status =
              (project.metadata?.status_before_blocked as ProjectStatus) ||
              ProjectStatus.ACTIVE;
            await queryRunner.manager.save(project);
          }
        }
      }

      // Create review audit log
      const review = queryRunner.manager.create(ProjectReview, {
        project_id: projectId,
        reviewer_user_id: reviewerId,
        action,
        comments: dto.comments || null,
      });
      const savedReview = await queryRunner.manager.save(review);

      update.resolved_by_review_id = savedReview.id;
      await queryRunner.manager.save(update);

      await queryRunner.commitTransaction();
      // BLOCKER_REVIEWED_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          projectId,
          NotificationType.PROJECT_GOVERNANCE,
          `Blocker ${dto.decision}: ${update.summary}`,
          `The blocker "${update.summary}" was reviewed: ${dto.decision}.`,
          'PROJECT',
          projectId,
        );
      } catch (e) {
        this.logger.warn(`Failed to send blocker review notification: ${e}`);
      }

      return this.updateRepo.findOneOrFail({
        where: { id: update.id },
        relations: [
          'authorParticipant',
          'authorParticipant.organization',
          'authorUser',
          'resolvedByReview',
        ],
      });
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 8. GOVERNMENT GOVERNANCE: COMPLETE, TERMINATE, IMPACT VERIFY
  // =========================================================================

  /**
   * Completes a project.
   * Zero-Milestone Completion Guard:
   * - Must be ACTIVE
   * - milestoneCount > 0
   * - All milestones must be APPROVED
   * - At least 1 deliverable submitted
   * - No open blockers
   */
  async completeProject(
    projectId: string,
    reviewerId: string,
    dto: ProjectCompletionDto,
  ): Promise<Project> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found.`);
      }

      const completableStatuses = [
        ProjectStatus.ACTIVE,
        ProjectStatus.PLANNING,
        ProjectStatus.PROTOTYPE_DEVELOPMENT,
        ProjectStatus.TESTING,
        ProjectStatus.PILOT,
        ProjectStatus.DEPLOYMENT,
      ];
      if (!completableStatuses.includes(project.status)) {
        throw new BadRequestException(
          `Cannot complete project: Current status is "${project.status}". Only active lifecycle projects (PLANNING, PROTOTYPE, TESTING, PILOT, DEPLOYMENT, ACTIVE) can be completed.`,
        );
      }

      // 1. Zero-Milestone Completion Guard: Must have at least 1 milestone
      const milestones = await queryRunner.manager.find(ProjectMilestone, {
        where: { project_id: projectId },
      });

      if (!milestones || milestones.length === 0) {
        throw new BadRequestException(
          'Zero-Milestone Completion Guard: Cannot complete project. Project has 0 milestones defined.',
        );
      }

      // 2. All milestones must be APPROVED
      const nonApprovedMilestones = milestones.filter(
        (m) => m.status !== MilestoneStatus.APPROVED,
      );
      if (nonApprovedMilestones.length > 0) {
        throw new BadRequestException(
          `Cannot complete project: ${nonApprovedMilestones.length} milestone(s) are not APPROVED. All milestones must be APPROVED before project completion.`,
        );
      }

      // 3. Must have at least 1 deliverable
      const deliverableCount = await queryRunner.manager.count(
        ProjectDeliverable,
        {
          where: { project_id: projectId },
        },
      );
      if (deliverableCount === 0) {
        throw new BadRequestException(
          'Cannot complete project: At least one deliverable must be submitted before completion.',
        );
      }

      // 4. No open blockers
      const openBlockers = await queryRunner.manager.count(ProjectUpdate, {
        where: {
          project_id: projectId,
          update_type: ProjectUpdateType.BLOCKER,
          blocker_status: 'OPEN',
        },
      });
      if (openBlockers > 0) {
        throw new BadRequestException(
          'Cannot complete project: Unresolved blockers remain on this project.',
        );
      }

      // 5. Mandatory Contributions Completion Guard: Required contributions must be VERIFIED
      const unverifiedRequiredContribs = await queryRunner.manager.find(
        ProjectContribution,
        {
          where: {
            project_id: projectId,
            is_required: true,
          },
        },
      );

      const nonVerified = unverifiedRequiredContribs.filter(
        (c) => c.status !== ContributionStatus.VERIFIED,
      );

      if (nonVerified.length > 0) {
        throw new BadRequestException(
          `Cannot complete project: ${nonVerified.length} mandatory industry contribution(s) have not been verified (Status must be VERIFIED).`,
        );
      }

      project.status = ProjectStatus.COMPLETED;
      project.actual_completion_date = new Date();
      await queryRunner.manager.save(project);

      // Audit review log
      const review = queryRunner.manager.create(ProjectReview, {
        project_id: projectId,
        reviewer_user_id: reviewerId,
        action: ProjectReviewAction.PROJECT_COMPLETED,
        comments: dto.comments || null,
        feedback: dto.feedback || null,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      // PROJECT_COMPLETED_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          projectId,
          NotificationType.PROJECT_GOVERNANCE,
          `Project Completed: ${project.title}`,
          `Project "${project.title}" has been marked as COMPLETED by government reviewer.`,
          'PROJECT',
          projectId,
        );

        const fullProj = await this.projectRepo.findOne({
          where: { id: projectId },
          relations: ['challenge'],
        });
        if (fullProj?.challenge?.submitted_by) {
          await this.notifService?.notifyUser(
            fullProj.challenge.submitted_by,
            NotificationType.PROJECT_GOVERNANCE,
            `Project Completed: ${project.title}`,
            `The collaborative project addressing your reported problem "${fullProj.challenge.title}" has been successfully completed! Impact assessment is now underway.`,
            'PROJECT',
            projectId,
            fullProj.challenge.district_id,
            fullProj.challenge.district,
          );
        }
      } catch (e) {
        this.logger.warn(`Failed to send project completed notification: ${e}`);
      }
      return this.getProjectById(projectId, reviewerId, UserRole.GOVERNMENT_OFFICER);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verifies impact after completion (COMPLETED -> IMPACT_VERIFIED).
   * Clean handoff point without Phase 8 overreach.
   */
  async verifyImpact(
    projectId: string,
    reviewerId: string,
    dto: ImpactVerificationDto,
  ): Promise<Project> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found.`);
      }

      if (project.status !== ProjectStatus.COMPLETED) {
        throw new BadRequestException(
          `Cannot verify impact: Project status is "${project.status}". Only COMPLETED projects can transition to IMPACT_VERIFIED.`,
        );
      }

      const unverifiedRequiredContribs = await queryRunner.manager.find(
        ProjectContribution,
        {
          where: {
            project_id: projectId,
            is_required: true,
          },
        },
      );

      const nonVerified = unverifiedRequiredContribs.filter(
        (c) => c.status !== ContributionStatus.VERIFIED,
      );

      if (nonVerified.length > 0) {
        throw new BadRequestException(
          `Cannot verify impact: ${nonVerified.length} mandatory industry contribution(s) have not been verified.`,
        );
      }

      project.status = ProjectStatus.IMPACT_VERIFIED;
      await queryRunner.manager.save(project);

      const review = queryRunner.manager.create(ProjectReview, {
        project_id: projectId,
        reviewer_user_id: reviewerId,
        action: ProjectReviewAction.IMPACT_VERIFIED,
        comments: dto.comments || null,
        feedback: dto.feedback || null,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();

      // IMPACT_VERIFIED_NOTIF
      try {
        await this.notifService?.notifyConsortium(
          projectId,
          NotificationType.IMPACT_UPDATE,
          `Impact Verified: ${project.title}`,
          `Impact assessment for project "${project.title}" has been verified by government reviewer. Project is now marked IMPACT_VERIFIED.`,
          'PROJECT',
          projectId,
        );

        const fullProj = await this.projectRepo.findOne({
          where: { id: projectId },
          relations: ['challenge'],
        });
        if (fullProj?.challenge?.submitted_by) {
          await this.notifService?.notifyUser(
            fullProj.challenge.submitted_by,
            NotificationType.IMPACT_UPDATE,
            `Problem Resolved & Impact Verified: ${project.title}`,
            `The real-world outcomes and impact for your reported problem "${fullProj.challenge.title}" have been officially verified by government authorities. Thank you for reporting!`,
            'PROJECT',
            projectId,
            fullProj.challenge.district_id,
            fullProj.challenge.district,
          );
        }
      } catch (notifErr: any) {
        this.logger.warn(`Failed to dispatch impact verified notification: ${notifErr.message}`);
      }

      return this.getProjectById(projectId, reviewerId, UserRole.GOVERNMENT_OFFICER);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Terminates a project.
   * Reason is strictly mandatory.
   * Irreversible terminal state.
   */
  async terminateProject(
    projectId: string,
    reviewerId: string,
    dto: ProjectTerminationDto,
  ): Promise<Project> {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException(
        'A valid, non-empty reason is mandatory for project termination.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const project = await queryRunner.manager.findOne(Project, {
        where: { id: projectId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID "${projectId}" not found.`);
      }

      if (
        project.status === ProjectStatus.COMPLETED ||
        project.status === ProjectStatus.IMPACT_VERIFIED ||
        project.status === ProjectStatus.TERMINATED
      ) {
        throw new BadRequestException(
          `Cannot terminate project: Project is already in status "${project.status}".`,
        );
      }

      project.status = ProjectStatus.TERMINATED;
      await queryRunner.manager.save(project);

      const review = queryRunner.manager.create(ProjectReview, {
        project_id: projectId,
        reviewer_user_id: reviewerId,
        action: ProjectReviewAction.PROJECT_TERMINATED,
        comments: `Reason: ${dto.reason}${dto.comments ? ` | Notes: ${dto.comments}` : ''}`,
      });
      await queryRunner.manager.save(review);

      await queryRunner.commitTransaction();
      return this.getProjectById(projectId, reviewerId, UserRole.GOVERNMENT_OFFICER);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // =========================================================================
  // 9. REVIEWER QUEUE & GOVERNANCE DASHBOARD
  // =========================================================================

  async getReviewerProjects(statusFilter?: ProjectStatus): Promise<any[]> {
    const qb = this.projectRepo
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.challenge', 'challenge')
      .leftJoinAndSelect('project.participants', 'participants')
      .leftJoinAndSelect('participants.organization', 'organization')
      .leftJoinAndSelect('project.milestones', 'milestones')
      .leftJoinAndSelect('project.updates', 'updates')
      .leftJoinAndSelect('project.deliverables', 'deliverables')
      .leftJoinAndSelect('project.reviews', 'reviews')
      .orderBy('project.updated_at', 'DESC');

    if (statusFilter) {
      qb.andWhere('project.status = :status', { status: statusFilter });
    }

    const projects = await qb.getMany();

    return projects.map((p) => {
      const pendingKickoff = p.status === ProjectStatus.KICKOFF_PENDING;
      const reviewRequestedMilestones = (p.milestones || []).filter(
        (m) => m.status === MilestoneStatus.REVIEW_REQUESTED,
      );
      const openBlockers = (p.updates || []).filter(
        (u) =>
          u.update_type === ProjectUpdateType.BLOCKER &&
          u.blocker_status === 'OPEN',
      );
      const totalMilestones = (p.milestones || []).length;
      const approvedMilestones = (p.milestones || []).filter(
        (m) => m.status === MilestoneStatus.APPROVED,
      ).length;

      return {
        ...p,
        governanceSummary: {
          pendingKickoff,
          reviewRequestedMilestonesCount: reviewRequestedMilestones.length,
          openBlockersCount: openBlockers.length,
          totalMilestones,
          approvedMilestones,
          deliverablesCount: (p.deliverables || []).length,
          isBlocked: p.status === ProjectStatus.BLOCKED,
        },
      };
    });
  }

  // =========================================================================
  // MODULE A: ACADEMIC COLLABORATION (SIH PHASE 9)
  // =========================================================================

  /**
   * Retrieves academic team members for a project.
   * Access: Authenticated consortium members and authorized government access only.
   */
  async getAcademicMembers(
    projectId: string,
    userId: string,
    userRole?: string,
  ): Promise<ProjectAcademicMember[]> {
    const isGovOrAdmin = this.isGovernmentOrAdmin(userRole);
    if (!isGovOrAdmin) {
      const participant = await this.getParticipantForUser(projectId, userId);
      if (!participant) {
        throw new ForbiddenException(
          'Access denied: Only authenticated consortium members and authorized government reviewers can view academic team details.',
        );
      }
    }

    return this.acadMemberRepo.find({
      where: { project_id: projectId },
      relations: ['user', 'organization'],
      order: { joined_at: 'ASC' },
    });
  }

  /**
   * Adds an academic team member (Student, Faculty Mentor, or Academic Coordinator).
   * Strict Security Chain:
   * 1. Project -> Participating HEI (organization_type === 'INSTITUTION').
   * 2. Target user must have an active membership in that exact participating HEI.
   * 3. Caller must be an authorized HEI admin, project lead, or platform admin.
   */
  async addAcademicMember(
    projectId: string,
    callerUserId: string,
    callerRole: string | undefined,
    dto: CreateAcademicMemberDto,
  ): Promise<ProjectAcademicMember> {
    const project = await this.ensureProject(projectId);

    // 1. Verify participating organization in this project
    const participant = await this.participantRepo.findOne({
      where: { project_id: projectId, organization_id: dto.organizationId },
      relations: ['organization'],
    });

    if (!participant) {
      throw new BadRequestException(
        'Organization is not a participating organization in this project.',
      );
    }

    // 2. Verify organization is an appropriate HEI
    if (participant.organization?.organization_type !== OrganizationType.INSTITUTION) {
      throw new BadRequestException(
        'Academic members can only be constituted from participating Higher Education Institutions (HEIs).',
      );
    }

    // 3. Verify caller authorization (Platform admin, gov, consortium lead, or HEI admin)
    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const callerParticipant = await this.getParticipantForUser(projectId, callerUserId);
      const isLead = callerParticipant && this.isLeadRole(callerParticipant.participant_role);
      const isOrgAdmin = await this.memberRepo.findOne({
        where: {
          user_id: callerUserId,
          organization_id: dto.organizationId,
          membership_status: MembershipStatus.ACTIVE,
        },
      });

      if (!isLead && (!isOrgAdmin || isOrgAdmin.organization_role !== 'ADMIN')) {
        throw new ForbiddenException(
          'Only authorized HEI administrators or the Consortium Lead can add academic team members.',
        );
      }
    }

    // 4. Verify candidate user has an ACTIVE membership in that exact participating HEI
    const candidateMembership = await this.memberRepo.findOne({
      where: {
        user_id: dto.userId,
        organization_id: dto.organizationId,
        membership_status: MembershipStatus.ACTIVE,
      },
      relations: ['user'],
    });

    if (!candidateMembership) {
      throw new BadRequestException(
        'Candidate user does not have an active membership in the specified participating HEI.',
      );
    }

    // 5. Prevent duplicate assignment
    const existing = await this.acadMemberRepo.findOne({
      where: { project_id: projectId, user_id: dto.userId },
    });

    if (existing) {
      throw new BadRequestException(
        'This user is already an assigned academic team member of this project.',
      );
    }

    // 6. Create academic member
    const member = this.acadMemberRepo.create({
      project_id: projectId,
      user_id: dto.userId,
      organization_id: dto.organizationId,
      role: dto.role,
      department: dto.department || null,
      specialization: dto.specialization || null,
      status: AcademicMemberStatus.ACTIVE,
      joined_at: new Date(),
    });

    const saved = await this.acadMemberRepo.save(member);

    // Notify user
    try {
      await this.notifService.notifyUser(
        dto.userId,
        NotificationType.PROJECT_GOVERNANCE,
        `Assigned to Project Academic Team: ${project.title}`,
        `You have been assigned as a ${dto.role.replace('_', ' ')} in project "${project.title}".`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch academic member notification: ${e}`);
    }

    return this.acadMemberRepo.findOne({
      where: { id: saved.id },
      relations: ['user', 'organization'],
    }) as Promise<ProjectAcademicMember>;
  }

  /**
   * Updates an academic team member's department, specialization, or status.
   */
  async updateAcademicMember(
    projectId: string,
    memberId: string,
    callerUserId: string,
    callerRole: string | undefined,
    dto: UpdateAcademicMemberDto,
  ): Promise<ProjectAcademicMember> {
    const member = await this.acadMemberRepo.findOne({
      where: { id: memberId, project_id: projectId },
    });

    if (!member) {
      throw new NotFoundException(`Academic member with ID "${memberId}" not found in project.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const callerParticipant = await this.getParticipantForUser(projectId, callerUserId);
      const isLead = callerParticipant && this.isLeadRole(callerParticipant.participant_role);
      const isOrgAdmin = await this.memberRepo.findOne({
        where: {
          user_id: callerUserId,
          organization_id: member.organization_id,
          membership_status: MembershipStatus.ACTIVE,
        },
      });

      if (!isLead && (!isOrgAdmin || isOrgAdmin.organization_role !== 'ADMIN')) {
        throw new ForbiddenException(
          'Unauthorized: Only HEI administrators or Consortium Lead can modify academic team members.',
        );
      }
    }

    if (dto.role) member.role = dto.role;
    if (dto.department !== undefined) member.department = dto.department || null;
    if (dto.specialization !== undefined) member.specialization = dto.specialization || null;
    if (dto.status) member.status = dto.status;

    await this.acadMemberRepo.save(member);

    return this.acadMemberRepo.findOne({
      where: { id: member.id },
      relations: ['user', 'organization'],
    }) as Promise<ProjectAcademicMember>;
  }

  /**
   * Removes an academic member from the project.
   */
  async removeAcademicMember(
    projectId: string,
    memberId: string,
    callerUserId: string,
    callerRole: string | undefined,
  ): Promise<void> {
    const member = await this.acadMemberRepo.findOne({
      where: { id: memberId, project_id: projectId },
    });

    if (!member) {
      throw new NotFoundException(`Academic member with ID "${memberId}" not found in project.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const callerParticipant = await this.getParticipantForUser(projectId, callerUserId);
      const isLead = callerParticipant && this.isLeadRole(callerParticipant.participant_role);
      const isOrgAdmin = await this.memberRepo.findOne({
        where: {
          user_id: callerUserId,
          organization_id: member.organization_id,
          membership_status: MembershipStatus.ACTIVE,
        },
      });

      if (!isLead && (!isOrgAdmin || isOrgAdmin.organization_role !== 'ADMIN')) {
        throw new ForbiddenException(
          'Unauthorized: Only HEI administrators or Consortium Lead can remove academic team members.',
        );
      }
    }

    await this.acadMemberRepo.remove(member);
  }

  // =========================================================================
  // MODULE B: INDUSTRY & ECOSYSTEM CONTRIBUTIONS (SIH PHASE 9)
  // =========================================================================

  /**
   * Retrieves contributions for a project respecting controlled consortium visibility.
   */
  async getContributions(
    projectId: string,
    callerUserId?: string,
    callerRole?: string,
  ): Promise<ProjectContribution[]> {
    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    const callerParticipant = callerUserId
      ? await this.getParticipantForUser(projectId, callerUserId)
      : null;
    const isLead = callerParticipant && this.isLeadRole(callerParticipant.participant_role);

    const qb = this.contribRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.participant', 'p')
      .leftJoinAndSelect('p.organization', 'org')
      .leftJoinAndSelect('c.verifiedBy', 'vb')
      .where('c.project_id = :projectId', { projectId })
      .orderBy('c.created_at', 'DESC');

    // Visibility filtering
    if (!isGovOrAdmin && !isLead) {
      if (callerParticipant) {
        // Participant sees own contributions + consortium-visible
        qb.andWhere(
          '(c.participant_id = :partId OR c.visibility = :consortiumVis)',
          {
            partId: callerParticipant.id,
            consortiumVis: ContributionVisibility.CONSORTIUM,
          },
        );
      } else {
        // Public / non-member sees only consortium-visible
        qb.andWhere('c.visibility = :consortiumVis', {
          consortiumVis: ContributionVisibility.CONSORTIUM,
        });
      }
    }

    return qb.getMany();
  }

  /**
   * Creates a structured ecosystem contribution.
   */
  async createContribution(
    projectId: string,
    callerUserId: string,
    callerRole: string | undefined,
    dto: CreateProjectContributionDto,
  ): Promise<ProjectContribution> {
    const project = await this.ensureProject(projectId);
    const participant = await this.getParticipantForUser(projectId, callerUserId);

    if (!participant && !this.isGovernmentOrAdmin(callerRole)) {
      throw new ForbiddenException(
        'Only participating consortium organizations can record project contributions.',
      );
    }

    if (!participant) {
      throw new BadRequestException('Caller is not linked to a project participant.');
    }

    const contrib = this.contribRepo.create({
      project_id: projectId,
      participant_id: participant.id,
      contribution_type: dto.contributionType,
      title: dto.title,
      description: dto.description,
      status: ContributionStatus.PROPOSED,
      visibility: dto.visibility || ContributionVisibility.CONSORTIUM,
      value: dto.value !== undefined ? dto.value : null,
      currency: dto.currency || 'INR',
      evidence_url: dto.evidenceUrl || null,
      transfer_details: dto.transferDetails || null,
      is_required: dto.isRequired !== undefined ? dto.isRequired : false,
    });

    const saved = await this.contribRepo.save(contrib);

    // Notify project lead and district reviewers
    try {
      if (project.challenge?.district) {
        await this.notifService.notifyDistrictOfficers(
          project.challenge.district,
          NotificationType.CONTRIBUTION_UPDATE,
          `New Project Contribution: ${dto.title}`,
          `A new ${dto.contributionType.replace('_', ' ')} contribution has been proposed for project "${project.title}".`,
          'PROJECT',
          projectId,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to notify on contribution: ${e}`);
    }

    return this.contribRepo.findOne({
      where: { id: saved.id },
      relations: ['participant', 'participant.organization'],
    }) as Promise<ProjectContribution>;
  }

  /**
   * Updates an existing contribution by the contributing organization.
   */
  async updateContribution(
    projectId: string,
    contribId: string,
    callerUserId: string,
    callerRole: string | undefined,
    dto: UpdateProjectContributionDto,
  ): Promise<ProjectContribution> {
    const contrib = await this.contribRepo.findOne({
      where: { id: contribId, project_id: projectId },
      relations: ['participant'],
    });

    if (!contrib) {
      throw new NotFoundException(`Contribution with ID "${contribId}" not found in project.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const callerParticipant = await this.getParticipantForUser(projectId, callerUserId);
      if (!callerParticipant || callerParticipant.id !== contrib.participant_id) {
        throw new ForbiddenException(
          'Organizations can only update their own project contributions.',
        );
      }

      if (contrib.status === ContributionStatus.VERIFIED) {
        throw new BadRequestException(
          'Verified contributions cannot be edited by the contributing organization.',
        );
      }
    }

    if (dto.title) contrib.title = dto.title;
    if (dto.description) contrib.description = dto.description;
    if (dto.visibility) contrib.visibility = dto.visibility;
    if (dto.value !== undefined) contrib.value = dto.value;
    if (dto.currency) contrib.currency = dto.currency;
    if (dto.evidenceUrl !== undefined) contrib.evidence_url = dto.evidenceUrl;
    if (dto.transferDetails) contrib.transfer_details = dto.transferDetails;

    return this.contribRepo.save(contrib);
  }

  /**
   * Deletes a proposed contribution.
   */
  async deleteContribution(
    projectId: string,
    contribId: string,
    callerUserId: string,
    callerRole: string | undefined,
  ): Promise<void> {
    const contrib = await this.contribRepo.findOne({
      where: { id: contribId, project_id: projectId },
    });

    if (!contrib) {
      throw new NotFoundException(`Contribution with ID "${contribId}" not found.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const callerParticipant = await this.getParticipantForUser(projectId, callerUserId);
      if (!callerParticipant || callerParticipant.id !== contrib.participant_id) {
        throw new ForbiddenException('You can only delete your own contributions.');
      }

      if (contrib.status === ContributionStatus.VERIFIED) {
        throw new BadRequestException('Cannot delete a verified contribution.');
      }
    }

    await this.contribRepo.remove(contrib);
  }

  /**
   * Government Review & Verification of Contributions.
   * Invariant 9: Non-blocking! Does not affect project state machine.
   */
  async verifyContribution(
    contribId: string,
    reviewerId: string,
    reviewerRole: string,
    dto: VerifyContributionDto,
  ): Promise<ProjectContribution> {
    if (!this.isGovernmentOrAdmin(reviewerRole)) {
      throw new ForbiddenException(
        'Access denied: Only authorized government reviewers can verify contributions.',
      );
    }

    const contrib = await this.contribRepo.findOne({
      where: { id: contribId },
      relations: ['project', 'participant'],
    });

    if (!contrib) {
      throw new NotFoundException(`Contribution with ID "${contribId}" not found.`);
    }

    contrib.status = dto.decision;
    contrib.verification_notes = dto.verificationNotes;
    contrib.verified_by_id = reviewerId;
    contrib.verified_at = new Date();

    const saved = await this.contribRepo.save(contrib);

    // Notify consortium participants
    try {
      await this.notifService.notifyConsortium(
        contrib.project_id,
        NotificationType.CONTRIBUTION_UPDATE,
        `Contribution ${dto.decision}: ${contrib.title}`,
        `Government review on contribution "${contrib.title}": ${dto.decision}. Notes: ${dto.verificationNotes}`,
        'PROJECT',
        contrib.project_id,
      );
    } catch (e) {
      this.logger.warn(`Failed to send contribution verification notification: ${e}`);
    }

    return saved;
  }

  // =========================================================================
  // MODULE C: INNOVATION & IP OUTCOMES TRACKING (PHASE 9.1)
  // =========================================================================

  async getInnovationOutcomes(
    projectId: string,
    callerUserId?: string,
    callerRole?: string,
  ): Promise<ProjectInnovationOutcome[]> {
    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin && callerUserId) {
      const participant = await this.getParticipantForUser(projectId, callerUserId);
      if (!participant) {
        throw new ForbiddenException(
          'Access denied: Only consortium participants and government reviewers can view innovation outcomes.',
        );
      }
    }

    return this.outcomeRepo.find({
      where: { project_id: projectId },
      relations: ['organization', 'createdByUser', 'verifiedByUser'],
      order: { created_at: 'DESC' },
    });
  }

  async createInnovationOutcome(
    projectId: string,
    callerUserId: string,
    callerRole: string,
    dto: CreateInnovationOutcomeDto,
  ): Promise<ProjectInnovationOutcome> {
    if (callerRole === UserRole.STUDENT) {
      throw new ForbiddenException(
        'Students are not authorized to independently register or verify patent filings, startups, or technology transfers.',
      );
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    let participant: ProjectParticipant | null = null;
    if (!isGovOrAdmin) {
      participant = await this.getParticipantForUser(projectId, callerUserId);
      if (!participant) {
        throw new ForbiddenException(
          'Only consortium participants or government reviewers can record innovation outcomes.',
        );
      }
    }

    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ['challenge'],
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${projectId}" not found.`);
    }

    // Prevent duplicate innovation outcomes
    const duplicateQuery: any = {
      project_id: projectId,
      outcome_type: dto.outcome_type,
    };
    if (dto.reference_number && dto.reference_number.trim().length > 0) {
      duplicateQuery.reference_number = dto.reference_number.trim();
    } else {
      duplicateQuery.title = dto.title.trim();
    }

    const existing = await this.outcomeRepo.findOne({
      where: duplicateQuery,
    });
    if (existing) {
      throw new ConflictException(
        `An innovation outcome of type "${dto.outcome_type}" with ${
          dto.reference_number
            ? `reference number "${dto.reference_number}"`
            : `title "${dto.title}"`
        } already exists for this project.`,
      );
    }

    let targetOrgId = dto.organization_id || participant?.organization_id || null;
    if (
      dto.outcome_type === InnovationOutcomeType.TECHNOLOGY_TRANSFER &&
      dto.metadata?.receiving_organization_id
    ) {
      targetOrgId = dto.metadata.receiving_organization_id;
    }

    if (targetOrgId) {
      const orgExists = await this.orgRepo.findOne({ where: { id: targetOrgId } });
      if (!orgExists && dto.organization_id) {
        throw new NotFoundException(
          `Referenced organization with ID "${targetOrgId}" not found.`,
        );
      }
    }

    if (dto.metadata?.evidence_document_id || dto.metadata?.evidenceDeliverableId) {
      const delivId =
        dto.metadata.evidence_document_id || dto.metadata.evidenceDeliverableId;
      const deliverable = await this.deliverableRepo.findOne({
        where: { id: delivId, project_id: projectId },
      });
      if (deliverable) {
        dto.metadata.evidence_deliverable_title = deliverable.title;
        dto.metadata.evidence_document_type = deliverable.document_type;
      }
    }

    const outcome = this.outcomeRepo.create({
      project_id: projectId,
      outcome_type: dto.outcome_type,
      title: dto.title,
      description: dto.description,
      reference_number: dto.reference_number ? dto.reference_number.trim() : null,
      organization_id: targetOrgId,
      status:
        isGovOrAdmin && dto.status ? dto.status : InnovationOutcomeStatus.PROPOSED,
      created_by_user_id: callerUserId,
      metadata: dto.metadata || null,
    });

    const saved = await this.outcomeRepo.save(outcome);

    try {
      let notifTitle = `Innovation Outcome Proposed: ${dto.title}`;
      if (
        dto.outcome_type === InnovationOutcomeType.PATENT ||
        dto.outcome_type === InnovationOutcomeType.PATENT_APPLICATION
      ) {
        notifTitle = `Patent Filing Recorded: ${dto.title}`;
      } else if (dto.outcome_type === InnovationOutcomeType.STARTUP_CREATED) {
        notifTitle = `Startup Formed from Project: ${dto.title}`;
      } else if (dto.outcome_type === InnovationOutcomeType.TECHNOLOGY_TRANSFER) {
        notifTitle = `Technology Transfer Executed: ${dto.title}`;
      }

      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        notifTitle,
        `An innovation outcome (${dto.outcome_type}) "${dto.title}" has been recorded for project "${project.title}".`,
        'INNOVATION_OUTCOME',
        saved.id,
      );

      if (project.challenge?.district) {
        await this.notifService?.notifyDistrictOfficers(
          project.challenge.district,
          NotificationType.PROJECT_GOVERNANCE,
          notifTitle,
          `An innovation outcome (${dto.outcome_type}) "${dto.title}" has been recorded for project "${project.title}".`,
          'INNOVATION_OUTCOME',
          saved.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch innovation outcome notification: ${e}`);
    }

    return this.outcomeRepo.findOneOrFail({
      where: { id: saved.id },
      relations: ['organization', 'createdByUser'],
    });
  }

  async updateInnovationOutcome(
    projectId: string,
    outcomeId: string,
    callerUserId: string,
    callerRole: string,
    dto: UpdateInnovationOutcomeDto,
  ): Promise<ProjectInnovationOutcome> {
    const outcome = await this.outcomeRepo.findOne({
      where: { id: outcomeId, project_id: projectId },
    });
    if (!outcome) {
      throw new NotFoundException(`Innovation outcome "${outcomeId}" not found.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const participant = await this.getParticipantForUser(projectId, callerUserId);
      if (!participant) {
        throw new ForbiddenException('You do not have access to this project.');
      }
      if (outcome.status === InnovationOutcomeStatus.VERIFIED) {
        throw new BadRequestException('Cannot edit a verified innovation outcome.');
      }
      if (outcome.created_by_user_id !== callerUserId && outcome.organization_id !== participant.organization_id) {
        throw new ForbiddenException('You can only edit innovation outcomes created by your organization.');
      }
    }

    if (dto.outcome_type !== undefined) outcome.outcome_type = dto.outcome_type;
    if (dto.title !== undefined) outcome.title = dto.title;
    if (dto.description !== undefined) outcome.description = dto.description;
    if (dto.reference_number !== undefined) outcome.reference_number = dto.reference_number;
    if (dto.organization_id !== undefined && isGovOrAdmin) outcome.organization_id = dto.organization_id;
    if (dto.status !== undefined && isGovOrAdmin) outcome.status = dto.status;
    if (dto.metadata !== undefined) outcome.metadata = dto.metadata;

    return this.outcomeRepo.save(outcome);
  }

  async deleteInnovationOutcome(
    projectId: string,
    outcomeId: string,
    callerUserId: string,
    callerRole: string,
  ): Promise<void> {
    const outcome = await this.outcomeRepo.findOne({
      where: { id: outcomeId, project_id: projectId },
    });
    if (!outcome) {
      throw new NotFoundException(`Innovation outcome "${outcomeId}" not found.`);
    }

    const isGovOrAdmin = this.isGovernmentOrAdmin(callerRole);
    if (!isGovOrAdmin) {
      const participant = await this.getParticipantForUser(projectId, callerUserId);
      if (!participant) {
        throw new ForbiddenException('You do not have access to this project.');
      }
      if (outcome.status === InnovationOutcomeStatus.VERIFIED) {
        throw new BadRequestException('Cannot delete a verified innovation outcome.');
      }
      if (outcome.created_by_user_id !== callerUserId && outcome.organization_id !== participant.organization_id) {
        throw new ForbiddenException('You can only delete innovation outcomes created by your organization.');
      }
    }

    await this.outcomeRepo.remove(outcome);
  }

  async verifyInnovationOutcome(
    projectId: string,
    outcomeId: string,
    reviewerId: string,
    reviewerRole: string,
    dto: VerifyInnovationOutcomeDto,
  ): Promise<ProjectInnovationOutcome> {
    if (!this.isGovernmentOrAdmin(reviewerRole)) {
      throw new ForbiddenException('Only authorized government reviewers can verify innovation outcomes.');
    }

    const outcome = await this.outcomeRepo.findOne({
      where: { id: outcomeId, project_id: projectId },
      relations: ['project'],
    });
    if (!outcome) {
      throw new NotFoundException(`Innovation outcome "${outcomeId}" not found.`);
    }

    outcome.status = dto.status;
    outcome.verification_notes = dto.verification_notes || null;
    if (dto.reference_number) outcome.reference_number = dto.reference_number;
    outcome.verified_by_user_id = reviewerId;
    outcome.verified_at = new Date();

    const saved = await this.outcomeRepo.save(outcome);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Innovation Outcome ${dto.status}: ${outcome.title}`,
        `The innovation outcome "${outcome.title}" (${outcome.outcome_type}) has been reviewed: ${dto.status}.`,
        'INNOVATION_OUTCOME',
        `${outcome.id}_${dto.status}`,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch innovation outcome verification notification: ${e}`);
    }

    return saved;
  }

  async getReviewerInnovationOutcomes(
    statusFilter?: InnovationOutcomeStatus,
  ): Promise<ProjectInnovationOutcome[]> {
    const qb = this.outcomeRepo
      .createQueryBuilder('outcome')
      .leftJoinAndSelect('outcome.project', 'project')
      .leftJoinAndSelect('outcome.organization', 'organization')
      .leftJoinAndSelect('outcome.createdByUser', 'createdByUser')
      .leftJoinAndSelect('outcome.verifiedByUser', 'verifiedByUser')
      .orderBy('outcome.created_at', 'DESC');

    if (statusFilter) {
      qb.where('outcome.status = :status', { status: statusFilter });
    }

    return qb.getMany();
  }

  async recordIpAssessment(
    projectId: string,
    userId: string,
    userRole: string,
    dto: RecordIpAssessmentDto,
  ) {
    if (userRole === UserRole.STUDENT) {
      throw new ForbiddenException(
        'Students are not authorized to independently perform or record IP assessments.',
      );
    }

    const { project } = await this.ensureLeadOrGov(projectId, userId, userRole);
    if (!project.metadata) project.metadata = {};

    let deliverableTitle: string | null = null;
    if (dto.evidence_deliverable_id) {
      const deliv = await this.deliverableRepo.findOne({
        where: { id: dto.evidence_deliverable_id, project_id: projectId },
      });
      if (deliv) {
        deliverableTitle = deliv.title;
      }
    }

    const ipAssessmentRecord = {
      ip_status: dto.ip_status,
      status: dto.ip_status,
      assessment_date:
        dto.assessment_date || new Date().toISOString().split('T')[0],
      assessor_name: dto.assessor_name,
      assessor_role: dto.assessor_role || userRole,
      assessor_organization_id: dto.assessor_organization_id || null,
      protection_type:
        dto.protection_type ||
        (dto.ip_status === ProjectIpAssessmentStatus.PATENT_APPLICATION_FILED ||
        dto.ip_status === ProjectIpAssessmentStatus.PATENT_GRANTED
          ? 'PATENT'
          : dto.ip_status === ProjectIpAssessmentStatus.CONFIDENTIAL
          ? 'CONFIDENTIAL_KNOW_HOW'
          : 'NONE'),
      reference_number: dto.reference_number || null,
      assessment_notes: dto.assessment_notes,
      is_confidential:
        dto.is_confidential ??
        dto.ip_status === ProjectIpAssessmentStatus.CONFIDENTIAL,
      commercialization_path: dto.commercialization_path || null,
      evidence_deliverable_id: dto.evidence_deliverable_id || null,
      evidence_deliverable_title: deliverableTitle,
      metadata: dto.metadata || {},
      assessed_by_user_id: userId,
      recorded_at: new Date().toISOString(),
    };

    project.metadata.ip_assessment = ipAssessmentRecord;
    if (!project.metadata.ip_assessment_history) {
      project.metadata.ip_assessment_history = [];
    }
    project.metadata.ip_assessment_history.push(ipAssessmentRecord);

    await this.projectRepo.save(project);

    // Also record progress update in project updates log
    const update = this.updateRepo.create({
      project_id: projectId,
      author_user_id: userId,
      update_type: ProjectUpdateType.PROGRESS,
      summary: `IP Assessment: ${dto.ip_status.replace(/_/g, ' ')}`,
      details: `Assessor: ${dto.assessor_name} (${dto.assessor_role || userRole}). Protection: ${ipAssessmentRecord.protection_type}. Notes: ${dto.assessment_notes}`,
    });
    await this.updateRepo.save(update);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `IP Assessment Recorded: ${dto.ip_status.replace(/_/g, ' ')}`,
        `Project "${project.title}" IP assessment recorded: ${dto.ip_status}. Notes: ${dto.assessment_notes}`,
        'IP_ASSESSMENT',
        `${projectId}_${dto.ip_status}`,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch IP assessment notification: ${e}`);
    }

    return {
      ipAssessment: ipAssessmentRecord,
      lifecycleSummary: await this.getProjectLifecycleSummary(projectId, userId, userRole),
    };
  }

  async getIpAssessment(projectId: string, userId: string, userRole: string) {
    const { project } = await this.ensureAccess(projectId, userId, userRole);
    return project.metadata?.ip_assessment || null;
  }

  // =========================================================================
  // 12. PHASE 4: PROJECT LIFECYCLE (PROTOTYPE, TEST, PILOT, DEPLOYMENT)
  // =========================================================================

  async getProjectLifecycleSummary(
    projectId: string,
    userId: string,
    userRole: string,
  ) {
    const { project } = await this.ensureAccess(projectId, userId, userRole);

    const milestones = await this.milestoneRepo.find({
      where: { project_id: projectId },
      order: { order_index: 'ASC', created_at: 'ASC' },
    });

    const tasks = await this.taskRepo
      .createQueryBuilder('task')
      .innerJoin('task.milestone', 'milestone')
      .where('milestone.project_id = :projectId', { projectId })
      .getMany();

    const deliverables = await this.deliverableRepo.find({
      where: { project_id: projectId },
    });

    const updates = await this.updateRepo.find({
      where: { project_id: projectId },
    });

    const contributions = await this.contribRepo.find({
      where: { project_id: projectId },
    });

    const meta = project.metadata || {};
    const prototype = meta.prototype || null;
    const testRecords: any[] = meta.test_records || [];
    const pilot = meta.pilot_deployment || null;
    const deployment = meta.final_deployment || null;
    const transitions: any[] = meta.lifecycle_transitions || [];

    const totalMilestones = milestones.length;
    const approvedMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.APPROVED,
    ).length;
    const inProgressMilestones = milestones.filter(
      (m) => m.status === MilestoneStatus.IN_PROGRESS,
    ).length;
    const now = new Date();
    const overdueMilestones = milestones.filter(
      (m) =>
        m.due_date &&
        new Date(m.due_date) < now &&
        m.status !== MilestoneStatus.APPROVED,
    ).length;

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;

    const openBlockers = updates.filter(
      (u) =>
        u.update_type === ProjectUpdateType.BLOCKER &&
        u.blocker_status === 'OPEN',
    ).length;

    const deliverablesByType: Record<string, number> = {};
    for (const d of deliverables) {
      deliverablesByType[d.document_type] =
        (deliverablesByType[d.document_type] || 0) + 1;
    }

    const passedTests = testRecords.filter((t) => t.passed === true).length;
    const failedTests = testRecords.filter((t) => t.passed === false).length;

    const requiredContribs = contributions.filter((c) => c.is_required);
    const unverifiedRequiredContribs = requiredContribs.filter(
      (c) => c.status !== ContributionStatus.VERIFIED,
    );

    const hasMilestones = totalMilestones > 0;
    const allMilestonesApproved =
      hasMilestones && approvedMilestones === totalMilestones;
    const hasDeliverable = deliverables.length > 0;
    const hasPrototype =
      !!prototype ||
      (deliverablesByType['PROTOTYPE'] || 0) > 0 ||
      (deliverablesByType['PROTOTYPE_SPEC'] || 0) > 0;
    const hasTestValidation =
      passedTests > 0 || (deliverablesByType['TESTING_REPORT'] || 0) > 0;
    const hasPilotOrDeployment =
      !!pilot ||
      !!deployment ||
      (deliverablesByType['PILOT_REPORT'] || 0) > 0;
    const noOpenBlockers = openBlockers === 0;
    const allRequiredContributionsVerified =
      unverifiedRequiredContribs.length === 0;

    const readyForCompletion =
      hasMilestones &&
      allMilestonesApproved &&
      hasDeliverable &&
      noOpenBlockers &&
      allRequiredContributionsVerified;

    let progressPercentage = 0;
    if (
      project.status === ProjectStatus.COMPLETED ||
      project.status === ProjectStatus.IMPACT_VERIFIED
    ) {
      progressPercentage = 100;
    } else if (project.status === ProjectStatus.DEPLOYMENT) {
      progressPercentage = 85 + (readyForCompletion ? 10 : 0);
    } else if (project.status === ProjectStatus.PILOT) {
      progressPercentage = 65 + (pilot?.feedbackSummary ? 15 : 5);
    } else if (project.status === ProjectStatus.TESTING) {
      progressPercentage = 45 + (passedTests > 0 ? 15 : 5);
    } else if (project.status === ProjectStatus.PROTOTYPE_DEVELOPMENT) {
      progressPercentage = 25 + (hasPrototype ? 15 : 5);
    } else if (
      project.status === ProjectStatus.ACTIVE ||
      project.status === ProjectStatus.PLANNING
    ) {
      const milestoneProg =
        totalMilestones > 0
          ? Math.round((approvedMilestones / totalMilestones) * 20)
          : 10;
      progressPercentage = Math.min(25, 10 + milestoneProg);
    } else {
      progressPercentage = 5;
    }

    let nextRecommendedAction = '';
    if (openBlockers > 0) {
      nextRecommendedAction = `Resolve ${openBlockers} open blocker(s) before proceeding.`;
    } else if (
      project.status === ProjectStatus.INITIATED ||
      project.status === ProjectStatus.PLANNING
    ) {
      nextRecommendedAction =
        'Define milestones and record prototype specifications to begin prototype development.';
    } else if (
      project.status === ProjectStatus.ACTIVE ||
      project.status === ProjectStatus.PROTOTYPE_DEVELOPMENT
    ) {
      if (!hasPrototype) {
        nextRecommendedAction =
          'Record prototype specifications and architecture details.';
      } else {
        nextRecommendedAction =
          'Conduct lab/field validation testing and record test outcomes to transition to Testing stage.';
      }
    } else if (project.status === ProjectStatus.TESTING) {
      if (passedTests === 0) {
        nextRecommendedAction =
          'Execute test cases and record passing validation results.';
      } else {
        nextRecommendedAction =
          'Plan pilot cohort and record pilot deployment parameters to proceed to Pilot stage.';
      }
    } else if (project.status === ProjectStatus.PILOT) {
      if (!pilot?.feedbackSummary && !pilot?.observedImpactMetrics) {
        nextRecommendedAction =
          'Monitor pilot cohort and record observed impact metrics and user feedback.';
      } else {
        nextRecommendedAction =
          'Confirm deployment readiness checklist and record handover plan for Deployment.';
      }
    } else if (project.status === ProjectStatus.DEPLOYMENT) {
      if (!readyForCompletion) {
        if (!allMilestonesApproved) {
          nextRecommendedAction = `Complete and approve all remaining milestones (${
            totalMilestones - approvedMilestones
          } remaining).`;
        } else if (!allRequiredContributionsVerified) {
          nextRecommendedAction = `Verify remaining mandatory industry contributions (${unverifiedRequiredContribs.length} remaining).`;
        } else {
          nextRecommendedAction =
            'Complete deliverables checklist for final project completion.';
        }
      } else {
        nextRecommendedAction =
          'All prerequisites met. Project is ready for final completion review.';
      }
    } else if (project.status === ProjectStatus.COMPLETED) {
      if (!project.metadata?.ip_assessment) {
        nextRecommendedAction =
          'Project completed. Conduct Innovation & IP Assessment to identify patent potential, startup incubation, or technology transfer.';
      } else if (
        project.metadata.ip_assessment.ip_status ===
          ProjectIpAssessmentStatus.POTENTIAL_IP_IDENTIFIED ||
        project.metadata.ip_assessment.ip_status ===
          ProjectIpAssessmentStatus.PATENT_APPLICATION_FILED
      ) {
        nextRecommendedAction =
          'Potential IP identified. Register patent application, startup creation, or technology transfer outcome.';
      } else {
        nextRecommendedAction =
          'Project completed with IP Assessment recorded. Track innovation outcomes and ecosystem deployment.';
      }
    } else {
      nextRecommendedAction = 'Review project progress and updates.';
    }

    const outcomes = await this.outcomeRepo.find({
      where: { project_id: projectId },
      relations: ['organization'],
    });

    return {
      projectId: project.id,
      title: project.title,
      currentStage: project.status,
      progressPercentage,
      milestones: {
        total: totalMilestones,
        approved: approvedMilestones,
        inProgress: inProgressMilestones,
        pending:
          totalMilestones - approvedMilestones - inProgressMilestones,
        overdue: overdueMilestones,
      },
      tasks: {
        total: totalTasks,
        done: doneTasks,
        inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS)
          .length,
        todo: tasks.filter((t) => t.status === TaskStatus.TODO).length,
      },
      deliverables: {
        total: deliverables.length,
        byType: deliverablesByType,
      },
      prototype,
      tests: {
        total: testRecords.length,
        passed: passedTests,
        failed: failedTests,
        records: testRecords,
      },
      pilot,
      deployment,
      blockers: {
        open: openBlockers,
        resolved: updates.filter(
          (u) =>
            u.update_type === ProjectUpdateType.BLOCKER &&
            u.blocker_status === 'RESOLVED',
        ).length,
      },
      completionChecklist: {
        hasMilestones,
        allMilestonesApproved,
        hasDeliverable,
        hasPrototype,
        hasTestValidation,
        hasPilotOrDeployment,
        noOpenBlockers,
        allRequiredContributionsVerified,
        readyForCompletion,
      },
      stageHistory: transitions,
      ipAssessment: project.metadata?.ip_assessment
        ? {
            ...project.metadata.ip_assessment,
            status:
              project.metadata.ip_assessment.status ||
              project.metadata.ip_assessment.ip_status,
          }
        : null,
      innovationOutcomes: {
        total: outcomes.length,
        verified: outcomes.filter(
          (o) => o.status === InnovationOutcomeStatus.VERIFIED,
        ).length,
        patents: outcomes.filter(
          (o) =>
            o.outcome_type === InnovationOutcomeType.PATENT ||
            o.outcome_type === InnovationOutcomeType.PATENT_APPLICATION,
        ).length,
        startups: outcomes.filter(
          (o) => o.outcome_type === InnovationOutcomeType.STARTUP_CREATED,
        ).length,
        technologyTransfers: outcomes.filter(
          (o) => o.outcome_type === InnovationOutcomeType.TECHNOLOGY_TRANSFER,
        ).length,
        records: outcomes,
      },
      nextRecommendedAction,
    };
  }

  async recordPrototype(
    projectId: string,
    userId: string,
    userRole: string,
    dto: RecordPrototypeDto,
  ) {
    const { project } = await this.ensureAccess(projectId, userId, userRole);
    if (!project.metadata) project.metadata = {};

    project.metadata.prototype = {
      description: dto.description,
      version: dto.version || '1.0.0',
      stage: dto.stage || 'working_prototype',
      specifications: dto.specifications || {},
      resourceNeeds: dto.resourceNeeds || [],
      partnerAssignments: dto.partnerAssignments || [],
      evidenceDocumentId: dto.evidenceDocumentId || null,
      notes: dto.notes || '',
      recordedBy: userId,
      recordedAt: new Date().toISOString(),
    };

    if (
      project.status === ProjectStatus.PLANNING ||
      project.status === ProjectStatus.ACTIVE ||
      project.status === ProjectStatus.INITIATED ||
      project.status === ProjectStatus.PROPOSED
    ) {
      if (!project.metadata.lifecycle_transitions) {
        project.metadata.lifecycle_transitions = [];
      }
      project.metadata.lifecycle_transitions.push({
        fromStage: project.status,
        toStage: ProjectStatus.PROTOTYPE_DEVELOPMENT,
        transitionedBy: userId,
        userRole,
        reviewNotes: 'Auto-transitioned on prototype specification recording',
        timestamp: new Date().toISOString(),
      });
      project.status = ProjectStatus.PROTOTYPE_DEVELOPMENT;
    }

    await this.projectRepo.save(project);

    const update = this.updateRepo.create({
      project_id: projectId,
      author_user_id: userId,
      update_type: ProjectUpdateType.PROGRESS,
      summary: `Prototype specification recorded: v${dto.version || '1.0.0'} (${dto.stage || 'working_prototype'})`,
      details: dto.description,
    });
    await this.updateRepo.save(update);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Prototype Specification Logged: ${project.title}`,
        `A prototype specification (v${dto.version || '1.0.0'}) has been recorded.`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch prototype notification: ${e}`);
    }

    return this.getProjectLifecycleSummary(projectId, userId, userRole);
  }

  async recordTestValidation(
    projectId: string,
    userId: string,
    userRole: string,
    dto: RecordTestValidationDto,
  ) {
    const { project } = await this.ensureAccess(projectId, userId, userRole);
    if (!project.metadata) project.metadata = {};
    if (!project.metadata.test_records) project.metadata.test_records = [];

    const testId = randomUUID();
    const record = {
      id: testId,
      testPlan: dto.testPlan,
      testType: dto.testType,
      parameters: dto.parameters || {},
      testerName: dto.testerName,
      testerRole: dto.testerRole || userRole,
      testerOrgId: dto.testerOrgId || null,
      lab: dto.lab || null,
      expectedResult: dto.expectedResult || null,
      observedResults: dto.observedResults,
      passed: dto.passed,
      issuesIdentified: dto.issuesIdentified || [],
      correctiveAction: dto.correctiveAction || null,
      retestRequired: dto.retestRequired || false,
      evidenceDeliverableId: dto.evidenceDeliverableId || null,
      notes: dto.notes || '',
      recordedBy: userId,
      recordedAt: new Date().toISOString(),
    };

    project.metadata.test_records.push(record);

    if (
      project.status === ProjectStatus.PROTOTYPE_DEVELOPMENT ||
      project.status === ProjectStatus.PLANNING ||
      project.status === ProjectStatus.ACTIVE
    ) {
      if (!project.metadata.lifecycle_transitions) {
        project.metadata.lifecycle_transitions = [];
      }
      project.metadata.lifecycle_transitions.push({
        fromStage: project.status,
        toStage: ProjectStatus.TESTING,
        transitionedBy: userId,
        userRole,
        reviewNotes: 'Transitioned to TESTING on recording test validation',
        timestamp: new Date().toISOString(),
      });
      project.status = ProjectStatus.TESTING;
    }

    await this.projectRepo.save(project);

    if (!dto.passed) {
      const blockerUpdate = this.updateRepo.create({
        project_id: projectId,
        author_user_id: userId,
        update_type: ProjectUpdateType.BLOCKER,
        blocker_status: 'OPEN',
        summary: `Testing Failure: ${dto.testType} - ${dto.testPlan}`,
        details: `Test failed: ${dto.observedResults}. Issues: ${(dto.issuesIdentified || []).join(', ')}${
          dto.correctiveAction ? `. Corrective Action: ${dto.correctiveAction}` : ''
        }`,
      });
      await this.updateRepo.save(blockerUpdate);
    } else {
      // Auto-resolve any previous testing failure blockers for this project if all latest tests pass
      const testBlockers = await this.updateRepo.find({
        where: {
          project_id: projectId,
          update_type: ProjectUpdateType.BLOCKER,
          blocker_status: 'OPEN',
        },
      });
      for (const tb of testBlockers) {
        if (tb.summary?.startsWith('Testing Failure:')) {
          tb.blocker_status = 'RESOLVED';
          await this.updateRepo.save(tb);
        }
      }

      const progressUpdate = this.updateRepo.create({
        project_id: projectId,
        author_user_id: userId,
        update_type: ProjectUpdateType.PROGRESS,
        summary: `Test Passed: ${dto.testType} - ${dto.testPlan}`,
        details: `Tester: ${dto.testerName}. Results: ${dto.observedResults}`,
      });
      await this.updateRepo.save(progressUpdate);
    }

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Test Outcome Recorded: ${dto.testType} (${dto.passed ? 'PASSED' : 'FAILED'})`,
        `Test plan "${dto.testPlan}" was executed by ${dto.testerName}: ${dto.passed ? 'PASSED' : 'FAILED'}.`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch test notification: ${e}`);
    }

    return {
      record,
      summary: await this.getProjectLifecycleSummary(
        projectId,
        userId,
        userRole,
      ),
    };
  }

  async recordPilotDeployment(
    projectId: string,
    userId: string,
    userRole: string,
    dto: RecordPilotDeploymentDto,
  ) {
    const { project } = await this.ensureLeadOrGov(projectId, userId, userRole);
    if (!project.metadata) project.metadata = {};

    project.metadata.pilot_deployment = {
      location: dto.location,
      district: dto.district || null,
      implementingOrg: dto.implementingOrg || null,
      durationDays: dto.durationDays || 30,
      startDate: dto.startDate || new Date().toISOString().split('T')[0],
      targetCohortSize: dto.targetCohortSize || null,
      coverageScale: dto.coverageScale || null,
      targetBeneficiaryGroup: dto.targetBeneficiaryGroup || null,
      objectives: dto.objectives || [],
      baselineMetrics: dto.baselineMetrics || {},
      observedImpactMetrics: dto.observedImpactMetrics || {},
      feedbackSummary: dto.feedbackSummary || null,
      status: dto.status || 'IN_PROGRESS',
      localApprovalConfirmed: dto.localApprovalConfirmed ?? true,
      evidenceDeliverableId: dto.evidenceDeliverableId || null,
      recordedBy: userId,
      recordedAt: new Date().toISOString(),
    };

    if (
      project.status === ProjectStatus.TESTING ||
      project.status === ProjectStatus.ACTIVE ||
      project.status === ProjectStatus.PROTOTYPE_DEVELOPMENT
    ) {
      if (!project.metadata.lifecycle_transitions) {
        project.metadata.lifecycle_transitions = [];
      }
      project.metadata.lifecycle_transitions.push({
        fromStage: project.status,
        toStage: ProjectStatus.PILOT,
        transitionedBy: userId,
        userRole,
        reviewNotes: 'Initiated pilot deployment phase',
        timestamp: new Date().toISOString(),
      });
      project.status = ProjectStatus.PILOT;
    }

    await this.projectRepo.save(project);

    const update = this.updateRepo.create({
      project_id: projectId,
      author_user_id: userId,
      update_type: ProjectUpdateType.PROGRESS,
      summary: `Pilot Deployment Initiated at ${dto.location}`,
      details: `Target cohort: ${dto.targetCohortSize || 'N/A'} beneficiaries. Duration: ${
        dto.durationDays || 30
      } days.`,
    });
    await this.updateRepo.save(update);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Pilot Deployment Initiated: ${project.title}`,
        `Pilot deployment has begun at ${dto.location} (${dto.durationDays || 30} days).`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch pilot notification: ${e}`);
    }

    return this.getProjectLifecycleSummary(projectId, userId, userRole);
  }

  async recordFinalDeployment(
    projectId: string,
    userId: string,
    userRole: string,
    dto: RecordFinalDeploymentDto,
  ) {
    const { project } = await this.ensureLeadOrGov(projectId, userId, userRole);
    if (!project.metadata) project.metadata = {};

    project.metadata.final_deployment = {
      readinessChecklistConfirmed: dto.readinessChecklistConfirmed,
      finalValidationConfirmed: dto.finalValidationConfirmed ?? true,
      deploymentLocation: dto.deploymentLocation,
      deploymentDate: dto.deploymentDate || new Date().toISOString().split('T')[0],
      handoverEntity: dto.handoverEntity,
      handoverRecipient: dto.handoverRecipient,
      implementationOrg: dto.implementationOrg || null,
      trainingCompleted: dto.trainingCompleted,
      operationalStatus: dto.operationalStatus,
      maintenancePlan: dto.maintenancePlan || null,
      evidenceDeliverableId: dto.evidenceDeliverableId || null,
      notes: dto.notes || '',
      recordedBy: userId,
      recordedAt: new Date().toISOString(),
    };

    if (
      project.status === ProjectStatus.PILOT ||
      project.status === ProjectStatus.ACTIVE ||
      project.status === ProjectStatus.TESTING
    ) {
      if (!project.metadata.lifecycle_transitions) {
        project.metadata.lifecycle_transitions = [];
      }
      project.metadata.lifecycle_transitions.push({
        fromStage: project.status,
        toStage: ProjectStatus.DEPLOYMENT,
        transitionedBy: userId,
        userRole,
        reviewNotes: 'Handover and final deployment staged',
        timestamp: new Date().toISOString(),
      });
      project.status = ProjectStatus.DEPLOYMENT;
    }

    await this.projectRepo.save(project);

    const update = this.updateRepo.create({
      project_id: projectId,
      author_user_id: userId,
      update_type: ProjectUpdateType.PROGRESS,
      summary: `Final Deployment & Handover to ${dto.handoverEntity}`,
      details: `Location: ${dto.deploymentLocation}. Operational status: ${dto.operationalStatus}. Training completed: ${dto.trainingCompleted}.`,
    });
    await this.updateRepo.save(update);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Final Deployment Staged: ${project.title}`,
        `Project final deployment and handover to ${dto.handoverEntity} staged at ${dto.deploymentLocation}.`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch final deployment notification: ${e}`);
    }

    return this.getProjectLifecycleSummary(projectId, userId, userRole);
  }

  async transitionLifecycleStage(
    projectId: string,
    userId: string,
    userRole: string,
    dto: TransitionLifecycleStageDto,
  ) {
    if (userRole === UserRole.STUDENT) {
      throw new ForbiddenException(
        'Students are not authorized to transition or approve project lifecycle stages.',
      );
    }

    const { project } = await this.ensureLeadOrGov(projectId, userId, userRole);

    const currentStage = project.status;
    const targetStage = dto.targetStage;

    if (currentStage === targetStage) {
      return this.getProjectLifecycleSummary(projectId, userId, userRole);
    }

    const deliverables = await this.deliverableRepo.find({
      where: { project_id: projectId },
    });
    const docTypes = deliverables.map((d) => d.document_type as string);
    const meta = project.metadata || {};

    if (targetStage === ProjectStatus.TESTING) {
      const hasPrototype =
        !!meta.prototype ||
        docTypes.includes('PROTOTYPE') ||
        docTypes.includes('PROTOTYPE_SPEC');
      if (!hasPrototype) {
        throw new BadRequestException(
          'Cannot transition to TESTING: Prototype specifications or prototype deliverable must be recorded first.',
        );
      }
    } else if (targetStage === ProjectStatus.PILOT) {
      const testRecords: any[] = meta.test_records || [];
      const hasPassedTest =
        testRecords.some((t) => t.passed === true) ||
        docTypes.includes('TESTING_REPORT');
      if (!hasPassedTest) {
        throw new BadRequestException(
          'Cannot transition to PILOT: Validated passing test results or testing report deliverable must be recorded before pilot deployment.',
        );
      }
    } else if (targetStage === ProjectStatus.DEPLOYMENT) {
      const hasPilot =
        !!meta.pilot_deployment || docTypes.includes('PILOT_REPORT');
      if (!hasPilot) {
        throw new BadRequestException(
          'Cannot transition to DEPLOYMENT: Pilot deployment details or pilot report deliverable must be recorded before final deployment.',
        );
      }
    } else if (targetStage === ProjectStatus.COMPLETED) {
      return this.completeProject(projectId, userId, {
        comments:
          dto.reviewNotes || 'Project completed through lifecycle transition.',
      });
    }

    project.status = targetStage;
    if (!project.metadata) project.metadata = {};
    if (!project.metadata.lifecycle_transitions) {
      project.metadata.lifecycle_transitions = [];
    }

    project.metadata.lifecycle_transitions.push({
      fromStage: currentStage,
      toStage: targetStage,
      transitionedBy: userId,
      userRole,
      reviewNotes: dto.reviewNotes || '',
      timestamp: new Date().toISOString(),
    });

    await this.projectRepo.save(project);

    const review = this.reviewRepo.create({
      project_id: projectId,
      reviewer_user_id: userId,
      action: ProjectReviewAction.STAGE_APPROVED,
      comments: `Transitioned stage from ${currentStage} to ${targetStage}. ${
        dto.reviewNotes || ''
      }`.trim(),
    });
    await this.reviewRepo.save(review);

    try {
      await this.notifService?.notifyConsortium(
        projectId,
        NotificationType.PROJECT_GOVERNANCE,
        `Stage Transition: ${currentStage} -> ${targetStage}`,
        `Project "${project.title}" has transitioned to stage ${targetStage}.`,
        'PROJECT',
        projectId,
      );
    } catch (e) {
      this.logger.warn(`Failed to dispatch stage transition notification: ${e}`);
    }

    return this.getProjectLifecycleSummary(projectId, userId, userRole);
  }
}

