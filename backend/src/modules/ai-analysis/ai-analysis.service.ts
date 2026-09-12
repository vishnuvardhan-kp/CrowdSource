import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
  Optional,
} from '@nestjs/common';
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
  ) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
  }

  /**
   * Health status of AI service and provider configuration.
   */
  async getAiServiceStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.aiServiceUrl}/health`, {
        signal: AbortSignal.timeout(3000),
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
   * Analyzes a citizen challenge:
   * 1. Validates challenge exists.
   * 2. Checks immutability: Does not modify original citizen challenge text.
   * 3. Calls AI service to extract structured problem intelligence.
   * 4. Normalizes required capabilities against official taxonomy.
   * 5. Saves analysis to challenge_ai_analysis table with model/prompt provenance.
   * 6. Generates and stores versioned vector embedding.
   */
  async analyzeChallenge(challengeId: string): Promise<ChallengeAiAnalysis> {
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

    // 1. Request AI Problem Intelligence with strict 3000ms bounded timeout
    let aiResult: any;
    let isFallback = false;
    let fallbackError = '';

    try {
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

      const aiResponse = await fetch(`${this.aiServiceUrl}/v1/ai/analyze-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000), // Strict 3000 ms hard bound
      });

      if (aiResponse.ok) {
        aiResult = await aiResponse.json();
      } else {
        throw new Error(`AI service returned HTTP ${aiResponse.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`AI service call failed (${err.message}). Entering strict FALLBACK state.`);
      isFallback = true;
      fallbackError = err.message;
      aiResult = this.createFallbackAnalysis(challenge, err.message);
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
      analysis.ai_processing_status = 'FALLBACK';
      analysis.domain = null as any;
      analysis.subdomain = null as any;
      analysis.category = challenge.category || null as any;
      analysis.sub_category = null as any;
      analysis.summary = challenge.description.substring(0, 500);
      analysis.priority_score = null as any;
      analysis.severity_score = null as any;
      analysis.affected_population = (challenge as any).affected_population || null;
      analysis.extracted_entities = {};
      analysis.required_capabilities = [];
      analysis.required_technologies = [];
      analysis.keywords = [];
      analysis.confidence = 0;
      analysis.model_name = 'none';
      analysis.model_version = 'none';
      analysis.raw_analysis = {
        fallback: true,
        error: fallbackError,
        message: 'AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.',
      };
    } else {
      const domain = aiResult.domain || aiResult.category || challenge.category || 'General';
      const subdomain = aiResult.subdomain || aiResult.sub_category || 'General';
      const category = aiResult.category || aiResult.problem_type || 'Infrastructure';
      const reqTechs = aiResult.required_technologies || aiResult.required_capabilities || (normalizedCaps.length > 0 ? normalizedCaps.map((c: any) => c.normalized_name) : []);
      const keywords = aiResult.keywords || [];

      analysis.ai_processing_status = 'SUCCESS';
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
      analysis.confidence = aiResult.confidence || 0.85;
      analysis.raw_analysis = {
        ...aiResult.raw_analysis,
        problem_factors: aiResult.problem_factors,
        solution_domains: aiResult.solution_domains,
        normalized_taxonomy_items: normalizedCaps,
        prompt_version: aiResult.prompt_version || '1.0.0',
        taxonomy_version: aiResult.taxonomy_version || '1.0.0',
        model_provider: aiResult.model_provider || 'nvidia',
      };
    }

    const savedAnalysis = await this.aiAnalysisRepo.save(analysis);

    // 4. Generate & store versioned embedding for the challenge (if SUCCESS)
    if (!isFallback) {
      try {
        await this.generateAndStoreChallengeEmbedding(challenge, savedAnalysis);
      } catch (embErr: any) {
        this.logger.warn(`Failed to generate embedding for challenge ${challengeId}: ${embErr.message}`);
      }
    }

    // IMPORTANT WORKFLOW BOUNDARY: Capability matching is strictly decoupled from submission.
    // Institution recommendation generation is performed ONLY after Government Verification.

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
        signal: AbortSignal.timeout(5000),
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
    const descToEmbed = challenge.normalized_text || challenge.description;
    const sourceText = `Title: ${challenge.title}. Description: ${descToEmbed}. Category: ${analysis.category}. SubCategory: ${analysis.sub_category}. Required: ${(analysis.required_capabilities || []).join(', ')}`;
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
      status: 'FALLBACK',
      raw_analysis: {
        fallback: true,
        error: errorMessage,
        message: 'AI structuring is temporarily unavailable. Your problem has still been submitted successfully and will continue through the verification workflow.',
      },
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
        signal: AbortSignal.timeout(3000),
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
        signal: AbortSignal.timeout(4000),
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

