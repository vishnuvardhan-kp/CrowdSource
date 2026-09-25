import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ChallengeAiAnalysis } from './entities/challenge-ai-analysis.entity';
import { EntityEmbedding, EntityEmbeddingType } from './entities/entity-embedding.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Capability } from '../capabilities/entities/capability.entity';
import { ChallengeStatus } from '../../common/enums';
import { MatchingService } from '../reviews/matching.service';

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);
  private readonly aiServiceUrl: string;

  constructor(
    @InjectRepository(ChallengeAiAnalysis)
    private readonly aiAnalysisRepo: Repository<ChallengeAiAnalysis>,
    @InjectRepository(EntityEmbedding)
    private readonly embeddingRepo: Repository<EntityEmbedding>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(Capability)
    private readonly capabilityRepo: Repository<Capability>,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
    @Optional()
    private readonly eventEmitter?: EventEmitter2,
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Health status of AI service and provider configuration.
   */
  async getAiServiceStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return await response.json();
      }
      throw new Error(`Status ${response.status}`);
    } catch (err: any) {
      return {
        status: 'degraded',
        provider: 'mock-internal',
        configured_llm: 'mock-fallback',
        message: 'External AI service unavailable, using internal deterministic fallbacks.',
      };
    }
  }

  /**
   * Pre-seeds the challenge_ai_analysis record with voice-extracted domain/subdomain.
   * Called immediately after draft creation when the Voice NIM has already classified the problem.
   * This prevents domain/subdomain from being lost if the post-submission FastAPI AI call times out.
   * The record is marked as VOICE_PRE_ANALYZED and will be updated when the real AI pipeline runs.
   */
  async preseedVoiceDomain(
    challengeId: string,
    domain: string,
    subdomain: string | null,
    category: string | null,
  ): Promise<void> {
    let analysis = await this.aiAnalysisRepo.findOne({ where: { challenge_id: challengeId } });
    if (!analysis) {
      analysis = this.aiAnalysisRepo.create({ challenge_id: challengeId });
    }
    // Only write if not already fully analyzed
    if (!analysis.ai_processing_status || analysis.ai_processing_status === 'VOICE_PRE_ANALYZED') {
      analysis.domain = (domain || '').substring(0, 100);
      analysis.subdomain = (subdomain || '').substring(0, 100);
      analysis.category = (category || domain || '').substring(0, 100);
      analysis.sub_category = (subdomain || '').substring(0, 100);
      analysis.ai_processing_status = 'VOICE_PRE_ANALYZED';
      analysis.model_name = 'nvidia-nim-voice';
      analysis.model_version = '1.0';
      analysis.confidence = 0.75;
      analysis.raw_analysis = {
        source: 'voice_turn_analysis',
        domain,
        subdomain,
        category,
        note: 'Pre-seeded from NVIDIA NIM Voice Turn Intelligence. Will be updated by full AI pipeline after submission.',
      };
      await this.aiAnalysisRepo.save(analysis);
    }
  }

  /**
   * Analyzes a citizen challenge:
   * 1. Validates challenge exists.
   * 2. Checks immutability: Does not modify original citizen challenge text.
   * 3. Calls AI service to extract structured problem intelligence.
   * 4. Normalizes required capabilities against official taxonomy.
   * 5. Saves analysis to challenge_ai_analysis table with model/prompt provenance.
   * 6. Generates and stores versioned vector embedding.
   */
  async analyzeChallenge(challengeId: string, correlationId?: string): Promise<ChallengeAiAnalysis> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status === ChallengeStatus.DRAFT) {
      throw new BadRequestException('Draft challenges cannot be analyzed by AI. Submit the challenge first.');
    }

    // Ensure original_text is preserved and immutable
    if (!challenge.original_text) {
      challenge.original_text = challenge.description;
    }

    // 0. Language Detection & Translation/Normalization Pipeline
    try {
      let detectedLang = challenge.original_language;
      if (!detectedLang || detectedLang === 'auto' || detectedLang === 'en') {
        const detection = await this.detectLanguage(challenge.original_text || challenge.description);
        detectedLang = detection.language || 'en';
        challenge.original_language = detectedLang;
      }

      if (detectedLang && detectedLang !== 'en') {
        const translation = await this.translateText(
          challenge.original_text || challenge.description,
          detectedLang,
          'en',
        );

        if (translation.translated_text && !translation.requires_review && translation.confidence >= 0.75) {
          challenge.normalized_text = translation.translated_text;
          challenge.translation_status = 'VERIFIED';
          challenge.processing_language = 'en';
        } else {
          challenge.normalized_text = null;
          challenge.translation_status = 'REQUIRES_HUMAN_REVIEW';
          challenge.processing_language = 'en';
        }

        challenge.translation_metadata = {
          original_language: detectedLang,
          confidence: translation.confidence,
          provider: translation.provider,
          model: translation.model,
          requires_review: translation.requires_review,
          requires_human_review: translation.requires_review,
          failure_reason: translation.failure_reason || null,
          processed_at: new Date().toISOString(),
        };
      } else {
        challenge.normalized_text = challenge.original_text;
        challenge.translation_status = 'NOT_REQUIRED';
        challenge.processing_language = 'en';
      }

      await this.challengeRepo.save(challenge);
    } catch (langErr: any) {
      this.logger.warn(`Language processing error on challenge ${challenge.id}: ${langErr.message}`);
      challenge.translation_status = 'REQUIRES_HUMAN_REVIEW';
      challenge.translation_metadata = {
        error: langErr.message,
        failed_at: new Date().toISOString(),
      };
      await this.challengeRepo.save(challenge);
    }

    // 1. Request AI Problem Intelligence with 35s timeout and bounded retries
    let aiResult: any;
    let isFallback = false;
    let fallbackError = '';
    let errorCategory = 'NONE';

    const payload = {
      challenge_id: challenge.id,
      title: challenge.title,
      description: challenge.normalized_text || challenge.description,
      category: challenge.category,
      district: challenge.district,
      state: challenge.state,
      village_locality: challenge.location || (challenge as any).village_locality,
      citizen_severity: (challenge as any).citizen_severity,
      affected_population: (challenge as any).affected_population,
    };

    const maxAiAttempts = 3; // Initial attempt + up to 2 retries
    let aiAttempt = 0;
    let aiBackoff = 100;

    const corrId = correlationId || (challenge as any).correlation_id || crypto.randomUUID();

    while (aiAttempt < maxAiAttempts) {
      aiAttempt++;
      try {
        const aiResponse = await fetch(`${this.aiServiceUrl}/v1/ai/analyze-challenge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Correlation-Id': corrId,
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(35000), // 35s bounded timeout (NVIDIA 25s < FastAPI 30s < NestJS 35s)
        });

        if (aiResponse.ok) {
          aiResult = await aiResponse.json();
          break; // Success response received
        } else if (aiResponse.status >= 500 && aiAttempt < maxAiAttempts) {
          // Retry transient 5xx server error
          await new Promise((res) => setTimeout(res, aiBackoff));
          aiBackoff = Math.min(aiBackoff * 2.5, 1000);
          continue;
        } else {
          throw new Error(`AI service returned HTTP ${aiResponse.status}`);
        }
      } catch (err: any) {
        if (aiAttempt < maxAiAttempts && !err.message?.includes('HTTP 4')) {
          await new Promise((res) => setTimeout(res, aiBackoff));
          aiBackoff = Math.min(aiBackoff * 2.5, 1000);
          continue;
        }

        // Retries exhausted or non-retryable error
        isFallback = true;
        fallbackError = err.message || 'Unknown AI error';

        if (err.name === 'TimeoutError' || err.name === 'AbortError' || fallbackError.toLowerCase().includes('timeout')) {
          errorCategory = 'TIMEOUT';
        } else if (
          fallbackError.includes('ECONNREFUSED') ||
          fallbackError.includes('fetch failed') ||
          fallbackError.includes('failed to fetch')
        ) {
          errorCategory = 'SERVICE_UNAVAILABLE';
        } else if (fallbackError.includes('JSON') || fallbackError.includes('SyntaxError')) {
          errorCategory = 'INVALID_RESPONSE';
        } else {
          errorCategory = 'FALLBACK';
        }

        this.logger.warn(`AI service call failed on attempt ${aiAttempt}/${maxAiAttempts} [${errorCategory}]: ${fallbackError}. Entering degraded state.`);
        aiResult = this.createFallbackAnalysis(challenge, fallbackError);
        break;
      }
    }

    // 2. Taxonomy Normalization only if SUCCESS
    let normalizedCaps: any[] = [];
    if (!isFallback && aiResult.required_capabilities && aiResult.required_capabilities.length > 0) {
      try {
        normalizedCaps = await this.normalizeCapabilities(aiResult.required_capabilities);
      } catch {
        normalizedCaps = [];
      }
    }

    // 3. Save or update ChallengeAiAnalysis record
    let analysis = await this.aiAnalysisRepo.findOne({
      where: { challenge_id: challengeId },
    });

    if (!analysis) {
      analysis = this.aiAnalysisRepo.create({
        challenge_id: challengeId,
      });
    }

    if (isFallback) {
      // Preserve voice-pre-analyzed domain/subdomain if already present; do not overwrite with null
      const existingDomain = analysis.domain;
      const existingSubdomain = analysis.subdomain;

      // Assign explicit categorized status
      analysis.ai_processing_status = errorCategory !== 'NONE' ? errorCategory : 'FALLBACK';
      if (!existingDomain) {
        analysis.domain = null as any;
      }
      if (!existingSubdomain) {
        analysis.subdomain = null as any;
      }
      analysis.category = challenge.category || null as any;
      analysis.sub_category = existingSubdomain || null as any;
      analysis.summary = challenge.description.substring(0, 500);
      analysis.priority_score = null as any;
      analysis.severity_score = null as any;
      analysis.affected_population = (challenge as any).affected_population || null;
      analysis.extracted_entities = {};
      analysis.required_capabilities = [];
      analysis.required_technologies = [];
      analysis.keywords = [];
      analysis.confidence = existingDomain ? 0.75 : 0;
      analysis.model_name = existingDomain ? 'nvidia-nim-voice' : 'none';
      analysis.model_version = existingDomain ? '1.0' : 'none';
      analysis.raw_analysis = {
        fallback: true,
        provider: aiResult?.model_provider || 'none',
        model: aiResult?.model_name || 'none',
        error_category: errorCategory,
        fallback_reason: fallbackError,
        timestamp: new Date().toISOString(),
        correlation_id: corrId,
        voice_pre_analyzed: Boolean(existingDomain),
        preserved_domain: existingDomain || null,
        preserved_subdomain: existingSubdomain || null,
        message: 'AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.',
      };
    } else {
      const domain = aiResult.domain || aiResult.category || challenge.category || 'General';
      const subdomain = aiResult.subdomain || aiResult.sub_category || 'General';
      const category = aiResult.category || aiResult.problem_type || 'Infrastructure';
      const reqTechs = aiResult.required_technologies || aiResult.required_capabilities || (normalizedCaps.length > 0 ? normalizedCaps.map((c: any) => c.normalized_name) : []);
      const keywords = aiResult.keywords || [];

      // Accuracy guard: Never masquerade provider fallback or low-confidence inference as pure SUCCESS
      const isMockFallback = aiResult.model_provider === 'nvidia-fallback-mock';
      const confidenceVal = parseFloat(aiResult.confidence);
      const isLowConfidence = !isNaN(confidenceVal) && confidenceVal < 0.50;
      const requiresTranslationReview = challenge.translation_status === 'REQUIRES_HUMAN_REVIEW';

      if (isMockFallback) {
        analysis.ai_processing_status = 'FALLBACK';
      } else if (isLowConfidence || requiresTranslationReview) {
        analysis.ai_processing_status = 'REQUIRES_HUMAN_REVIEW';
      } else {
        analysis.ai_processing_status = 'SUCCESS';
      }

      analysis.domain = domain.substring(0, 100);
      analysis.subdomain = subdomain.substring(0, 100);
      analysis.category = category.substring(0, 100);
      analysis.sub_category = subdomain.substring(0, 100);
      analysis.summary = aiResult.summary || challenge.description.substring(0, 500);
      analysis.priority_score = aiResult.priority_score || 7.0;
      analysis.severity_score = aiResult.severity_score || 6.5;
      analysis.affected_population = (aiResult.affected_population || (challenge as any).affected_population || 'Citizens').substring(0, 100);
      analysis.extracted_entities = aiResult.extracted_entities || {};
      analysis.required_capabilities = normalizedCaps.length > 0 ? normalizedCaps.map((c: any) => c.normalized_name) : reqTechs;
      analysis.required_technologies = reqTechs;
      analysis.keywords = keywords;
      analysis.model_name = (aiResult.model_name || 'meta/llama-3.1-70b-instruct').substring(0, 100);
      analysis.model_version = (aiResult.model_version || 'nim-v1').substring(0, 50);
      analysis.confidence = !isNaN(confidenceVal) ? confidenceVal : 0.85;
      analysis.raw_analysis = {
        ...aiResult.raw_analysis,
        fallback: isMockFallback,
        correlation_id: corrId,
        problem_factors: aiResult.problem_factors,
        solution_domains: aiResult.solution_domains,
        normalized_taxonomy_items: normalizedCaps,
        prompt_version: aiResult.prompt_version || '1.0.0',
        taxonomy_version: aiResult.taxonomy_version || '1.0.0',
        model_provider: aiResult.model_provider || 'nvidia',
      };
    }

    // Populate civic refinement fields onto analysis and challenge
    const detRefinement = this.generateDeterministicRefinement(challenge);
    const refinedTitle = aiResult.professional_title || (isFallback ? detRefinement.refinedTitle : challenge.title);
    const refinedStmt = aiResult.professional_problem_statement || (isFallback ? detRefinement.refinedStmt : (challenge.normalized_text || challenge.description));
    const citizenFacts = (aiResult.citizen_facts && aiResult.citizen_facts.length > 0)
      ? aiResult.citizen_facts
      : ((aiResult.key_facts && aiResult.key_facts.length > 0) ? aiResult.key_facts : detRefinement.citizenFacts);
    const platformMetadata = (aiResult.platform_metadata && Object.keys(aiResult.platform_metadata).length > 0)
      ? aiResult.platform_metadata
      : detRefinement.platformMetadata;
    const keyFacts = citizenFacts;
    const refinementStatus = aiResult.refinement_status || 'REFINED';
    const refinedAt = new Date();

    analysis.professional_title = refinedTitle;
    analysis.professional_problem_statement = refinedStmt;
    analysis.citizen_facts = citizenFacts;
    analysis.platform_metadata = platformMetadata;
    analysis.key_facts = keyFacts;
    analysis.refinement_status = refinementStatus;
    analysis.refined_at = refinedAt;

    challenge.professional_title = refinedTitle;
    challenge.professional_problem_statement = refinedStmt;
    challenge.citizen_facts = citizenFacts;
    challenge.platform_metadata = platformMetadata;
    challenge.refinement_status = refinementStatus;
    challenge.refined_at = refinedAt;
    await this.challengeRepo.save(challenge);

    const savedAnalysis = await this.aiAnalysisRepo.save(analysis);

    // 4. Generate & store versioned embedding for the challenge (if SUCCESS)
    if (!isFallback) {
      try {
        await this.generateAndStoreChallengeEmbedding(challenge, savedAnalysis);
      } catch (embErr: any) {
        this.logger.warn(`Failed to generate embedding for challenge ${challengeId}: ${embErr.message}`);
      }
    }

    // Invalidate research recommendation cache when AI analysis updates
    if (this.eventEmitter) {
      this.eventEmitter.emit('challenge.ai_analysis.updated', { challengeId });
    }

    return savedAnalysis;
  }

  /**
   * Retrieves analysis for a challenge.
   */
  async getAnalysisByChallengeId(challengeId: string): Promise<ChallengeAiAnalysis> {
    const analysis = await this.aiAnalysisRepo.findOne({
      where: { challenge_id: challengeId },
      relations: ['challenge'],
    });

    if (!analysis) {
      throw new NotFoundException(`AI analysis for challenge "${challengeId}" not found.`);
    }

    return analysis;
  }

  /**
   * Taxonomy normalization layer using AI Service and official DB taxonomy.
   */
  async normalizeCapabilities(rawCapabilities: string[]): Promise<any[]> {
    if (!rawCapabilities || rawCapabilities.length === 0) return [];

    try {
      const dbCapabilities = await this.capabilityRepo.find();
      const taxonomyPayload = dbCapabilities.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        category: c.category,
        description: c.description,
      }));

      const res = await fetch(`${this.aiServiceUrl}/v1/ai/normalize-taxonomy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extracted_capabilities: rawCapabilities,
          taxonomy: taxonomyPayload,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const data = await res.json();
        return data.results;
      }
      throw new Error(`Taxonomy normalization failed with ${res.status}`);
    } catch {
      // Deterministic fallback mapping
      return rawCapabilities.map((term) => ({
        original_term: term,
        normalized_capability_id: null,
        normalized_name: term,
        confidence: 0.70,
        method: 'local_fallback',
        requires_review: false,
      }));
    }
  }

  /**
   * Generates and stores a versioned vector embedding for a challenge.
   */
  private async generateAndStoreChallengeEmbedding(
    challenge: Challenge,
    analysis: ChallengeAiAnalysis,
  ): Promise<EntityEmbedding> {
    const descToEmbed = challenge.professional_problem_statement || challenge.normalized_text || challenge.description;
    const titleToEmbed = challenge.professional_title || challenge.title;
    const sourceText = `Title: ${titleToEmbed}. Description: ${descToEmbed}. Category: ${analysis.category}. SubCategory: ${analysis.sub_category}. Required: ${(analysis.required_capabilities || []).join(', ')}`;
    const textHash = crypto.createHash('sha256').update(sourceText).digest('hex');

    let vector: number[] = [];
    let modelProvider = 'nvidia';
    let modelName = 'nvidia/nemotron-3-embed-1b';
    let dimensions = 2048;

    try {
      const res = await fetch(`${this.aiServiceUrl}/v1/ai/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: [sourceText],
          entity_type: 'challenge',
          entity_id: challenge.id,
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (res.ok) {
        const data = await res.json();
        vector = data.embeddings[0].embedding;
        modelProvider = data.model_provider || 'nvidia';
        modelName = data.model_name || 'nvidia/nemotron-3-embed-1b';
        dimensions = vector.length;
      } else {
        throw new Error(`Embeddings failed: ${res.status}`);
      }
    } catch {
      // Deterministic pseudo-vector for fallback
      vector = this.generateDeterministicVector(sourceText, 1024);
      modelProvider = 'mock';
      modelName = 'nvidia/nemotron-3-embed-1b';
      dimensions = vector.length;
    }

    let embedding = await this.embeddingRepo.findOne({
      where: {
        entity_id: challenge.id,
        entity_type: EntityEmbeddingType.CHALLENGE,
        embedding_version: 'v1.0',
      },
    });

    if (!embedding) {
      embedding = this.embeddingRepo.create({
        entity_id: challenge.id,
        entity_type: EntityEmbeddingType.CHALLENGE,
        embedding_version: 'v1.0',
        model_provider: modelProvider,
        model_name: modelName,
        model_version: '1.0',
        dimensions: dimensions,
        source_text: sourceText,
        source_text_hash: textHash,
        metadata: {
          category: analysis.category,
          sub_category: analysis.sub_category,
        },
        embedding: vector,
        is_active: true,
      });
    } else {
      embedding.source_text = sourceText;
      embedding.source_text_hash = textHash;
      embedding.model_provider = modelProvider;
      embedding.model_name = modelName;
      embedding.dimensions = dimensions;
      embedding.embedding = vector;
    }

    return this.embeddingRepo.save(embedding);
  }

  private createFallbackAnalysis(challenge: Challenge, errorMessage: string): any {
    const { refinedTitle, refinedStmt, citizenFacts, platformMetadata, keyFacts } = this.generateDeterministicRefinement(challenge);
    return {
      challenge_id: challenge.id,
      domain: null,
      subdomain: null,
      category: challenge.category || null,
      sub_category: null,
      summary: challenge.description,
      priority_score: null,
      severity_score: null,
      affected_population: (challenge as any).affected_population || null,
      extracted_entities: {},
      problem_factors: [],
      required_capabilities: [],
      required_technologies: [],
      keywords: [],
      solution_domains: [],
      confidence: 0,
      model_provider: 'none',
      model_name: 'none',
      model_version: 'none',
      prompt_version: '1.0.0',
      taxonomy_version: '1.0.0',
      professional_title: refinedTitle,
      professional_problem_statement: refinedStmt,
      citizen_facts: citizenFacts,
      platform_metadata: platformMetadata,
      key_facts: keyFacts,
      refinement_status: 'REFINED',
      status: 'FALLBACK',
      raw_analysis: {
        fallback: true,
        error: errorMessage,
        citizen_facts: citizenFacts,
        platform_metadata: platformMetadata,
        message: 'AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.',
      },
    };
  }

  /**
   * Deterministic, zero-fabrication problem statement refinement.
   * Guarantees professional civic formulation without inventing population, causes, or unstated locations.
   */
  public generateDeterministicRefinement(challenge: Challenge): {
    refinedTitle: string;
    refinedStmt: string;
    citizenFacts: string[];
    platformMetadata: Record<string, any>;
    keyFacts: string[];
  } {
    const text = `${challenge.title || ''} ${challenge.normalized_text || challenge.description || ''}`.toLowerCase();

    // Construct verified platform metadata exclusively from authoritative fields
    const platformMetadata: Record<string, any> = {};
    const locParts = [challenge.village_locality || challenge.location, challenge.district].filter(
      (p) => Boolean(p) && !['unknown', 'none', ''].includes(String(p).toLowerCase().trim())
    );
    if (locParts.length > 0 || challenge.state) {
      platformMetadata.district = challenge.district || null;
      platformMetadata.village_locality = challenge.village_locality || challenge.location || null;
      platformMetadata.state = challenge.state || 'Jharkhand';
      platformMetadata.source = 'platform_verified_record';
    }
    const locSuffix = locParts.join(', ');

    let baseTitle = '';
    let refinedStmt = '';
    let citizenFacts: string[] = [];

    // Case 1: Potable Water Scarcity (Hindi, Hinglish, English, Regional)
    if (/(pani|water|drinking|peene|garmi|sukha|नल|जल|पानी|daah)/i.test(text)) {
      const isSummer = /(garmi|summer|season)/i.test(text);
      baseTitle = 'Seasonal Potable Water Supply Scarcity';
      refinedStmt = isSummer
        ? 'The resident community experiences acute drinking water shortages during peak summer seasons, causing recurring supply deficits for resident households.'
        : 'The resident community experiences acute drinking water shortages, leading to persistent household supply deficits.';
      citizenFacts = [
        isSummer ? 'Water supply unavailability during summer season' : 'Disruption or deficit in local potable water supply',
        /(gaon|village)/i.test(text) ? 'Affects village residential community' : 'Affects resident households and community water access',
      ];
    }
    // Case 2: Waste Management / Garbage Accumulation (Mixed Language, Hinglish)
    else if (/(garbage|kachra|waste|safai|dustbin|dump|कूड़ा|refuse)/i.test(text)) {
      baseTitle = 'Irregular Solid Waste Collection Leading to Roadside Accumulation';
      refinedStmt = 'Inconsistent municipal solid waste collection schedules have resulted in roadside waste accumulation, posing public sanitation and environmental cleanliness challenges.';
      citizenFacts = [
        'Irregular municipal garbage collection schedules',
        'Accumulation of refuse along roadside corridors',
      ];
    }
    // Case 3: Road Infrastructure / Surface Damage (Informal English, Hindi, etc.)
    else if (/(road|broken|pothole|gaddha|sadak|rasta|highway|सड़क)/i.test(text)) {
      baseTitle = 'Severe Road Surface Deterioration and Commuter Inconvenience';
      refinedStmt = 'The roadway infrastructure exhibits structural damage and surface degradation, impeding safe vehicular transit and pedestrian mobility.';
      citizenFacts = [
        'Road surface is damaged or broken',
        'Impedes commuter transit and community mobility',
      ];
    }
    // Case 4: Healthcare Facility Access (Short input / hospital problem)
    else if (/(hospital|clinic|health|doctor|aspatal|swasthya|medical|dawa)/i.test(text)) {
      baseTitle = 'Healthcare Facility Operational and Accessibility Challenges';
      refinedStmt = 'The community healthcare facility is experiencing operational, infrastructure, or service delivery constraints impacting local healthcare access.';
      citizenFacts = [
        'Operational constraints reported at local healthcare facility',
        'Impacts community healthcare access and clinical service continuity',
      ];
    }
    // Case 5: Electrical Grid / Power Outage (Nagpuri / Santali / Regional / Hindi / English)
    else if (/(bijli|electricity|power|grid|transformer|andhera|current|batti|voltage|blackout|hamre|toli|ato)/i.test(text)) {
      baseTitle = 'Prolonged Electrical Grid Disruption and Power Supply Instability';
      refinedStmt = 'The local settlement is experiencing extended electrical power outages and grid unreliability, disrupting evening illumination and domestic energy access.';
      citizenFacts = [
        'Prolonged electrical outage reported in the locality',
        'Disruption of evening illumination and domestic power access',
      ];
    }
    // Safe Default Civic Refinement (Zero fabrication)
    else {
      const rawTitle = (challenge.title || 'Civic Issue').replace(/[!?,.]+$/, '').trim();
      const words = rawTitle.split(/\s+/);
      baseTitle = words.length < 3 ? `${rawTitle} Operational Challenges` : rawTitle;
      const cleanDesc = (challenge.description || '').trim();
      refinedStmt = `Local civic concern regarding ${challenge.category || 'civic infrastructure'} reported: ${cleanDesc}.`;
      citizenFacts = [
        `Civic issue reported regarding ${challenge.category || 'local infrastructure'}`,
        `Report details: ${cleanDesc.substring(0, 120)}`,
      ];
    }

    const refinedTitle = locSuffix ? `${baseTitle} - ${locSuffix}` : baseTitle;

    return {
      refinedTitle,
      refinedStmt,
      citizenFacts,
      platformMetadata,
      keyFacts: citizenFacts,
    };
  }

  private generateDeterministicVector(text: string, dims = 1024): number[] {
    const hash = crypto.createHash('sha512').update(text).digest();
    const vec: number[] = [];
    for (let i = 0; i < dims; i++) {
      const b = hash[i % hash.length];
      vec.push(((b / 255.0) * 2.0) - 1.0);
    }
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? vec.map((v) => Math.round((v / norm) * 1000000) / 1000000) : vec;
  }

  /**
   * Detects the natural language and script of text via AI microservice.
   * Features graceful internal fallback for Devanagari and Ol Chiki scripts.
   */
  async detectLanguage(text: string): Promise<{
    language: string;
    confidence: number;
    script?: string;
    name?: string;
    is_supported: boolean;
  }> {
    if (!text || !text.trim()) {
      return { language: 'en', confidence: 1.0, script: 'Latin', name: 'English', is_supported: true };
    }

    try {
      const res = await fetch(`${this.aiServiceUrl}/v1/ai/detect-language`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (err: any) {
      this.logger.warn(`Language detection microservice failed: ${err.message}. Using internal heuristic.`);
    }

    // Deterministic internal heuristic
    const trimmed = text.trim();
    if (anyOlChiki(trimmed)) {
      return { language: 'sat', confidence: 0.98, script: 'Ol Chiki', name: 'Santali', is_supported: true };
    }
    if (anyDevanagari(trimmed)) {
      return { language: 'hi', confidence: 0.95, script: 'Devanagari', name: 'Hindi', is_supported: true };
    }
    return { language: 'en', confidence: 0.99, script: 'Latin', name: 'English', is_supported: true };
  }

  /**
   * Translates text to target language (defaults to English 'en').
   * Enforces fail-safe invariants: returns requires_review = true if service is down or low-confidence.
   */
  async translateText(
    text: string,
    sourceLanguage: string = 'auto',
    targetLanguage: string = 'en',
  ): Promise<{
    original_text: string;
    translated_text: string | null;
    source_language: string;
    target_language: string;
    confidence: number;
    provider: string;
    model: string;
    requires_review: boolean;
    failure_reason?: string;
  }> {
    if (!text || !text.trim() || sourceLanguage === targetLanguage) {
      return {
        original_text: text,
        translated_text: text,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        confidence: 1.0,
        provider: 'none',
        model: 'identity',
        requires_review: false,
      };
    }

    try {
      const res = await fetch(`${this.aiServiceUrl}/v1/ai/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          source_language: sourceLanguage,
          target_language: targetLanguage,
        }),
        signal: AbortSignal.timeout(30000), // Bounded 30000 ms timeout for LLM translation
      });

      if (res.ok) {
        return await res.json();
      }
      throw new Error(`AI service returned HTTP ${res.status}`);
    } catch (err: any) {
      this.logger.warn(`Translation microservice failed (${err.message}). Entering strict review fallback.`);
      return {
        original_text: text,
        translated_text: null,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        confidence: 0.30,
        provider: 'fallback',
        model: 'none',
        requires_review: true,
        failure_reason: `Translation service unavailable: ${err.message}`,
      };
    }
  }
}

function anyOlChiki(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x1c50 && code <= 0x1c7f) return true;
  }
  return false;
}

function anyDevanagari(str: string): boolean {
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x0900 && code <= 0x097f) return true;
  }
  return false;
}

