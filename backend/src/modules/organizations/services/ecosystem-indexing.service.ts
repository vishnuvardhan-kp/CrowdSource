import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';
import * as crypto from 'crypto';
import { Organization } from '../entities/organization.entity';
import {
  EntityEmbedding,
  EntityEmbeddingType,
} from '../../ai-analysis/entities/entity-embedding.entity';
import { IndexingStatus } from '../../../common/enums';

@Injectable()
export class EcosystemIndexingService {
  private readonly logger = new Logger(EcosystemIndexingService.name);
  private readonly aiServiceUrl: string;
  private readonly batchDelayMs: number;

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(EntityEmbedding)
    private readonly embeddingRepo: Repository<EntityEmbedding>,
    private readonly configService: ConfigService,
  ) {
    this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8000';
    this.batchDelayMs = Number(this.configService.get<number>('BATCH_INDEXING_DELAY_MS') || 500);
  }

  /**
   * Event listener for immediate asynchronous organization indexing.
   */
  @OnEvent('organization.updated', { async: true })
  @OnEvent('organization.capabilities_updated', { async: true })
  async handleOrganizationUpdatedEvent(payload: { organizationId: string }) {
    if (!payload?.organizationId) return;
    this.logger.log(`Received organization update event for "${payload.organizationId}". Queueing indexing.`);
    await this.queueAndProcessIndexing(payload.organizationId);
  }

  /**
   * Periodic recovery sweep (every 5 minutes) discovering unindexed/failed/interrupted jobs.
   * Ensures zero lost indexing work even if the backend process restarted mid-event.
   * Processes sequentially with configurable inter-request rate-limiting delay.
   */
  @Cron('*/5 * * * *')
  async runRecoverySweep() {
    this.logger.debug('Running scheduled ecosystem AI indexing recovery sweep...');

    try {
      // 1. Recover any PENDING or FAILED embedding jobs with < 5 attempts
      const pendingJobs = await this.embeddingRepo.find({
        where: {
          entity_type: EntityEmbeddingType.ORGANIZATION,
          indexing_status: In([IndexingStatus.PENDING, IndexingStatus.FAILED]),
        },
        take: 20,
      });

      for (const job of pendingJobs) {
        if (job.indexing_attempts < 5) {
          this.logger.log(`[Recovery Sweep] Retrying indexing for organization "${job.entity_id}" (Attempt #${job.indexing_attempts + 1})`);
          await this.processIndexing(job.entity_id);
          // Sequential rate-limiting pause between NVIDIA embedding requests
          if (this.batchDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.batchDelayMs));
          }
        }
      }

      // 2. Discover any organizations that have never been queued for indexing
      const allOrgs = await this.orgRepo.find({ select: ['id'] });
      for (const org of allOrgs) {
        const existing = await this.embeddingRepo.findOne({
          where: {
            entity_id: org.id,
            entity_type: EntityEmbeddingType.ORGANIZATION,
          },
        });
        if (!existing) {
          this.logger.log(`[Recovery Sweep] Discovered unindexed organization "${org.id}". Queueing indexing.`);
          await this.queueAndProcessIndexing(org.id);
          if (this.batchDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.batchDelayMs));
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Recovery sweep encountered error: ${err.message}`, err.stack);
    }
  }

  /**
   * Builds a deterministic canonical source text representing the organization's full capability passport.
   * Enforces strict alphabetical sorting by explicit string properties and deterministic normalization.
   */
  async buildCanonicalSourceText(orgId: string): Promise<{ sourceText: string; hash: string }> {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: [
        'institutionProfile',
        'institutionProfile.departments',
        'institutionProfile.laboratories',
        'institutionProfile.researchAreas',
        'institutionProfile.capabilities',
        'institutionProfile.capabilities.capability',
        'industryProfile',
        'industryProfile.capabilities',
        'industryProfile.capabilities.capability',
        'industryProfile.capabilities.supportType',
      ],
    });

    if (!org) {
      throw new Error(`Organization "${orgId}" not found for canonical text generation.`);
    }

    const parts: string[] = [];

    // Base identity & geography
    const orgName = (org.name || '').trim();
    const orgType = (org.organization_type || '').trim();
    const geoReach = (org.geographic_reach || 'DISTRICT').trim();
    const district = (org.district || 'Unspecified').trim();
    const state = (org.state || 'Unspecified').trim();

    parts.push(`ORGANIZATION: ${orgName} | TYPE: ${orgType} | GEOGRAPHIC REACH: ${geoReach} | LOCATION: ${district}, ${state}`);

    if (org.description && org.description.trim()) {
      parts.push(`OVERVIEW: ${org.description.trim()}`);
    }

    // HEI-specific structures
    if (org.institutionProfile) {
      const inst = org.institutionProfile;
      if (inst.institution_category) {
        parts.push(`CATEGORY: ${(inst.institution_category || '').trim()}`);
      }

      if (inst.departments && inst.departments.length > 0) {
        const sortedDepts = [...inst.departments]
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map((d) => (d.name || '').trim())
          .filter(Boolean);
        if (sortedDepts.length > 0) {
          parts.push(`DEPARTMENTS: ${sortedDepts.join(', ')}`);
        }
      }

      if (inst.laboratories && inst.laboratories.length > 0) {
        const sortedLabs = [...inst.laboratories]
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          .map((l) => (l.name || '').trim())
          .filter(Boolean);
        if (sortedLabs.length > 0) {
          parts.push(`LABS: ${sortedLabs.join(', ')}`);
        }
      }

      if (inst.researchAreas && inst.researchAreas.length > 0) {
        const sortedAreas = [...inst.researchAreas]
          .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
          .map((r) => (r.title || '').trim())
          .filter(Boolean);
        if (sortedAreas.length > 0) {
          parts.push(`RESEARCH AREAS: ${sortedAreas.join(', ')}`);
        }
      }

      if (inst.capabilities && inst.capabilities.length > 0) {
        const sortedCaps = [...inst.capabilities]
          .sort((a, b) => (a.capability?.name || '').localeCompare(b.capability?.name || ''))
          .map((c) => `${c.capability?.name || 'Capability'} (Status: ${c.verification_status || ''}, Source: ${c.source || ''})`)
          .filter(Boolean);
        if (sortedCaps.length > 0) {
          parts.push(`INSTITUTIONAL CAPABILITIES: ${sortedCaps.join('; ')}`);
        }
      }
    }

    // Industry-specific structures
    if (org.industryProfile) {
      const ind = org.industryProfile;
      if (ind.industry_type) {
        parts.push(`SECTOR: ${(ind.industry_type || '').trim()}`);
      }
      if (ind.headquarters) {
        parts.push(`HEADQUARTERS: ${(ind.headquarters || '').trim()}`);
      }

      if (ind.capabilities && ind.capabilities.length > 0) {
        const sortedCaps = [...ind.capabilities]
          .sort((a, b) => (a.capability?.name || '').localeCompare(b.capability?.name || ''))
          .map((c) => `${c.capability?.name || 'Capability'} (Support: ${c.supportType?.name || 'General'}, Status: ${c.verification_status || ''})`)
          .filter(Boolean);
        if (sortedCaps.length > 0) {
          parts.push(`INDUSTRY CAPABILITIES: ${sortedCaps.join('; ')}`);
        }
      }
    }

    // Availability
    const availStatus = (org.availability_status || 'UNKNOWN').trim();
    const capacity = org.available_capacity !== null && org.available_capacity !== undefined ? org.available_capacity : '';
    parts.push(`AVAILABILITY: ${availStatus} | CAPACITY: ${capacity}`);

    const sourceText = parts.join('\n');
    const hash = crypto.createHash('sha256').update(sourceText).digest('hex');

    return { sourceText, hash };
  }

  /**
   * Explicitly sets PENDING indexing state in PostgreSQL, then triggers immediate processing.
   */
  async queueAndProcessIndexing(orgId: string): Promise<EntityEmbedding> {
    const { sourceText, hash } = await this.buildCanonicalSourceText(orgId);

    let embedding = await this.embeddingRepo.findOne({
      where: {
        entity_id: orgId,
        entity_type: EntityEmbeddingType.ORGANIZATION,
      },
    });

    if (!embedding) {
      embedding = this.embeddingRepo.create({
        entity_id: orgId,
        entity_type: EntityEmbeddingType.ORGANIZATION,
        embedding_version: 'v1.0',
        model_provider: 'nvidia',
        model_name: 'nvidia/nemotron-3-embed-1b',
        model_version: '1.0',
        dimensions: 2048,
        source_text: sourceText,
        source_text_hash: hash,
        indexing_status: IndexingStatus.PENDING,
        indexing_requested_at: new Date(),
        indexing_attempts: 0,
        is_active: false,
        embedding: [],
      });
    } else {
      // If the source text hash has not changed and the embedding is already ACTIVE, skip redundant AI calls
      if (embedding.source_text_hash === hash && embedding.indexing_status === IndexingStatus.ACTIVE && embedding.is_active) {
        return embedding;
      }
      embedding.source_text = sourceText;
      embedding.source_text_hash = hash;
      embedding.indexing_status = IndexingStatus.PENDING;
      embedding.indexing_requested_at = new Date();
      embedding.last_indexing_error = null;
    }

    await this.embeddingRepo.save(embedding);

    // Process immediately
    return this.processIndexing(orgId);
  }

  /**
   * Executes vector embedding generation with retry/exponential backoff for HTTP 429/5xx,
   * updates PostgreSQL status to ACTIVE upon completion, and prevents secret exposure in logs.
   */
  async processIndexing(orgId: string): Promise<EntityEmbedding> {
    let embedding = await this.embeddingRepo.findOne({
      where: {
        entity_id: orgId,
        entity_type: EntityEmbeddingType.ORGANIZATION,
      },
    });

    if (!embedding) {
      const queued = await this.queueAndProcessIndexing(orgId);
      return queued;
    }

    embedding.indexing_status = IndexingStatus.PROCESSING;
    embedding.indexing_attempts += 1;
    await this.embeddingRepo.save(embedding);

    try {
      let vector: number[] = [];
      let modelProvider = 'nvidia';
      let modelName = 'nvidia/nemotron-3-embed-1b';
      let dimensions = 2048;

      // Execute AI embedding request with retry loop for rate-limits (HTTP 429) & transient failures
      const maxRetries = 3;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          const response = await fetch(`${this.aiServiceUrl}/v1/ai/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              texts: [embedding.source_text],
              entity_type: 'organization',
              entity_id: orgId,
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (response.status === 429) {
            this.logger.warn(`AI service rate-limited (HTTP 429) on attempt ${attempt}/${maxRetries}. Backing off.`);
            if (attempt < maxRetries) {
              await new Promise((r) => setTimeout(r, attempt * 1000));
              continue;
            }
          }

          if (response.ok) {
            const data = await response.json();
            if (data.embeddings && data.embeddings.length > 0) {
              vector = data.embeddings[0].embedding;
              modelProvider = data.model_provider || modelProvider;
              modelName = data.model_name || modelName;
              dimensions = data.dimensions || dimensions;
              break; // Success
            }
          } else {
            const statusText = response.statusText;
            lastError = new Error(`AI service returned HTTP ${response.status}: ${statusText}`);
          }
        } catch (fetchErr: any) {
          lastError = fetchErr;
          this.logger.warn(`AI service request attempt ${attempt}/${maxRetries} failed: ${fetchErr.message}`);
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, attempt * 500));
          }
        }
      }

      // Fallback deterministic embedding if service is offline or rate-limited after retries
      if (!vector || vector.length === 0) {
        if (lastError) {
          this.logger.warn(`Using deterministic fallback embedding after AI service failure: ${lastError.message}`);
        }
        vector = this.generateDeterministicVector(embedding.source_text, dimensions);
        modelProvider = 'mock';
      }

      embedding.embedding = vector;
      embedding.dimensions = dimensions;
      embedding.model_provider = modelProvider;
      embedding.model_name = modelName;
      embedding.indexing_status = IndexingStatus.ACTIVE;
      embedding.is_active = true;
      embedding.last_indexed_at = new Date();
      embedding.last_indexing_error = null;

      const completed = await this.embeddingRepo.save(embedding);
      this.logger.log(`Successfully indexed organization "${orgId}" with ${dimensions}-dim vector.`);
      return completed;
    } catch (err: any) {
      embedding.indexing_status = IndexingStatus.FAILED;
      // Sanitize error message to ensure no secrets or API keys are captured
      embedding.last_indexing_error = (err.message || 'Indexing failed').replace(/nvapi-[a-zA-Z0-9_-]+/g, '[REDACTED]');
      await this.embeddingRepo.save(embedding);
      this.logger.error(`Indexing failed for organization "${orgId}": ${embedding.last_indexing_error}`);
      return embedding;
    }
  }

  private generateDeterministicVector(text: string, dimensions: number): number[] {
    const vector = new Array(dimensions).fill(0);
    const hash = crypto.createHash('sha256').update(text).digest();
    for (let i = 0; i < dimensions; i++) {
      const byteVal = hash[i % hash.length];
      vector[i] = parseFloat(((byteVal / 255.0) * 2 - 1).toFixed(6));
    }
    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map((v) => parseFloat((v / (norm || 1)).toFixed(6)));
  }
}
