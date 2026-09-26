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
import { ImpactService } from './impact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ImpactAssessmentStatus } from '../../common/enums';
import {
  ImpactReviewActionDto,
  RequireRevisionDto,
  RejectImpactDto,
  RevokeImpactDto,
} from './dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AdminImpactController {
  constructor(private readonly impactService: ImpactService) {}

  /**
   * GET /api/admin/impact/queue
   * Returns impact assessments awaiting government review or in revision.
   */
  @Get('impact/queue')
  async getQueue(@Query('status') status?: ImpactAssessmentStatus) {
    return this.impactService.getImpactQueue(status);
  }

  /**
   * GET /api/admin/projects/:id/impact
   * Detailed impact review workspace for a specific project.
   */
  @Get('projects/:id/impact')
  async getProjectImpactDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.impactService.getAdminProjectImpact(id);
  }

  /**
   * POST /api/admin/impact/:id/approve
   * Approves impact assessment: transitions assessment to VERIFIED,
   * project to IMPACT_VERIFIED, and creates immutable audit record.
   */
  @Post('impact/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ImpactReviewActionDto,
  ) {
    return this.impactService.approveImpact(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/impact/:id/require-revision
   * Requests revision with mandatory reviewer notes: transitions assessment to REVISION_REQUIRED.
   */
  @Post('impact/:id/require-revision')
  @HttpCode(HttpStatus.OK)
  async requireRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RequireRevisionDto,
  ) {
    return this.impactService.requireRevision(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/impact/:id/reject
   * Permanently rejects impact verification: transitions assessment to REJECTED (terminal).
   */
  @Post('impact/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectImpactDto,
  ) {
    return this.impactService.rejectImpact(id, reviewerId, dto);
  }

  /**
   * POST /api/admin/impact/:id/revoke
   * Audit Revocation: PLATFORM_ADMIN ONLY.
   * Reverts assessment to REVISION_REQUIRED, downgrades project from IMPACT_VERIFIED to COMPLETED.
   */
  @Post('impact/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.PLATFORM_ADMIN)
  async revokeImpact(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @CurrentUser('role') reviewerRole: string,
    @Body() dto: RevokeImpactDto,
  ) {
    return this.impactService.revokeImpact(id, reviewerId, reviewerRole, dto);
  }
}
