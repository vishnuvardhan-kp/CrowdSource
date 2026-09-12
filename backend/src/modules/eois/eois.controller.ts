import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { EoisService } from './eois.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateEoiDto,
  UpdateEoiDto,
  WithdrawEoiDto,
  CreateEoiEvidenceDto,
} from './dto';

@Controller('challenges/:challengeId/eois')
export class ChallengeEoisController {
  constructor(private readonly eoisService: EoisService) {}

  /**
   * POST /api/challenges/:challengeId/eois
   * Creates a new Expression of Interest in DRAFT status.
   * Enforces Organization Eligibility Guard.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createDraft(
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: CreateEoiDto,
  ) {
    return this.eoisService.createDraft(challengeId, userId, dto);
  }
}

@Controller('eois')
export class EoisController {
  constructor(private readonly eoisService: EoisService) {}

  /**
   * GET /api/eois/my
   * Retrieves all EOIs submitted by organizations the user represents.
   */
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyEois(@CurrentUser('id') userId: string) {
    return this.eoisService.getMyEois(userId);
  }

  /**
   * GET /api/eois/evidence/file/:filename
   * Streams EOI supporting evidence file.
   */
  @Get('evidence/file/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    return this.eoisService.serveEvidenceFile(filename, res);
  }

  /**
   * GET /api/eois/:id
   * Retrieves detail of an EOI.
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.eoisService.getEoiById(id, userId, userRole);
  }

  /**
   * PATCH /api/eois/:id
   * Updates an EOI proposal. Allowed strictly in DRAFT or DISCUSSION_REQUIRED.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updateEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEoiDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.eoisService.updateEoi(id, dto, userId, userRole);
  }

  /**
   * POST /api/eois/:id/submit
   * Submits a DRAFT EOI (DRAFT -> UNDER_REVIEW).
   */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eoisService.submitEoi(id, userId);
  }

  /**
   * POST /api/eois/:id/resubmit
   * Resubmits an EOI after clarification (DISCUSSION_REQUIRED -> UNDER_REVIEW).
   */
  @Post(':id/resubmit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resubmitEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eoisService.resubmitEoi(id, userId);
  }

  /**
   * POST /api/eois/:id/withdraw
   * Withdraws an EOI before acceptance/rejection (Allowed from DRAFT, SUBMITTED, UNDER_REVIEW, DISCUSSION_REQUIRED).
   */
  @Post(':id/withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async withdrawEoi(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto?: WithdrawEoiDto,
  ) {
    return this.eoisService.withdrawEoi(id, userId, dto);
  }

  /**
   * POST /api/eois/:id/evidence
   * Uploads dedicated supporting document to EOI.
   */
  @Post(':id/evidence')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: any,
    @CurrentUser('id') userId: string,
    @Body() dto?: CreateEoiEvidenceDto,
  ) {
    return this.eoisService.uploadEvidence(id, file, userId, dto);
  }

  /**
   * GET /api/eois/:id/evidence
   * Retrieves supporting documents for an EOI.
   */
  @Get(':id/evidence')
  @UseGuards(JwtAuthGuard)
  async getEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.eoisService.getEvidence(id, userId, userRole);
  }

  /**
   * DELETE /api/eois/:id/evidence/:evidenceId
   * Removes supporting document from an EOI in DRAFT or DISCUSSION_REQUIRED.
   */
  @Delete(':id/evidence/:evidenceId')
  @UseGuards(JwtAuthGuard)
  async deleteEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.eoisService.deleteEvidence(id, evidenceId, userId);
  }
}
