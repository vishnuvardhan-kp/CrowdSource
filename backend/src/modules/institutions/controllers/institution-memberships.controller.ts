import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
  Ip,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { InstitutionMembershipsService } from '../services/institution-memberships.service';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UploadEvidenceDto } from '../dto/upload-evidence.dto';

@Controller('institution-memberships')
@UseGuards(JwtAuthGuard)
export class InstitutionMembershipsController {
  constructor(
    private readonly membershipsService: InstitutionMembershipsService,
  ) {}

  /**
   * GET /api/institution-memberships/me
   * Get all institutional representation affiliations for the logged-in user.
   */
  @Get('me')
  async getMyMemberships(@CurrentUser() user: any) {
    return this.membershipsService.getUserMemberships(user.id);
  }

  /**
   * POST /api/institution-memberships
   * Submit application to represent a Panchayat, ULB, or Government entity.
   */
  @Post()
  async createMembership(
    @CurrentUser() user: any,
    @Body() dto: CreateMembershipDto,
    @Ip() ipAddress: string,
  ) {
    return this.membershipsService.createMembership(user.id, dto, ipAddress);
  }

  /**
   * GET /api/institution-memberships/:id
   * Get application details and verification history.
   */
  @Get(':id')
  async getMembershipById(@Param('id', ParseUUIDPipe) id: string) {
    return this.membershipsService.getMembershipById(id);
  }

  /**
   * POST /api/institution-memberships/:id/evidence
   * Upload credentials / government appointment letters.
   */
  @Post(':id/evidence')
  async uploadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: UploadEvidenceDto,
    @Ip() ipAddress: string,
  ) {
    return this.membershipsService.uploadEvidence(
      user.id,
      id,
      dto,
      user.role,
      ipAddress,
    );
  }
}
