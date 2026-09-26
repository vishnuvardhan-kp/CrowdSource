import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationService } from './verification.service';
import { VerificationDecisionDto } from './dto/verification-decision.dto';

@Controller('admin/verification')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_ADMIN, UserRole.GOVERNMENT_OFFICER)
export class AdminVerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  /**
   * GET /api/admin/verification/queue
   * Retrieves universal verification queue of pending evidence, capabilities, and claims
   * strictly scoped by reviewer jurisdiction.
   */
  @Get('queue')
  async getQueue(@CurrentUser() user?: any) {
    return this.verificationService.getVerificationQueue(user);
  }

  /**
   * POST /api/admin/verification/:id/approve
   * Approves a specific verification target item.
   */
  @Post(':id/approve')
  async approveItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.verificationService.approveItem(id, user.id, dto, user);
  }

  /**
   * POST /api/admin/verification/:id/reject
   * Rejects a specific verification target item with mandatory audit notes.
   */
  @Post(':id/reject')
  async rejectItem(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Body() dto: VerificationDecisionDto,
  ) {
    return this.verificationService.rejectItem(id, user.id, dto, user);
  }
}
