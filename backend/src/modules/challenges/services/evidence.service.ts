import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { ChallengeEvidence } from '../entities/challenge-evidence.entity';
import { EvidenceType } from '../../../common/enums';

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class EvidenceService {
  private readonly logger = new Logger(EvidenceService.name);
  private readonly uploadDir: string;
  private readonly maxFileSizeBytes: number;

  // Permitted MIME types
  private readonly allowedMimeTypes: Record<string, EvidenceType> = {
    'image/jpeg': EvidenceType.IMAGE,
    'image/png': EvidenceType.IMAGE,
    'image/webp': EvidenceType.IMAGE,
    'video/mp4': EvidenceType.VIDEO,
    'video/quicktime': EvidenceType.VIDEO,
    'video/webm': EvidenceType.VIDEO,
    'application/pdf': EvidenceType.DOCUMENT,
    'text/plain': EvidenceType.DOCUMENT,
  };

  constructor(
    @InjectRepository(ChallengeEvidence)
    private readonly evidenceRepo: Repository<ChallengeEvidence>,
  ) {
    this.uploadDir = path.resolve(
      process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'evidence'),
    );
    this.maxFileSizeBytes = parseInt(
      process.env.MAX_EVIDENCE_FILE_SIZE_BYTES || '15728640', // Default 15 MB
      10,
    );

    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getUploadDir(): string {
    return this.uploadDir;
  }

  detectEvidenceType(mimeType: string): EvidenceType {
    return this.allowedMimeTypes[mimeType.toLowerCase()] || EvidenceType.OTHER;
  }

  async saveEvidenceFile(
    challengeId: string,
    file: ExpressUploadedFile,
    userId: string,
    title?: string,
    description?: string,
  ): Promise<ChallengeEvidence> {
    if (!file) {
      throw new BadRequestException('No file provided for evidence upload.');
    }

    // 1. Validate file size
    if (file.size > this.maxFileSizeBytes) {
      const maxMb = Math.round(this.maxFileSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${maxMb} MB.`,
      );
    }

    // 2. Validate MIME type
    const normalizedMime = file.mimetype.toLowerCase();
    const evidenceType = this.allowedMimeTypes[normalizedMime];
    if (!evidenceType) {
      throw new BadRequestException(
        `Unsupported file type '${file.mimetype}'. Allowed types: JPEG, PNG, WEBP, MP4, QuickTime, WebM, PDF, TXT.`,
      );
    }

    // 3. Generate safe unique filename
    const sanitizedExt = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, '');
    const safeFilename = `${randomUUID()}${sanitizedExt}`;
    const targetPath = path.join(this.uploadDir, safeFilename);

    // Path traversal check
    const relative = path.relative(this.uploadDir, targetPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid storage path detected.');
    }

    // 4. Save file to filesystem
    await fs.promises.writeFile(targetPath, file.buffer);

    // 5. Store metadata in PostgreSQL
    const relativeUrl = `/api/challenges/evidence/file/${safeFilename}`;
    const evidenceRecord = this.evidenceRepo.create({
      challenge_id: challengeId,
      uploaded_by: userId,
      evidence_type: evidenceType,
      title: title || file.originalname.slice(0, 250),
      description: description || null,
      url: relativeUrl,
      mime_type: normalizedMime,
      metadata: {
        originalFilename: file.originalname,
        fileSize: file.size,
        safeFilename,
        storedPath: targetPath,
        uploadedAt: new Date().toISOString(),
      },
    });

    return this.evidenceRepo.save(evidenceRecord);
  }

  async deleteEvidenceFile(evidenceId: string): Promise<boolean> {
    const evidence = await this.evidenceRepo.findOne({ where: { id: evidenceId } });
    if (!evidence) {
      return false;
    }

    // 1. Remove physical file
    await this.removePhysicalFile(evidence);

    // 2. Delete DB record
    await this.evidenceRepo.delete(evidenceId);
    return true;
  }

  async removePhysicalFile(evidence: ChallengeEvidence): Promise<void> {
    try {
      const filename = evidence.metadata?.safeFilename || path.basename(evidence.url);
      if (filename) {
        const filePath = path.join(this.uploadDir, filename);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          this.logger.log(`Deleted physical evidence file: ${filePath}`);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Failed to delete physical file for evidence ${evidence.id}: ${err.message}`);
    }
  }

  getFilePathForServing(filename: string): { filePath: string; mimeType: string } {
    // Prevent path traversal
    const safeBase = path.basename(filename);
    const filePath = path.join(this.uploadDir, safeBase);

    const relative = path.relative(this.uploadDir, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid file path.');
    }

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Requested evidence file not found.');
    }

    // Determine basic mime type from extension
    const ext = path.extname(safeBase).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.webm': 'video/webm',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
    };

    return {
      filePath,
      mimeType: mimeMap[ext] || 'application/octet-stream',
    };
  }

  async getEvidenceForChallenge(challengeId: string): Promise<ChallengeEvidence[]> {
    return this.evidenceRepo.find({
      where: { challenge_id: challengeId },
      order: { created_at: 'ASC' },
    });
  }
}
