import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { OnboardingService } from '../services/onboarding.service';
import { CreateOnboardingRequestDto } from '../dto/create-onboarding-request.dto';

@Controller()
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * POST /api/organizations/onboarding-requests
   * Submits a new organization onboarding proposal (Scenario B).
   */
  @Post('organizations/onboarding-requests')
  @UseGuards(JwtAuthGuard)
  async submitOnboardingRequest(
    @Request() req: any,
    @Body() dto: CreateOnboardingRequestDto,
  ) {
    return this.onboardingService.createOnboardingRequest(req.user.id, dto);
  }

  /**
   * GET /api/organizations/onboarding-requests
   * Lists onboarding requests for the authenticated user.
   */
  @Get('organizations/onboarding-requests')
  @UseGuards(JwtAuthGuard)
  async getMyOnboardingRequests(@Request() req: any) {
    return this.onboardingService.findRequests(req.user.id, req.user.role);
  }

  /**
   * GET /api/admin/onboarding-requests
   * Administrator queue of all onboarding requests.
   */
  @Get('admin/onboarding-requests')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER)
  async getAdminOnboardingQueue(@Request() req: any) {
    return this.onboardingService.findRequests(req.user.id, req.user.role);
  }

  /**
   * POST /api/admin/onboarding-requests/:id/approve
   * Approves an onboarding request and creates the organization & membership.
   */
  @Post('admin/onboarding-requests/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER)
  async approveOnboardingRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body('admin_notes') adminNotes?: string,
  ) {
    return this.onboardingService.approveRequest(id, req.user.id, adminNotes);
  }

  /**
   * POST /api/admin/onboarding-requests/:id/reject
   * Rejects an onboarding request with mandatory notes.
   */
  @Post('admin/onboarding-requests/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER)
  async rejectOnboardingRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body('admin_notes') adminNotes: string,
  ) {
    return this.onboardingService.rejectRequest(id, req.user.id, adminNotes);
  }
}
