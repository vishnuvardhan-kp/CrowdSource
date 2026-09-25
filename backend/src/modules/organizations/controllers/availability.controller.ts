import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AvailabilityService } from '../services/availability.service';
import { IsOptional, IsNumber } from 'class-validator';

export class ConfirmAvailabilityDto {
  @IsOptional()
  @IsNumber()
  available_capacity?: number;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsNumber()
  ttl_days?: number;

  @IsOptional()
  @IsNumber()
  ttlDays?: number;
}

@Controller('organizations/:id/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /**
   * GET /api/organizations/:id/availability
   * Retrieves current capacity, expiration date, and freshness status.
   */
  @Get()
  async getAvailability(@Param('id', ParseUUIDPipe) id: string) {
    return this.availabilityService.getAvailability(id);
  }

  /**
   * PUT /api/organizations/:id/availability
   * Confirms active capacity and renews TTL.
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async confirmAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmAvailabilityDto,
  ) {
    const cap = dto.available_capacity ?? dto.capacity;
    const ttl = dto.ttl_days ?? dto.ttlDays;
    return this.availabilityService.confirmAvailability(
      id,
      cap,
      ttl,
    );
  }

  /**
   * POST /api/organizations/:id/availability/confirm
   * Alias for confirming active capacity and renewing TTL.
   */
  @Post('confirm')
  @UseGuards(JwtAuthGuard)
  async confirmAvailabilityPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConfirmAvailabilityDto,
  ) {
    const cap = dto.available_capacity ?? dto.capacity;
    const ttl = dto.ttl_days ?? dto.ttlDays;
    return this.availabilityService.confirmAvailability(
      id,
      cap,
      ttl,
    );
  }
}
