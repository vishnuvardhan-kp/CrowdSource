import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import * as path from 'path';
import * as fs from 'fs';
import { OrganizationEvidence } from '../entities/organization-evidence.entity';
import { OrganizationMembership } from '../entities/organization-membership.entity';
import { UserRole, MembershipStatus } from '../../../common/enums';

@Controller('evidence')
export class EvidenceController {
  private readonly uploadsDir: string;

  constructor(
    @InjectRepository(OrganizationEvidence)
    private readonly evidenceRepo: Repository<OrganizationEvidence>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    private readonly jwtService: JwtService,
  ) {
    this.uploadsDir = path.resolve(
      process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'evidence'),
    );
  }

  /**
   * GET /api/evidence/:id/view
   * Secure evidence serving endpoint with public/private authorization and path-traversal prevention.
   */
  @Get(':id/view')
  async viewEvidence(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const evidence = await this.evidenceRepo.findOne({
      where: { id },
      relations: ['organization'],
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence record "${id}" was not found.`);
    }

    // 1. Authenticate user if token is provided
    let authUser: { id: string; role: string; email: string } | null = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      try {
        const payload = this.jwtService.verify(token);
        authUser = {
          id: payload.sub,
          role: payload.role,
          email: payload.email,
        };
      } catch {
        // Token invalid or expired
      }
    }

    // 2. Authorization Check
    // Public evidence: anyone can view
    if (evidence.is_public) {
      // Access granted
    } else {
      // Private evidence: strict access control
      if (!authUser) {
        throw new UnauthorizedException('Authentication is required to view this private evidence record.');
      }

      const isElevatedReviewer =
        authUser.role === UserRole.PLATFORM_ADMIN ||
        authUser.role === UserRole.GOVERNMENT_OFFICER ||
        authUser.role === UserRole.GOVERNMENT_ADMIN;

      if (!isElevatedReviewer) {
        // Check if user is an active member of the uploading organization
        const membership = await this.memberRepo.findOne({
          where: {
            organization_id: evidence.organization_id,
            user_id: authUser.id,
            membership_status: MembershipStatus.ACTIVE,
          },
        });

        if (!membership) {
          throw new ForbiddenException(
            'Access denied: You do not have permission to view this organization private evidence.',
          );
        }
      }
    }

    // 3. Serve Evidence safely
    // Check if the evidence URL represents a local file
    const isLocalFile =
      evidence.url.startsWith('/') ||
      evidence.url.startsWith('uploads') ||
      !evidence.url.startsWith('http');

    if (isLocalFile) {
      const filename = path.basename(evidence.url);
      const safePath = path.join(this.uploadsDir, filename);

      // Path traversal check
      const relative = path.relative(this.uploadsDir, safePath);
      if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new BadRequestException('Invalid evidence file path.');
      }

      if (fs.existsSync(safePath)) {
        res.setHeader('Content-Type', evidence.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        return fs.createReadStream(safePath).pipe(res);
      }
    }

    // For external URLs or when local file is not physically on disk, return metadata with safe URL
    return res.json({
      id: evidence.id,
      title: evidence.title,
      description: evidence.description,
      url: evidence.url,
      mime_type: evidence.mime_type,
      evidence_type: evidence.evidence_type,
      is_public: evidence.is_public,
      verification_status: evidence.verification_status,
      verified_at: evidence.verified_at,
      organization_name: evidence.organization?.name,
    });
  }

  /**
   * GET /api/evidence/:id
   * Retrieves evidence metadata.
   */
  @Get(':id')
  async getEvidenceMetadata(@Param('id', ParseUUIDPipe) id: string) {
    const evidence = await this.evidenceRepo.findOne({
      where: { id },
      relations: ['organization', 'capability'],
    });

    if (!evidence) {
      throw new NotFoundException(`Evidence record "${id}" was not found.`);
    }

    return evidence;
  }
}
