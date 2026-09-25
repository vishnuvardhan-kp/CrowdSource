import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { InstitutionsService } from '../services/institutions.service';
import { SearchInstitutionsDto } from '../dto/search-institutions.dto';

@Controller('institutions')
export class InstitutionsController {
  constructor(private readonly institutionsService: InstitutionsService) {}

  /**
   * GET /api/institutions/search
   * Search institutions with cascading administrative filters and keyword query.
   */
  @Get('search')
  async search(@Query() dto: SearchInstitutionsDto) {
    return this.institutionsService.search(dto);
  }

  /**
   * GET /api/institutions/lgd/:code
   * Authoritative LGD directory validation.
   * Confirms institution existence and official directory metadata.
   */
  @Get('lgd/:code')
  async verifyLgd(@Param('code') code: string) {
    return this.institutionsService.verifyLgdCode(code);
  }

  /**
   * GET /api/institutions/hierarchy
   * Cascading hierarchy data for district/block selection.
   */
  @Get('hierarchy')
  async getHierarchy(@Query('district_id') districtId?: string) {
    return this.institutionsService.getHierarchy(districtId);
  }

  /**
   * GET /api/institutions/:id
   * Get institution profile by internal ID.
   */
  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.institutionsService.findById(id);
  }
}
