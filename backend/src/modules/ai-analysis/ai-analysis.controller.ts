import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiAnalysisService } from './ai-analysis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../../common/enums';

@Controller('ai')
export class AiAnalysisController {
  constructor(private readonly aiAnalysisService: AiAnalysisService) {}

  /**
   * Health and model provider status of the AI inference subsystem.
   */
  @Get('status')
  async getStatus() {
    return this.aiAnalysisService.getAiServiceStatus();
  }

  /**
   * Analyzes a citizen-submitted challenge to extract structured problem intelligence.
   * Authorized for Platform Admins and Government Officers (Human-in-the-loop oversight).
   */
  @Post('challenges/:id/analyze')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER, UserRole.CITIZEN)
  @HttpCode(HttpStatus.OK)
  async analyzeChallenge(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiAnalysisService.analyzeChallenge(id);
  }

  /**
   * Retrieves stored AI Problem Intelligence for a challenge.
   */
  @Get('challenges/:id/analysis')
  async getChallengeAnalysis(@Param('id', ParseUUIDPipe) id: string) {
    return this.aiAnalysisService.getAnalysisByChallengeId(id);
  }
}
