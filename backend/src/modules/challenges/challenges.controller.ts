import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response, Request } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ChallengesService } from './challenges.service';
import { EvidenceService } from './services/evidence.service';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
  ReviewChallengeDto,
  QueryChallengesDto,
  TranslateChallengeDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ChallengeStatus } from '../../common/enums';

@Controller('challenges')
export class ChallengesController {
  constructor(
    private readonly challengesService: ChallengesService,
    private readonly evidenceService: EvidenceService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Helper to optionally extract user ID from Authorization header for public endpoints.
   */
  private extractOptionalUserId(authHeader?: string): string | undefined {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = this.jwtService.decode(token);
      return decoded?.sub;
    } catch {
      return undefined;
    }
  }

  // 1. Create Draft
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDraft(
    @Body() dto: CreateChallengeDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.challengesService.createDraft(dto, userId);
  }

  // 2. Public Challenge Discovery (strictly excludes drafts)
  @Get()
  async getPublicChallenges(
    @Query() query: QueryChallengesDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractOptionalUserId(authHeader);
    return this.challengesService.getPublicChallenges(query, userId);
  }

  // 3. User's Personal Challenges (including drafts)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyChallenges(@CurrentUser('id') userId: string) {
    return this.challengesService.getMyChallenges(userId);
  }

  // 4. Reviewer Queue (PLATFORM_ADMIN, GOVERNMENT_ADMIN, & GOVERNMENT_OFFICER)
  @Get('review/queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_ADMIN, UserRole.GOVERNMENT_OFFICER)
  async getReviewerQueue(
    @Query('status') status?: ChallengeStatus,
    @CurrentUser() user?: any,
  ) {
    return this.challengesService.getReviewerQueue(status, user);
  }

  // 5. Safe Evidence File Serving
  @Get('evidence/file/:filename')
  async serveEvidenceFile(
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    const { filePath, mimeType } = this.evidenceService.getFilePathForServing(filename);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.sendFile(filePath);
  }

  // 6. Challenge Detail Page
  @Get(':id')
  async getChallengeById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractOptionalUserId(authHeader);
    let userRole: string | undefined;
    if (userId && authHeader) {
      try {
        const decoded: any = this.jwtService.decode(authHeader.split(' ')[1]);
        userRole = decoded?.role;
      } catch {}
    }
    return this.challengesService.getChallengeById(id, userId, userRole);
  }

  // 6.1 On-Demand Multilingual Challenge Translation
  @Post(':id/translate')
  @HttpCode(HttpStatus.OK)
  async translateChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TranslateChallengeDto,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractOptionalUserId(authHeader);
    let userRole: string | undefined;
    if (userId && authHeader) {
      try {
        const decoded: any = this.jwtService.decode(authHeader.split(' ')[1]);
        userRole = decoded?.role;
      } catch {}
    }
    return this.challengesService.translateChallenge(id, dto?.target_language || 'hi', userId, userRole);
  }


  // 7. Update Draft (MUST ONLY work for DRAFT status)
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChallengeDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.challengesService.updateDraft(id, dto, userId, userRole);
  }

  // 8. Delete Draft
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.challengesService.deleteDraft(id, userId, userRole);
  }

  // 9. Submit Challenge (ONLY endpoint performing DRAFT -> SUBMITTED)
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.challengesService.submitChallenge(id, userId);
  }

  // 10. Community Confirmation ("I experience this problem too")
  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirmChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.challengesService.confirmChallenge(id, userId);
  }

  // 11. Remove Community Confirmation
  @Delete(':id/confirm')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unconfirmChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.challengesService.unconfirmChallenge(id, userId);
  }

  // 12. Reviewer Decision (PLATFORM_ADMIN, GOVERNMENT_ADMIN, & GOVERNMENT_OFFICER)
  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.GOVERNMENT_ADMIN, UserRole.GOVERNMENT_OFFICER)
  @HttpCode(HttpStatus.OK)
  async reviewChallenge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewChallengeDto,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.challengesService.reviewChallenge(id, dto, reviewerId);
  }

  // 13. Upload Evidence to Draft
  @Post(':id/evidence')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
    @Body('title') title?: string,
    @Body('description') description?: string,
  ) {
    return this.challengesService.uploadEvidence(
      id,
      file,
      userId,
      title,
      description,
    );
  }

  // 14. Remove Evidence from Draft
  @Delete(':id/evidence/:evidenceId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.challengesService.deleteEvidence(id, evidenceId, userId);
  }
}



