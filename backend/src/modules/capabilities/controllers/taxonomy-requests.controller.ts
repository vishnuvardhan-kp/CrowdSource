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
import { TaxonomyRequestsService } from '../services/taxonomy-requests.service';
import { CreateTaxonomyRequestDto } from '../dto/create-taxonomy-request.dto';

@Controller('organizations/:id/taxonomy-requests')
export class TaxonomyRequestsController {
  constructor(private readonly taxonomyRequestsService: TaxonomyRequestsService) {}

  /**
   * POST /api/organizations/:id/taxonomy-requests
   * Organization representative submits proposal for a missing capability.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: CreateTaxonomyRequestDto,
  ) {
    return this.taxonomyRequestsService.createRequest(id, req.user.id, dto);
  }

  /**
   * GET /api/organizations/:id/taxonomy-requests
   * List all taxonomy requests submitted by the organization.
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getOrgRequests(@Param('id', ParseUUIDPipe) id: string) {
    return this.taxonomyRequestsService.getOrgRequests(id);
  }
}
