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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../../common/enums';
import { TaxonomyRequestsService } from '../services/taxonomy-requests.service';
import { ReviewTaxonomyRequestDto } from '../dto/create-taxonomy-request.dto';

@Controller('admin/taxonomy-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_ADMIN)
export class AdminTaxonomyRequestsController {
  constructor(private readonly taxonomyRequestsService: TaxonomyRequestsService) {}

  /**
   * GET /api/admin/taxonomy-requests
   * Admin queue of all pending taxonomy addition requests.
   */
  @Get()
  async getAdminQueue() {
    return this.taxonomyRequestsService.getAdminQueue();
  }

  /**
   * POST /api/admin/taxonomy-requests/:id/approve
   * Admin approves proposal, inserting into master taxonomy.
   */
  @Post(':id/approve')
  async approveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: ReviewTaxonomyRequestDto,
  ) {
    return this.taxonomyRequestsService.approveRequest(id, req.user.id, dto);
  }

  /**
   * POST /api/admin/taxonomy-requests/:id/reject
   * Admin rejects proposal with audit notes.
   */
  @Post(':id/reject')
  async rejectRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: ReviewTaxonomyRequestDto,
  ) {
    return this.taxonomyRequestsService.rejectRequest(id, req.user.id, dto);
  }
}
