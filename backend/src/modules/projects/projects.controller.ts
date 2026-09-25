import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProjectsService, ExpressUploadedFile } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProjectStatus } from '../../common/enums';
import {
  ProjectKickoffDto,
  CreateMilestoneDto,
  UpdateMilestoneDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateDeliverableDto,
  CreateProjectUpdateDto,
  CreateAcademicMemberDto,
  UpdateAcademicMemberDto,
  CreateProjectContributionDto,
  UpdateProjectContributionDto,
  CreateInnovationOutcomeDto,
  UpdateInnovationOutcomeDto,
  RecordPrototypeDto,
  RecordTestValidationDto,
  RecordPilotDeploymentDto,
  RecordFinalDeploymentDto,
  TransitionLifecycleStageDto,
  MilestoneReviewDto,
  BlockerReviewDto,
  VerifyInnovationOutcomeDto,
  RecordIpAssessmentDto,
} from './dto';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/projects
   * Returns list of projects accessible to the user.
   */
  @Get()
  async getProjects(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projectsService.getProjects(userId, userRole, status);
  }

  /**
   * GET /api/projects/:id
   * Returns complete project workspace details.
   */
  @Get(':id')
  async getProjectById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getProjectById(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/kickoff
   * Submits kickoff plan (Lead only).
   */
  @Post(':id/kickoff')
  @HttpCode(HttpStatus.OK)
  async submitKickoff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: ProjectKickoffDto,
  ) {
    return this.projectsService.submitKickoff(id, userId, userRole, dto);
  }

  /**
   * GET /api/projects/:id/milestones
   * Lists milestones with associated tasks, deliverables, and reviews.
   */
  @Get(':id/milestones')
  async getMilestones(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getMilestones(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/milestones
   * Creates a new milestone (Lead only).
   */
  @Post(':id/milestones')
  @HttpCode(HttpStatus.CREATED)
  async createMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateMilestoneDto,
  ) {
    return this.projectsService.createMilestone(id, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/milestones/:milestoneId
   * Updates an existing milestone (Lead only, locked if under review or approved).
   */
  @Patch(':id/milestones/:milestoneId')
  async updateMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.projectsService.updateMilestone(
      id,
      milestoneId,
      userId,
      userRole,
      dto,
    );
  }

  /**
   * POST /api/projects/:id/milestones/:milestoneId/start
   * Starts a pending milestone (Lead only).
   */
  @Post(':id/milestones/:milestoneId/start')
  @HttpCode(HttpStatus.OK)
  async startMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.startMilestone(
      id,
      milestoneId,
      userId,
      userRole,
    );
  }

  /**
   * POST /api/projects/:id/milestones/:milestoneId/request-review
   * Submits milestone for government review (Lead only).
   * Cascading Lock engages: tasks & deliverables become read-only.
   */
  @Post(':id/milestones/:milestoneId/request-review')
  @HttpCode(HttpStatus.OK)
  async requestMilestoneReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.requestMilestoneReview(
      id,
      milestoneId,
      userId,
      userRole,
    );
  }

  /**
   * POST /api/projects/:id/milestones/:milestoneId/review
   * Approves or requests revision on a submitted milestone (Gov / Admin).
   */
  @Post(':id/milestones/:milestoneId/review')
  @HttpCode(HttpStatus.OK)
  async reviewMilestone(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: MilestoneReviewDto,
  ) {
    return this.projectsService.reviewMilestone(
      id,
      milestoneId,
      reviewerId,
      dto,
    );
  }

  /**
   * GET /api/projects/:id/tasks
   * Lists tasks for the project.
   */
  @Get(':id/tasks')
  async getTasks(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('milestoneId') milestoneId?: string,
  ) {
    return this.projectsService.getTasks(id, userId, userRole, milestoneId);
  }

  /**
   * POST /api/projects/:id/tasks
   * Creates a new task under a milestone (Locked if milestone is under review or approved).
   */
  @Post(':id/tasks')
  @HttpCode(HttpStatus.CREATED)
  async createTask(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.projectsService.createTask(id, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/tasks/:taskId
   * Updates task details/status (Locked if milestone is under review or approved).
   */
  @Patch(':id/tasks/:taskId')
  async updateTask(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.projectsService.updateTask(id, taskId, userId, userRole, dto);
  }

  /**
   * GET /api/projects/:id/deliverables
   * Lists deliverables submitted for the project.
   */
  @Get(':id/deliverables')
  async getDeliverables(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Query('milestoneId') milestoneId?: string,
  ) {
    return this.projectsService.getDeliverables(
      id,
      userId,
      userRole,
      milestoneId,
    );
  }

  /**
   * POST /api/projects/:id/deliverables
   * Uploads deliverable evidence to isolated vault (Locked if milestone is under review or approved).
   */
  @Post(':id/deliverables')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDeliverable(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: ExpressUploadedFile,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateDeliverableDto,
  ) {
    return this.projectsService.uploadDeliverable(
      id,
      file,
      userId,
      userRole,
      dto,
    );
  }

  /**
   * GET /api/projects/:id/deliverables/:deliverableId/download
   * Streams deliverable file securely after authorization check.
   */
  @Get(':id/deliverables/:deliverableId/download')
  async downloadDeliverable(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deliverableId', ParseUUIDPipe) deliverableId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Res() res: Response,
  ) {
    return this.projectsService.downloadDeliverable(
      id,
      deliverableId,
      userId,
      userRole,
      res,
    );
  }

  /**
   * GET /api/projects/:id/updates
   * Lists project updates and blockers.
   */
  @Get(':id/updates')
  async getUpdates(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getUpdates(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/updates
   * Posts progress update or blocker. If blocker, automatically transitions project to BLOCKED.
   */
  @Post(':id/updates')
  @HttpCode(HttpStatus.CREATED)
  async createUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateProjectUpdateDto,
  ) {
    return this.projectsService.createUpdate(id, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/updates/:updateId/review
   * Reviews or resolves a blocker update (Gov / Admin).
   */
  @Post(':id/updates/:updateId/review')
  @HttpCode(HttpStatus.OK)
  async reviewBlockerOnUpdate(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('updateId', ParseUUIDPipe) updateId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: BlockerReviewDto,
  ) {
    return this.projectsService.reviewBlocker(
      id,
      updateId,
      reviewerId,
      dto,
    );
  }

  // =========================================================================
  // MODULE A: ACADEMIC COLLABORATION (SIH PHASE 9)
  // =========================================================================

  /**
   * GET /api/projects/:id/academic-members
   * Returns multidisciplinary academic members (Consortium & Gov only).
   */
  @Get(':id/academic-members')
  async getAcademicMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getAcademicMembers(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/academic-members
   * Adds an academic team member (Student, Faculty Mentor, Coordinator).
   */
  @Post(':id/academic-members')
  @HttpCode(HttpStatus.CREATED)
  async addAcademicMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateAcademicMemberDto,
  ) {
    return this.projectsService.addAcademicMember(id, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/academic-members/:memberId
   * Updates an academic member's department, specialization, or status.
   */
  @Patch(':id/academic-members/:memberId')
  @HttpCode(HttpStatus.OK)
  async updateAcademicMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateAcademicMemberDto,
  ) {
    return this.projectsService.updateAcademicMember(id, memberId, userId, userRole, dto);
  }

  /**
   * DELETE /api/projects/:id/academic-members/:memberId
   * Removes an academic member from the project.
   */
  @Delete(':id/academic-members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeAcademicMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.removeAcademicMember(id, memberId, userId, userRole);
  }

  // =========================================================================
  // MODULE B: INDUSTRY & ECOSYSTEM CONTRIBUTIONS (SIH PHASE 9)
  // =========================================================================

  /**
   * GET /api/projects/:id/contributions
   * Lists structured industry & ecosystem contributions.
   */
  @Get(':id/contributions')
  async getContributions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getContributions(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/contributions
   * Proposes/records a project contribution by a participating organization.
   */
  @Post(':id/contributions')
  @HttpCode(HttpStatus.CREATED)
  async createContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateProjectContributionDto,
  ) {
    return this.projectsService.createContribution(id, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/contributions/:contribId
   * Updates a contribution by the contributing organization.
   */
  @Patch(':id/contributions/:contribId')
  @HttpCode(HttpStatus.OK)
  async updateContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contribId', ParseUUIDPipe) contribId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateProjectContributionDto,
  ) {
    return this.projectsService.updateContribution(id, contribId, userId, userRole, dto);
  }

  /**
   * DELETE /api/projects/:id/contributions/:contribId
   * Deletes a proposed contribution.
   */
  @Delete(':id/contributions/:contribId')
  @HttpCode(HttpStatus.OK)
  async deleteContribution(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('contribId', ParseUUIDPipe) contribId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.deleteContribution(id, contribId, userId, userRole);
  }

  // =========================================================================
  // MODULE C: INNOVATION & IP OUTCOMES TRACKING (PHASE 9.1)
  // =========================================================================

  /**
   * GET /api/projects/:id/innovation-outcomes
   * Lists innovation and IP outcomes for the project.
   */
  @Get(':id/innovation-outcomes')
  async getInnovationOutcomes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getInnovationOutcomes(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/innovation-outcomes
   * Creates an innovation or IP outcome.
   */
  @Post(':id/innovation-outcomes')
  @HttpCode(HttpStatus.CREATED)
  async createInnovationOutcome(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateInnovationOutcomeDto,
  ) {
    return this.projectsService.createInnovationOutcome(id, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/innovation-outcomes/:outcomeId
   * Updates an innovation outcome.
   */
  @Patch(':id/innovation-outcomes/:outcomeId')
  @HttpCode(HttpStatus.OK)
  async updateInnovationOutcome(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('outcomeId', ParseUUIDPipe) outcomeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateInnovationOutcomeDto,
  ) {
    return this.projectsService.updateInnovationOutcome(id, outcomeId, userId, userRole, dto);
  }

  /**
   * DELETE /api/projects/:id/innovation-outcomes/:outcomeId
   * Deletes an unverified innovation outcome.
   */
  @Delete(':id/innovation-outcomes/:outcomeId')
  @HttpCode(HttpStatus.OK)
  async deleteInnovationOutcome(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('outcomeId', ParseUUIDPipe) outcomeId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.deleteInnovationOutcome(id, outcomeId, userId, userRole);
  }

  /**
   * POST /api/projects/:id/innovation-outcomes/:outcomeId/verify
   * Government verification of an innovation or IP outcome.
   */
  @Post(':id/innovation-outcomes/:outcomeId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyInnovationOutcome(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('outcomeId', ParseUUIDPipe) outcomeId: string,
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('role') reviewerRole: string,
    @Body() dto: VerifyInnovationOutcomeDto,
  ) {
    return this.projectsService.verifyInnovationOutcome(
      id,
      outcomeId,
      reviewerId,
      reviewerRole,
      dto,
    );
  }

  /**
   * GET /api/projects/:id/ip-assessment
   * Returns project IP assessment status, protection path, and notes.
   */
  @Get(':id/ip-assessment')
  async getIpAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getIpAssessment(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/ip-assessment
   * Records or updates project IP assessment (Lead institution, IP cell, or Gov).
   */
  @Post(':id/ip-assessment')
  @HttpCode(HttpStatus.OK)
  async recordIpAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordIpAssessmentDto,
  ) {
    return this.projectsService.recordIpAssessment(id, userId, userRole, dto);
  }

  @Get(':id/lifecycle/ip-assessment')
  async getLifecycleIpAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getIpAssessment(id, userId, userRole);
  }

  @Post(':id/lifecycle/ip-assessment')
  @HttpCode(HttpStatus.OK)
  async recordLifecycleIpAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordIpAssessmentDto,
  ) {
    return this.projectsService.recordIpAssessment(id, userId, userRole, dto);
  }

  // =========================================================================
  // PHASE 4: PROJECT LIFECYCLE (PROTOTYPE, TEST, PILOT, DEPLOYMENT)
  // =========================================================================

  /**
   * GET /api/projects/:id/lifecycle
   * Returns comprehensive lifecycle status, checklist, test logs, pilot data, and recommendations.
   */
  @Get(':id/lifecycle')
  async getProjectLifecycleSummary(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.projectsService.getProjectLifecycleSummary(id, userId, userRole);
  }

  /**
   * POST /api/projects/:id/lifecycle/prototype
   * Records prototype specifications, architecture, and resource needs.
   */
  @Post(':id/lifecycle/prototype')
  @HttpCode(HttpStatus.OK)
  async recordPrototype(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordPrototypeDto,
  ) {
    return this.projectsService.recordPrototype(id, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/lifecycle/test
   * Records testing & validation results (lab, field, simulation, safety).
   */
  @Post(':id/lifecycle/test')
  @HttpCode(HttpStatus.OK)
  async recordTestValidation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordTestValidationDto,
  ) {
    return this.projectsService.recordTestValidation(id, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/lifecycle/pilot
   * Records pilot deployment parameters, cohort size, and impact feedback.
   */
  @Post(':id/lifecycle/pilot')
  @HttpCode(HttpStatus.OK)
  async recordPilotDeployment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordPilotDeploymentDto,
  ) {
    return this.projectsService.recordPilotDeployment(id, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/lifecycle/deployment
   * Records final deployment readiness, handover entity, training, and operational plan.
   */
  @Post(':id/lifecycle/deployment')
  @HttpCode(HttpStatus.OK)
  async recordFinalDeployment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: RecordFinalDeploymentDto,
  ) {
    return this.projectsService.recordFinalDeployment(id, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/lifecycle/transition
   * Guarded transition between lifecycle stages (PLANNING -> PROTOTYPE -> TESTING -> PILOT -> DEPLOYMENT -> COMPLETED).
   */
  @Post(':id/lifecycle/transition')
  @HttpCode(HttpStatus.OK)
  async transitionLifecycleStage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: TransitionLifecycleStageDto,
  ) {
    return this.projectsService.transitionLifecycleStage(id, userId, userRole, dto);
  }
}

