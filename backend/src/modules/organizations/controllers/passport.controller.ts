import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PassportService } from '../services/passport.service';
import { UpdatePassportDto } from '../dto/update-passport.dto';
import { AddCapabilityDto } from '../dto/add-capability.dto';
import { CreateOrganizationEvidenceDto } from '../dto/create-evidence.dto';

@Controller('organizations/:id')
export class PassportController {
  constructor(private readonly passportService: PassportService) {}

  /**
   * GET /api/organizations/:id/passport
   * Public or authenticated retrieval of the capability passport.
   */
  @Get('passport')
  async getPassport(@Param('id', ParseUUIDPipe) id: string) {
    return this.passportService.getPassport(id);
  }

  /**
   * PUT /api/organizations/:id/passport
   * Self-serve update of organization metadata and sub-profiles.
   */
  @Put('passport')
  @UseGuards(JwtAuthGuard)
  async updatePassport(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: UpdatePassportDto,
  ) {
    return this.passportService.updatePassport(id, req.user.id, dto);
  }

  /**
   * POST /api/organizations/:id/capabilities
   * Attach a master taxonomy capability to the passport.
   */
  @Post('capabilities')
  @UseGuards(JwtAuthGuard)
  async addCapability(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: AddCapabilityDto,
  ) {
    return this.passportService.addCapability(id, req.user.id, dto);
  }

  /**
   * PUT /api/organizations/:id/capabilities/:capabilityId
   * Mutates an existing capability claim, triggering governance re-evaluation if previously verified.
   */
  @Put('capabilities/:capabilityId')
  @UseGuards(JwtAuthGuard)
  async updateCapability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
    @Request() req: any,
    @Body() dto: any,
  ) {
    return this.passportService.updateCapability(id, req.user.id, capabilityId, dto);
  }

  /**
   * DELETE /api/organizations/:id/capabilities/:capabilityId
   * Detach a capability from the passport.
   */
  @Delete('capabilities/:capabilityId')
  @UseGuards(JwtAuthGuard)
  async removeCapability(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('capabilityId', ParseUUIDPipe) capabilityId: string,
    @Request() req: any,
  ) {
    return this.passportService.removeCapability(id, req.user.id, capabilityId);
  }

  /**
   * POST /api/organizations/:id/evidence
   * Upload documentary evidence with optional capability linkage.
   * Supports both multipart file upload (PDF/JPG/PNG up to 15MB) and external URL.
   */
  @Post('evidence')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = path.resolve(
            process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'evidence'),
          );
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname).toLowerCase();
          cb(null, `evidence-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/webp',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Unsupported file type: ${file.mimetype}. Allowed types: PDF, JPG, PNG, WEBP.`,
            ),
            false,
          );
        }
      },
    }),
  )
  async addEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() dto: CreateOrganizationEvidenceDto,
    @UploadedFile() file?: any,
  ) {
    if (file) {
      dto.url = `/uploads/evidence/${file.filename}`;
      dto.mime_type = file.mimetype;
    }
    if (!dto.url || !dto.url.trim()) {
      throw new BadRequestException('Either a document file upload or a valid URL is required.');
    }
    return this.passportService.addEvidence(id, req.user.id, dto);
  }

  /**
   * GET /api/organizations/:id/evidence
   * List all evidence records for the organization.
   */
  @Get('evidence')
  async getEvidence(@Param('id', ParseUUIDPipe) id: string) {
    return this.passportService.getEvidence(id);
  }

  /**
   * DELETE /api/organizations/:id/evidence/:evidenceId
   * Delete an unverified evidence record.
   */
  @Delete('evidence/:evidenceId')
  @UseGuards(JwtAuthGuard)
  async deleteEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
    @Request() req: any,
  ) {
    return this.passportService.deleteEvidence(id, req.user.id, evidenceId);
  }
}
