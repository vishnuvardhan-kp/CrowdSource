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
import { EoisService } from './eois.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, EoiStatus } from '../../common/enums';
import {
  RequestDiscussionDto,
  RejectEoiDto,
  FormCollaborativeProjectDto,
} from './dto';

@Controller('admin/eois')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AdminEoisController {
  constructor(private readonly eoisService: EoisService) {}

  /**
   * GET /api/admin/eois
   * Reviewer queue for evaluating Expressions of Interest.
   */
  @Get()
  async getQueue(
    @Query('status') status?: EoiStatus,
    @Query('challengeId') challengeId?: string,
  ) {
    return this.eoisService.getReviewerEois(status, challengeId);
  }

  /**
   * GET /api/admin/eois/:id
   * Detailed EOI review view with capability alignment and AI match information.
   */
  @Get(':id')
  async getDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.eoisService.getReviewerEoiDetail(id);
  }

  /**
   * POST /api/admin/eois/:id/request-discussion
   * Requests clarification/modification from proposing organization.
   * Transition: UNDER_REVIEW -> DISCUSSION_REQUIRED
   */
  @Post(':id/request-discussion')
  @HttpCode(HttpStatus.OK)
  async requestDiscussion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RequestDiscussionDto,
  ) {
    return this.eoisService.requestDiscussion(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/eois/:id/accept
   * Accepts an EOI into the approved consortium candidate pool.
   * CRITICAL INVARIANT: NEVER CREATES A PROJECT.
   */
  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.eoisService.acceptEoi(id, reviewerId);
  }

  /**
   * POST /api/admin/eois/:id/reject
   * Rejects an EOI. Mandatory reason required.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectEoiDto,
  ) {
    return this.eoisService.rejectEoi(id, reviewerId, dto);
  }
}

@Controller('admin/challenges/:challengeId')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AdminChallengeProjectsController {
  constructor(private readonly eoisService: EoisService) {}

  /**
   * GET /api/admin/challenges/:challengeId/accepted-eois
   * Lists all accepted EOIs ready for collaborative project formation.
   */
  @Get('accepted-eois')
  async getAcceptedEois(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
  ) {
    return this.eoisService.getAcceptedEoisForChallenge(challengeId);
  }

  /**
   * POST /api/admin/challenges/:challengeId/projects
   * Forms ONE collaborative project bundling selected accepted EOIs.
   * Closes challenge intake (status -> PROJECT_INITIATED).
   */
  @Post('projects')
  @HttpCode(HttpStatus.CREATED)
  async formProject(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: FormCollaborativeProjectDto,
  ) {
    return this.eoisService.formCollaborativeProject(challengeId, reviewerId, dto);
  }
}
