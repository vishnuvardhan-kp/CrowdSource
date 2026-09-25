import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../../common/enums';
import { InstitutionMembershipsService } from '../services/institution-memberships.service';
import { AuditLogService } from '../services/audit-log.service';
import { ReviewMembershipDto } from '../dto/review-membership.dto';

@Controller('admin/institutions/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_ADMIN, UserRole.GOVERNMENT_OFFICER)
export class AdminInstitutionVerificationController {
  constructor(
    private readonly membershipsService: InstitutionMembershipsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * GET /api/admin/institutions/verification/queue
   * Retrieves pending representative authorization applications.
   */
  @Get('queue')
  async getQueue(
    @Query('status') status?: any,
    @Query('type') type?: string,
    @Query('district_id') districtId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.membershipsService.getPendingVerificationQueue({
      status,
      type,
      district_id: districtId,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  /**
   * POST /api/admin/institutions/verification/:id/review
   * Review decision for a representative authority application.
   */
  @Post(':id/review')
  async reviewApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() adminUser: any,
    @Body() dto: ReviewMembershipDto,
    @Ip() ipAddress: string,
  ) {
    return this.membershipsService.reviewMembership(
      adminUser.id,
      id,
      dto,
      ipAddress,
    );
  }

  /**
   * GET /api/admin/institutions/verification/audit-logs
   * Retrieves immutable audit logs for institutional operations.
   */
  @Get('audit-logs')
  async getAuditLogs(
    @Query('entity_type') entityType?: string,
    @Query('entity_id') entityId?: string,
    @Query('actor_id') actorId?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.auditLogService.getLogs({
      entityType,
      entityId,
      actorId,
      limit: limit ? Number(limit) : 50,
      offset: offset ? Number(offset) : 0,
    });
  }
}
