import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InstitutionAuditLog } from '../entities/institution-audit-log.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(InstitutionAuditLog)
    private readonly auditRepo: Repository<InstitutionAuditLog>,
  ) {}

  async logAction(
    entityType: string,
    entityId: string,
    action: string,
    actorId?: string | null,
    previousState?: Record<string, any> | null,
    newState?: Record<string, any> | null,
    notes?: string | null,
    ipAddress?: string | null,
  ): Promise<InstitutionAuditLog> {
    try {
      const entry = this.auditRepo.create({
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: actorId || null,
        previous_state: previousState || null,
        new_state: newState || null,
        notes: notes || null,
        ip_address: ipAddress || null,
      });

      return await this.auditRepo.save(entry);
    } catch (err: any) {
      this.logger.error(`Failed to save audit log: ${err.message}`, err.stack);
      // Non-blocking fallback: return dummy entry to not fail business transaction
      return {
        id: 'error',
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: actorId || null,
        actor: null,
        previous_state: previousState || null,
        new_state: newState || null,
        notes,
        ip_address: ipAddress || null,
        created_at: new Date(),
      } as InstitutionAuditLog;
    }
  }

  async getLogs(params: {
    entityType?: string;
    entityId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: InstitutionAuditLog[]; total: number }> {
    const qb = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .orderBy('log.created_at', 'DESC');

    if (params.entityType) {
      qb.andWhere('log.entity_type = :entityType', { entityType: params.entityType });
    }
    if (params.entityId) {
      qb.andWhere('log.entity_id = :entityId', { entityId: params.entityId });
    }
    if (params.actorId) {
      qb.andWhere('log.actor_id = :actorId', { actorId: params.actorId });
    }

    const limit = Math.min(params.limit || 50, 100);
    const offset = params.offset || 0;

    qb.take(limit).skip(offset);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total };
  }
}
