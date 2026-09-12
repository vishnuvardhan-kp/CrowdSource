import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateClaimRequestDto } from './dto/create-claim-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async getOrganizations(
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('district') district?: string,
  ) {
    return this.organizationsService.findAll(search, type, district);
  }

  @Get(':id')
  async getOrganizationById(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Get(':id/members')
  @UseGuards(JwtAuthGuard)
  async getOrganizationMembers(@Param('id') id: string) {
    return this.organizationsService.findMembers(id);
  }
}

@Controller('organization-claims')
export class OrganizationClaimsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitClaim(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateClaimRequestDto,
  ) {
    return this.organizationsService.createClaimRequest(userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getClaims(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.organizationsService.findClaimRequests(userId, userRole);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  async approveClaim(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('notes') notes?: string,
  ) {
    return this.organizationsService.approveClaimRequest(id, reviewerId, notes);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectClaim(
    @Param('id') id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('notes') notes: string,
  ) {
    return this.organizationsService.rejectClaimRequest(id, reviewerId, notes);
  }
}

