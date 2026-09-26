import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get('districts')
  async getDistricts() {
    return this.locationsService.getDistricts();
  }

  @Get('districts/:districtId/blocks')
  async getBlocks(@Param('districtId', ParseUUIDPipe) districtId: string) {
    return this.locationsService.getBlocksByDistrict(districtId);
  }
}
