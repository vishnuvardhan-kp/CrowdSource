import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Organization } from '../entities/organization.entity';

@Injectable()
export class AvailabilityService {
  private readonly defaultTtlDays: number;

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.defaultTtlDays = Number(this.configService.get<number>('AVAILABILITY_TTL_DAYS') || 30);
  }

  /**
   * Retrieves the current availability status and TTL for an organization.
   */
  async getAvailability(orgId: string) {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    const now = new Date();
    let currentStatus = org.availability_status || 'UNKNOWN';

    // Check if availability TTL has expired
    if (org.availability_expires_at && org.availability_expires_at < now) {
      currentStatus = 'STALE';
      if (org.availability_status !== 'STALE') {
        org.availability_status = 'STALE';
        await this.orgRepo.save(org);
      }
    }

    const daysRemaining = org.availability_expires_at
      ? Math.max(0, Math.ceil((org.availability_expires_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
      : 0;

    return {
      organization_id: org.id,
      organization_name: org.name,
      available_capacity: org.available_capacity,
      availability_status: currentStatus,
      availability_confirmed_at: org.availability_confirmed_at,
      availability_expires_at: org.availability_expires_at,
      ttl_days_configured: this.defaultTtlDays,
      days_remaining: daysRemaining,
      is_fresh: currentStatus === 'FRESH',
    };
  }

  /**
   * Confirms active availability for an organization, renewing the TTL to now + AVAILABILITY_TTL_DAYS.
   */
  async confirmAvailability(orgId: string, capacity?: number, ttlDays?: number) {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    const effectiveTtlDays = ttlDays || this.defaultTtlDays;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + effectiveTtlDays * 24 * 60 * 60 * 1000);

    org.availability_confirmed_at = now;
    org.availability_expires_at = expiresAt;
    org.availability_status = 'FRESH';

    if (capacity !== undefined && capacity >= 0) {
      org.available_capacity = capacity;
    }

    const saved = await this.orgRepo.save(org);

    // Emit event to trigger async AI indexing update
    this.eventEmitter.emit('organization.updated', { organizationId: org.id });

    return {
      message: `Availability confirmed successfully. Freshness valid for ${effectiveTtlDays} days.`,
      organization_id: saved.id,
      available_capacity: saved.available_capacity,
      availability_status: saved.availability_status,
      availability_confirmed_at: saved.availability_confirmed_at,
      availability_expires_at: saved.availability_expires_at,
      days_remaining: effectiveTtlDays,
    };
  }
}
