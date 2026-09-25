import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';

import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeAiAnalysis } from '../ai-analysis/entities/challenge-ai-analysis.entity';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { RecommendationReview } from '../reviews/entities/recommendation-review.entity';
import { JurisdictionService } from '../auth/services/jurisdiction.service';
import { ChallengeStatus, UserRole } from '../../common/enums';
import {
  ResearchIntelligenceResponseDto,
  PaperRecommendationDto,
  DatasetRecommendationDto,
} from './dto/research-recommendation-response.dto';

interface CacheEntry {
  data: ResearchIntelligenceResponseDto;
  expiresAt: number;
}

@Injectable()
export class ResearchIntelligenceService {
  private readonly logger = new Logger(ResearchIntelligenceService.name);
  private readonly researchEngineUrl: string;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ChallengeAiAnalysis)
    private readonly aiAnalysisRepo: Repository<ChallengeAiAnalysis>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(RecommendationReview)
    private readonly reviewRepo: Repository<RecommendationReview>,
    private readonly jurisdictionService: JurisdictionService,
    private readonly configService: ConfigService,
  ) {
    this.researchEngineUrl =
      this.configService.get<string>('RESEARCH_ENGINE_URL') ||
      process.env.RESEARCH_ENGINE_URL ||
      'http://127.0.0.1:8001';
  }

  /**
   * Invalidate cached recommendations for a specific challenge.
   */
  invalidateCache(challengeId: string): void {
    if (this.cache.has(challengeId)) {
      this.cache.delete(challengeId);
      this.logger.log(`Cache invalidated for challenge: ${challengeId}`);
    }
  }

  /**
   * Reactive listener: Invalidate cache when Challenge AI Analysis changes.
   */
  @OnEvent('challenge.ai_analysis.updated', { async: true })
  handleAiAnalysisUpdated(payload: { challengeId: string }): void {
    if (payload?.challengeId) {
      this.invalidateCache(payload.challengeId);
    }
  }

  /**
   * Reactive listener: Invalidate cache when Challenge content changes.
   */
  @OnEvent('challenge.updated', { async: true })
  handleChallengeUpdated(payload: { challengeId: string }): void {
    if (payload?.challengeId) {
      this.invalidateCache(payload.challengeId);
    }
  }

  /**
   * Retrieves research intelligence recommendations for a civic challenge.
   * Enforces strict RBAC and challenge access boundaries.
   */
  async getRecommendations(
    challengeId: string,
    currentUser: any,
  ): Promise<ResearchIntelligenceResponseDto> {
    const startTime = Date.now();

    // 1. Fetch challenge with relations
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
      relations: ['districtRef', 'aiAnalysis'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    // 2. Validate Access Boundary
    await this.validateUserAccess(currentUser, challenge);

    // 3. Check In-Memory Cache (24-hour TTL)
    const cached = this.cache.get(challengeId);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(
        `Cache hit for challenge ${challengeId} (Papers: ${cached.data.papers.length}, Datasets: ${cached.data.datasets.length})`,
      );
      return {
        ...cached.data,
        cached: true,
      };
    }

    // 4. Retrieve Challenge AI Analysis
    let aiAnalysis = challenge.aiAnalysis;
    if (!aiAnalysis) {
      aiAnalysis = (await this.aiAnalysisRepo.findOne({
        where: { challenge_id: challengeId },
      })) as any;
    }

    // 5. Construct ProblemDef for Recommendation Engine
    const keywordsSet = new Set<string>();
    if (Array.isArray(aiAnalysis?.keywords)) {
      aiAnalysis.keywords.forEach((k: string) => keywordsSet.add(k));
    }
    if (Array.isArray(aiAnalysis?.required_capabilities)) {
      aiAnalysis.required_capabilities.forEach((c: string) => keywordsSet.add(c));
    }
    if (Array.isArray(aiAnalysis?.required_technologies)) {
      aiAnalysis.required_technologies.forEach((t: string) => keywordsSet.add(t));
    }

    const payload = {
      problem_id: challenge.id,
      title: challenge.title,
      description:
        aiAnalysis?.summary ||
        challenge.normalized_text ||
        challenge.description,
      domain: aiAnalysis?.domain || challenge.category || 'General',
      keywords: Array.from(keywordsSet),
      top_n_papers: 10,
      top_n_datasets: 10,
    };

    // 6. Call FastAPI Recommendation Engine with 3s Timeout & Failure Isolation
    try {
      this.logger.log(
        `Calling Recommendation Engine for challenge ${challengeId} at ${this.researchEngineUrl}/v1/recommendations/research`,
      );

      const response = await fetch(
        `${this.researchEngineUrl}/v1/recommendations/research`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(3000),
        },
      );

      if (!response.ok) {
        throw new Error(`Recommendation Engine responded with status ${response.status}`);
      }

      const rawData = await response.json();
      const latency = Date.now() - startTime;
      this.logger.log(
        `FastAPI recommendation completed in ${latency}ms for challenge ${challengeId}`,
      );

      // 7. Transform to Public Response DTO
      const resultDto = this.transformToDto(challengeId, rawData);

      // 8. Cache Result (24 Hours)
      this.cache.set(challengeId, {
        data: resultDto,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      return resultDto;
    } catch (err: any) {
      this.logger.warn(
        `Recommendation Engine unavailable or timed out for challenge ${challengeId}: ${err.message}. Returning graceful fallback.`,
      );

      // Graceful fallback - Never break core SamadhanSetu functionality
      return {
        challengeId,
        papers: [],
        datasets: [],
        computedAt: new Date().toISOString(),
        status: 'unavailable',
        cached: false,
        message:
          'Research Intelligence recommendations are temporarily unavailable. Core platform functionality remains unaffected.',
      };
    }
  }

  /**
   * Validates whether the authenticated user is allowed to access
   * research recommendations for this challenge.
   */
  private async validateUserAccess(currentUser: any, challenge: Challenge): Promise<void> {
    if (!currentUser) {
      throw new ForbiddenException('Authentication required to access Research Intelligence.');
    }

    const role = currentUser.role;

    // Platform Admins have full access
    if (role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    // Citizens cannot access academic research intelligence
    if (role === UserRole.CITIZEN) {
      throw new ForbiddenException(
        'Research Intelligence is reserved for academic institutions, researchers, and government officers.',
      );
    }

    // Government Administrators and Officers
    if (role === UserRole.GOVERNMENT_ADMIN || role === UserRole.GOVERNMENT_OFFICER) {
      this.jurisdictionService.validateChallengeAccess(currentUser, challenge);
      return;
    }

    // Academic / Institutional Roles (UNIVERSITY_ADMIN, FACULTY, STUDENT, INDUSTRY)
    const isUniversityRole =
      role === UserRole.UNIVERSITY_ADMIN ||
      role === UserRole.FACULTY ||
      role === UserRole.STUDENT ||
      role === UserRole.INDUSTRY_ADMIN ||
      role === UserRole.INDUSTRY_MEMBER;

    if (isUniversityRole) {
      // Draft challenges can NEVER be accessed by outside institutions
      if (challenge.status === ChallengeStatus.DRAFT) {
        throw new ForbiddenException('Cannot access research intelligence for draft challenges.');
      }

      // Active, submitted, and validated challenges are open for institutional research & EOI exploration
      const isValidatedOrProgress =
        challenge.status === ChallengeStatus.SUBMITTED ||
        challenge.status === ChallengeStatus.PROCESSING ||
        challenge.status === ChallengeStatus.VALIDATED ||
        challenge.status === ChallengeStatus.MATCHING ||
        challenge.status === ChallengeStatus.MATCHED ||
        challenge.status === ChallengeStatus.IN_PROGRESS ||
        challenge.status === ChallengeStatus.PROJECT_INITIATED ||
        challenge.status === ChallengeStatus.COMPLETED;

      if (!isValidatedOrProgress) {
        throw new ForbiddenException(
          'Research intelligence is available only for active or submitted challenges.',
        );
      }

      return;
    }

    throw new ForbiddenException('Unauthorized role for Research Intelligence access.');
  }

  /**
   * Transforms raw FastAPI engine response into sanitized public DTO.
   */
  private transformToDto(challengeId: string, raw: any): ResearchIntelligenceResponseDto {
    const rawPapers: any[] = Array.isArray(raw?.papers) ? raw.papers : [];
    const rawDatasets: any[] = Array.isArray(raw?.datasets) ? raw.datasets : [];

    const papers: PaperRecommendationDto[] = rawPapers.map((p) => ({
      id: Number(p.id),
      title: String(p.title || 'Untitled Research Paper'),
      abstract: p.abstract || null,
      authors: Array.isArray(p.authors) ? p.authors : [],
      publicationYear: p.publication_year ? Number(p.publication_year) : null,
      venue: p.venue || null,
      doi: p.doi || null,
      paperUrl: p.paper_url || null,
      publisherUrl: p.publisher_url || null,
      openAccessUrl: p.open_access_url || null,
      pdfUrl: p.pdf_url || null,
      isOpenAccess: Boolean(p.is_open_access),
      citationCount: Number(p.citation_count || 0),
      keywords: Array.isArray(p.keywords) ? p.keywords : [],
      domain: p.domain || null,
      relevanceScore: Math.round(Number(p.relevance_score || 0) * 1000) / 1000,
      retrievalScore: Math.round(Number(p.retrieval_score || 0) * 1000) / 1000,
      scoreBreakdown: {
        semantic: Math.round(Number(p.score_breakdown?.semantic || 0) * 1000) / 1000,
        keyword: Math.round(Number(p.score_breakdown?.keyword || 0) * 1000) / 1000,
        domain: Math.round(Number(p.score_breakdown?.domain || 0) * 1000) / 1000,
        recency: p.score_breakdown?.recency != null ? Math.round(Number(p.score_breakdown.recency) * 1000) / 1000 : undefined,
        citation: p.score_breakdown?.citation != null ? Math.round(Number(p.score_breakdown.citation) * 1000) / 1000 : undefined,
      },
    }));

    const datasets: DatasetRecommendationDto[] = rawDatasets.map((d) => ({
      id: Number(d.id),
      title: String(d.name || d.title || 'Untitled Dataset'),
      name: String(d.name || d.title || 'Untitled Dataset'),
      description: d.description || null,
      domain: d.domain || null,
      keywords: Array.isArray(d.keywords) ? d.keywords : [],
      features: Array.isArray(d.features) ? d.features : [],
      geographicScope: d.geographic_scope || null,
      sizeDescription: d.size_description || null,
      format: d.format || null,
      license: d.license || null,
      sourceUrl: d.source_url || null,
      accessUrl: d.access_url || null,
      landingPage: d.source_url || d.access_url || null,
      downloadUrl: d.access_url || d.source_url || null,
      relevanceScore: Math.round(Number(d.relevance_score || 0) * 1000) / 1000,
      retrievalScore: Math.round(Number(d.retrieval_score || 0) * 1000) / 1000,
      scoreBreakdown: {
        semantic: Math.round(Number(d.score_breakdown?.semantic || 0) * 1000) / 1000,
        keyword: Math.round(Number(d.score_breakdown?.keyword || 0) * 1000) / 1000,
        domain: Math.round(Number(d.score_breakdown?.domain || 0) * 1000) / 1000,
        geographic: d.score_breakdown?.geographic != null ? Math.round(Number(d.score_breakdown.geographic) * 1000) / 1000 : undefined,
      },
    }));

    const status = papers.length > 0 || datasets.length > 0 ? 'available' : 'empty';

    return {
      challengeId,
      papers,
      datasets,
      computedAt: raw?.computed_at || new Date().toISOString(),
      status,
      cached: false,
    };
  }
}
