import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ReviewStatus } from '../../common/enums';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Retrieves AI-ranked ecosystem recommendations for a challenge.
   */
  @Get('challenge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.GOVERNMENT_ADMIN,
    UserRole.GOVERNMENT_OFFICER,
    UserRole.UNIVERSITY_ADMIN,
    UserRole.FACULTY,
    UserRole.STUDENT,
    UserRole.INDUSTRY_ADMIN,
    UserRole.INDUSTRY_MEMBER,
    UserRole.CITIZEN,
  )
  async getRecommendations(
    @Param('id', ParseUUIDPipe) challengeId: string,
    @CurrentUser() user: any,
  ) {
    return this.reviewsService.getOrGenerateRecommendations(challengeId, user);
  }

  /**
   * Human Review Decision on an AI recommendation.
   */
  @Post(':id/decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER)
  @HttpCode(HttpStatus.OK)
  async submitDecision(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: ReviewStatus; notes?: string; final_decision?: string },
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.reviewsService.submitReviewDecision(
      id,
      reviewerId,
      body.status,
      body.notes,
      body.final_decision,
    );
  }

  /**
   * Bulk review for triage accelerator.
   */
  @Post('bulk-decision')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_OFFICER)
  @HttpCode(HttpStatus.OK)
  async bulkDecision(
    @Body() body: { review_ids: string[]; status: ReviewStatus; notes?: string },
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.reviewsService.bulkReviewDecisions(
      body.review_ids,
      reviewerId,
      body.status,
      body.notes,
    );
  }
}
