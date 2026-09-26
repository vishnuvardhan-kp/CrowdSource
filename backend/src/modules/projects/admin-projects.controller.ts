import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ProjectStatus, InnovationOutcomeStatus } from '../../common/enums';
import {
  KickoffReviewDto,
  MilestoneReviewDto,
  BlockerReviewDto,
  ProjectCompletionDto,
  ImpactVerificationDto,
  ProjectTerminationDto,
  VerifyContributionDto,
  VerifyInnovationOutcomeDto,
} from './dto';

@Controller('admin/projects')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AdminProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  /**
   * GET /api/admin/projects
   * Returns queue and dashboard of collaborative projects for government oversight.
   */
  @Get()
  async getQueue(@Query('status') status?: ProjectStatus) {
    return this.projectsService.getReviewerProjects(status);
  }

  /**
   * GET /api/admin/projects/:id
   * Returns comprehensive project details for government reviewer.
   */
  @Get(':id')
  async getDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.projectsService.getProjectById(id, userId, role);
  }

  /**
   * POST /api/admin/projects/:id/kickoff-review
   * Approves or requests revision on project kickoff plan.
   * APPROVE -> ACTIVE | REQUEST_REVISION -> KICKOFF_REVISION
   */
  @Post(':id/kickoff-review')
  @HttpCode(HttpStatus.OK)
  async reviewKickoff(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: KickoffReviewDto,
  ) {
    return this.projectsService.reviewKickoff(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/projects/:id/milestones/:milestoneId/review
   * Approves or requests revision on a submitted milestone.
   * APPROVE -> APPROVED (Permanent lock) | REQUEST_REVISION -> REVISION_REQUIRED (Unlocks)
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
   * POST /api/admin/projects/:id/blockers/:updateId/review
   * Reviews or resolves a blocker. If resolved and no other blockers, restores project to ACTIVE.
   */
  @Post(':id/blockers/:updateId/review')
  @HttpCode(HttpStatus.OK)
  async reviewBlocker(
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

  /**
   * POST /api/admin/projects/:id/complete
   * Evaluates project completion against Zero-Milestone Completion Guard.
   * Transitions ACTIVE -> COMPLETED.
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeProject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ProjectCompletionDto,
  ) {
    return this.projectsService.completeProject(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/projects/:id/impact-verify
   * Transitions COMPLETED -> IMPACT_VERIFIED.
   * Clean handoff point without Phase 8 overreach.
   */
  @Post(':id/impact-verify')
  @HttpCode(HttpStatus.OK)
  async verifyImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ImpactVerificationDto,
  ) {
    return this.projectsService.verifyImpact(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/projects/:id/terminate
   * Terminates project with mandatory reason. Irreversible terminal state.
   */
  @Post(':id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateProject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ProjectTerminationDto,
  ) {
    return this.projectsService.terminateProject(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/projects/contributions/:contribId/verify
   * Government review on structured industry/ecosystem contribution.
   */
  @Post('contributions/:contribId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyContribution(
    @Param('contribId', ParseUUIDPipe) contribId: string,
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('role') reviewerRole: string,
    @Body() dto: VerifyContributionDto,
  ) {
    return this.projectsService.verifyContribution(contribId, reviewerId, reviewerRole, dto);
  }

  /**
   * GET /api/admin/projects/innovation-outcomes/queue
   * Lists innovation outcomes for reviewer verification.
   */
  @Get('innovation-outcomes/queue')
  async getInnovationOutcomesQueue(
    @Query('status') status?: InnovationOutcomeStatus,
  ) {
    return this.projectsService.getReviewerInnovationOutcomes(status);
  }

  /**
   * POST /api/admin/projects/:id/innovation-outcomes/:outcomeId/verify
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
    return this.projectsService.verifyInnovationOutcome(id, outcomeId, reviewerId, reviewerRole, dto);
  }
}
