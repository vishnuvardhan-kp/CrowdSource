import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Challenge } from '../entities/challenge.entity';
import { ChallengeStatus } from '../../../common/enums';
import { EvidenceService } from './evidence.service';

@Injectable()
export class DraftCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DraftCleanupService.name);
  private timer: NodeJS.Timeout | null = null;
  private readonly retentionHours: number;
  private readonly intervalMs: number;

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    private readonly evidenceService: EvidenceService,
  ) {
    this.retentionHours = parseInt(
      process.env.DRAFT_CLEANUP_RETENTION_HOURS || '72',
      10,
    );
    // Cleanup interval: run once an hour (or configurable)
    this.intervalMs = parseInt(
      process.env.DRAFT_CLEANUP_INTERVAL_MS || '3600000',
      10,
    );
  }

  onModuleInit() {
    this.logger.log(
      `Draft cleanup service initialized. Retention period: ${this.retentionHours} hours. Interval: ${Math.round(this.intervalMs / 1000 / 60)} minutes.`,
    );
    // Start periodic background cleanup
    this.timer = setInterval(() => {
      this.cleanupExpiredDrafts().catch((err) => {
        this.logger.error(`Error during automated draft cleanup: ${err.message}`);
      });
    }, this.intervalMs);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Cleans up expired inactive drafts and their associated evidence files.
   * Can be invoked manually (e.g. in tests) or periodically by the timer.
   */
  async cleanupExpiredDrafts(): Promise<{ cleanedCount: number; deletedEvidenceFiles: number }> {
    const cutoffDate = new Date(Date.now() - this.retentionHours * 60 * 60 * 1000);

    const expiredDrafts = await this.challengeRepo.find({
      where: {
        status: ChallengeStatus.DRAFT,
        updated_at: LessThan(cutoffDate),
      },
      relations: ['evidence'],
    });

    if (expiredDrafts.length === 0) {
      return { cleanedCount: 0, deletedEvidenceFiles: 0 };
    }

    this.logger.log(
      `Found ${expiredDrafts.length} expired draft(s) older than ${cutoffDate.toISOString()} for cleanup.`,
    );

    let deletedEvidenceFiles = 0;

    for (const draft of expiredDrafts) {
      if (draft.evidence && draft.evidence.length > 0) {
        for (const ev of draft.evidence) {
          await this.evidenceService.removePhysicalFile(ev);
          deletedEvidenceFiles++;
        }
      }
      await this.challengeRepo.delete(draft.id);
    }

    this.logger.log(
      `Automated cleanup complete. Removed ${expiredDrafts.length} drafts and ${deletedEvidenceFiles} physical evidence files.`,
    );

    return {
      cleanedCount: expiredDrafts.length,
      deletedEvidenceFiles,
    };
  }

  /**
   * Explicitly cleans up a specific draft: deletes all physical evidence files
   * and then removes the challenge from the database.
   */
  async explicitlyDeleteDraft(draft: Challenge): Promise<void> {
    if (draft.evidence && draft.evidence.length > 0) {
      for (const ev of draft.evidence) {
        await this.evidenceService.removePhysicalFile(ev);
      }
    }
    await this.challengeRepo.delete(draft.id);
  }
}
