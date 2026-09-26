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
import { ImpactService, ExpressUploadedFile } from './impact.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  CreateImpactAssessmentDto,
  UpdateImpactAssessmentDto,
  CreateImpactMetricDto,
  UpdateImpactMetricDto,
  CreateImpactEvidenceDto,
  CreateImpactFeedbackDto,
} from './dto';

@Controller('projects/:id/impact')
@UseGuards(JwtAuthGuard)
export class ImpactController {
  constructor(private readonly impactService: ImpactService) {}

  /**
   * GET /api/projects/:id/impact
   * Retrieves the impact assessment, metrics, evidence, reviews, and community feedback.
   */
  @Get()
  async getImpact(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.impactService.getImpactForProject(projectId, userId, userRole);
  }

  /**
   * POST /api/projects/:id/impact
   * Initiates the impact assessment for a COMPLETED project (Consortium Lead or Admin).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAssessment(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateImpactAssessmentDto,
  ) {
    return this.impactService.createImpactAssessment(projectId, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/impact
   * Updates fields of an impact assessment during draft or revision mode.
   */
  @Patch()
  async updateAssessment(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateImpactAssessmentDto,
  ) {
    return this.impactService.updateImpactAssessment(projectId, userId, userRole, dto);
  }

  /**
   * POST /api/projects/:id/impact/submit
   * Submits the impact assessment for government verification (Consortium Lead only).
   * Enforces that metrics and evidence exist and all required fields are present.
   */
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submitAssessment(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.impactService.submitImpactAssessment(projectId, userId, userRole);
  }

  /**
   * POST /api/projects/:id/impact/metrics
   * Adds a structured metric to the impact assessment.
   */
  @Post('metrics')
  @HttpCode(HttpStatus.CREATED)
  async addMetric(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateImpactMetricDto,
  ) {
    return this.impactService.addMetric(projectId, userId, userRole, dto);
  }

  /**
   * PATCH /api/projects/:id/impact/metrics/:metricId
   * Updates an existing structured metric.
   */
  @Patch('metrics/:metricId')
  async updateMetric(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('metricId', ParseUUIDPipe) metricId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: UpdateImpactMetricDto,
  ) {
    return this.impactService.updateMetric(projectId, metricId, userId, userRole, dto);
  }

  /**
   * DELETE /api/projects/:id/impact/metrics/:metricId
   * Deletes a metric from an editable impact assessment.
   */
  @Delete('metrics/:metricId')
  async deleteMetric(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('metricId', ParseUUIDPipe) metricId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.impactService.deleteMetric(projectId, metricId, userId, userRole);
  }

  /**
   * POST /api/projects/:id/impact/evidence
   * Uploads impact evidence to the isolated storage vault (`uploads/impact-evidence/`).
   */
  @Post('evidence')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadEvidence(
    @Param('id', ParseUUIDPipe) projectId: string,
    @UploadedFile() file: ExpressUploadedFile,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Body() dto: CreateImpactEvidenceDto,
  ) {
    return this.impactService.uploadEvidence(projectId, userId, userRole, file, dto);
  }

  /**
   * GET /api/projects/:id/impact/evidence/:evidenceId/download
   * Streams impact evidence file safely.
   */
  @Get('evidence/:evidenceId/download')
  async downloadEvidence(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: string,
    @Res() res: Response,
  ) {
    return this.impactService.downloadEvidence(projectId, evidenceId, userId, userRole, res);
  }

  /**
   * POST /api/projects/:id/impact/feedback
   * Submits structured community feedback.
   * Anti-astroturfing: strictly eligible challenge submitter only.
   */
  @Post('feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Param('id', ParseUUIDPipe) projectId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateImpactFeedbackDto,
  ) {
    return this.impactService.submitFeedback(projectId, userId, dto);
  }
}
