import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ResearchIntelligenceService } from './research-intelligence.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { ResearchIntelligenceResponseDto } from './dto/research-recommendation-response.dto';

@Controller(['v1/research-intelligence', 'research-intelligence'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResearchIntelligenceController {
  constructor(private readonly service: ResearchIntelligenceService) {}

  /**
   * Retrieves academic research recommendations (papers & datasets)
   * tailored to the civic problem requirements.
   *
   * Enforces strict RBAC:
   * - Platform Admin
   * - Government Admin / Officer (jurisdiction-scoped)
   * - University Admin / Faculty / Student
   * - Industry Partner
   */
  @Get('challenges/:challengeId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.GOVERNMENT_ADMIN,
    UserRole.GOVERNMENT_OFFICER,
    UserRole.UNIVERSITY_ADMIN,
    UserRole.FACULTY,
    UserRole.STUDENT,
    UserRole.INDUSTRY_ADMIN,
    UserRole.INDUSTRY_MEMBER,
  )
  async getChallengeResearch(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @CurrentUser() currentUser: any,
  ): Promise<ResearchIntelligenceResponseDto> {
    return this.service.getRecommendations(challengeId, currentUser);
  }
}
