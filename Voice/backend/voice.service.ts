import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyzeVoiceTurnDto,
  VoiceConversationState,
  ExtractedLocation,
  ExtractedFacts,
} from './voice.dto';

export interface TranscribeResult {
  originalTranscript: string;
  detectedLanguage: string; // 'ta', 'hi', 'en', etc.
  languageName: string;
  languageCode: string; // e.g. 'ta-IN'
  englishTranslation: string;
  confidence: number;
}

export interface VoiceTurnAnalysisResult {
  title: string;
  problem_statement: string;
  problem: string; // backwards compatibility
  domain: string | null;
  subDomain: string | null;
  location: ExtractedLocation;
  facts: ExtractedFacts;
  districtId?: string | null;
  districtName?: string | null;
  blockId?: string | null;
  blockName?: string | null;
  ward?: string | null;
  villageLocality?: string | null;
  affectedPopulation?: string | null;
  missingRequiredFields: string[];
  requiresReview: boolean;
  isDistrictMissing: boolean;
  isConstituencyMissing: boolean;
  isComplete: boolean;
  followUpQuestion: string | null;
  originalTranscript: string;
  englishTranslation: string;
  detectedLanguage: string;
  languageName: string;
}

export interface UploadedAudioFile {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
  size?: number;
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly sarvamApiKey: string;
  private readonly nvidiaApiKey: string;
  private readonly nvidiaBaseUrl: string;
  private readonly llmModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly locationsService?: any,
  ) {
    this.sarvamApiKey =
      this.configService.get<string>('SARVAM_API_KEY') ||
      process.env.SARVAM_API_KEY ||
      '';
    this.nvidiaApiKey =
      this.configService.get<string>('NVIDIA_API_KEY') ||
      process.env.NVIDIA_API_KEY ||
      '';
    this.nvidiaBaseUrl =
      this.configService.get<string>('NVIDIA_BASE_URL') ||
      process.env.NVIDIA_BASE_URL ||
      'https://integrate.api.nvidia.com/v1';
    this.llmModel =
      this.configService.get<string>('LLM_MODEL') ||
      process.env.LLM_MODEL ||
      'meta/llama-3.2-11b-vision-instruct';
  }

  /**
   * 1. Send recorded audio buffer directly to Sarvam STT API with auto language detection.
   * If non-English, translate to English via Sarvam Translate (Mayura).
   * Throws real errors if STT fails — never substitutes fake demo data.
   */
  async transcribeAudio(file: UploadedAudioFile): Promise<TranscribeResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No audio file provided for transcription.');
    }

    if (!this.sarvamApiKey) {
      throw new InternalServerErrorException(
        'SARVAM_API_KEY is not configured on the server.',
      );
    }

    try {
      // Normalize MIME type for Sarvam STT:
      // Sarvam accepts audio/mp4 and audio/x-m4a, but strictly rejects audio/m4a with HTTP 400.
      let normalizedMimeType = (file.mimetype || '').toLowerCase();
      if (
        normalizedMimeType === 'audio/m4a' ||
        normalizedMimeType === 'audio/x-m4a' ||
        !normalizedMimeType
      ) {
        normalizedMimeType = 'audio/mp4';
      }

      // Build standard multipart form using Node.js native Blob & FormData
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: normalizedMimeType,
      });
      formData.append('file', blob, file.originalname || 'recording.m4a');
      formData.append('model', 'saarika:v2.5');

      const byteLength = file.size || file.buffer.length;
      this.logger.log(
        `Sending audio recording (${byteLength} bytes) to Sarvam STT with MIME type ${normalizedMimeType}...`,
      );

      const sttResponse = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': this.sarvamApiKey,
        },
        body: formData,
      });

      if (!sttResponse.ok) {
        const errText = await sttResponse.text();
        this.logger.error(`Sarvam STT failed with HTTP ${sttResponse.status}: ${errText}`);
        throw new BadRequestException(
          `Sarvam Speech-to-Text service error (${sttResponse.status}): ${errText}`,
        );
      }

      const sttData: any = await sttResponse.json();
      const transcript = (sttData.transcript || '').trim();

      if (!transcript) {
        throw new BadRequestException(
          'No intelligible speech was recognized in the recording. Please speak clearly and record again.',
        );
      }

      const languageCode = sttData.language_code || 'en-IN';
      const confidence = typeof sttData.language_probability === 'number'
        ? sttData.language_probability
        : 0.95;

      // Extract language prefix ('ta', 'hi', 'en', etc.)
      const langPrefix = languageCode.split('-')[0].toLowerCase();
      let languageName = 'English';
      if (langPrefix === 'ta') languageName = 'Tamil (தமிழ்)';
      else if (langPrefix === 'hi') languageName = 'Hindi (हिन्दी)';
      else if (langPrefix === 'te') languageName = 'Telugu (తెలుగు)';
      else if (langPrefix === 'kn') languageName = 'Kannada (ಕನ್ನಡ)';
      else if (langPrefix === 'bn') languageName = 'Bengali (বাংলা)';

      // If language is not English, translate authoritative speech to English
      let englishTranslation = transcript;
      if (langPrefix !== 'en') {
        try {
          const transResponse = await fetch('https://api.sarvam.ai/translate', {
            method: 'POST',
            headers: {
              'api-subscription-key': this.sarvamApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: transcript,
              source_language_code: languageCode,
              target_language_code: 'en-IN',
              speaker_gender: 'Male',
              mode: 'formal',
              model: 'mayura:v1',
            }),
          });

          if (transResponse.ok) {
            const transData: any = await transResponse.json();
            if (transData.translated_text) {
              englishTranslation = transData.translated_text.trim();
            }
          } else {
            this.logger.warn(
              `Sarvam translation returned HTTP ${transResponse.status}, falling back to transcript`,
            );
          }
        } catch (transErr: any) {
          this.logger.warn(`Sarvam translation call failed: ${transErr.message}`);
        }
      }

      return {
        originalTranscript: transcript,
        detectedLanguage: langPrefix,
        languageName,
        languageCode,
        englishTranslation,
        confidence,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`transcribeAudio exception: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `Failed to transcribe audio with Sarvam: ${err.message}`,
      );
    }
  }

  /**
   * Helper to clean suffixes like "zilla", "district", "மாவட்டம்", "மாவட்ட", "வட்டம்", "வார்டு", "जिला", "वार्ड", "प्रखंड", "तहसील", "taluk", "tehsil"
   */
  private cleanLocationSuffix(name?: string | null): string | null {
    if (!name || typeof name !== 'string') return null;
    const cleaned = name
      .replace(/\b(district|dist|zilla|zila|jila|block|constituency|panchayat|village|ward|taluk|tehsil|mandal)\b/gi, '')
      .replace(/(மாவட்டம்|மாவட்ட|வட்டம்|வார்டு|தொகுதி|கிராமம்|ஊர்|தாலுகா)/g, '')
      .replace(/(जिला|वार्ड|प्रखंड|तहसील|पंचायत|गाँव|गांव|तालुक)/g, '')
      .trim();
    return cleaned || name.trim();
  }

  /**
   * Helper to parse Llama NIM response JSON robustly
   */
  private parseLlamaJson(raw: string): any {
    if (!raw || !raw.trim()) return {};
    try {
      return JSON.parse(raw);
    } catch {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      try {
        return JSON.parse(cleaned);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            return JSON.parse(match[0]);
          } catch {
            // ignore
          }
        }
        return {};
      }
    }
  }

  /**
   * Deterministic localized follow-up question generation strictly in speaker language
   */
  private getDeterministicFollowUpQuestion(
    detectedLanguage: string,
    isDistrictMissing: boolean,
    isConstituencyMissing: boolean,
  ): string | null {
    if (!isDistrictMissing && !isConstituencyMissing) {
      return null;
    }
    const lang = (detectedLanguage || 'en').toLowerCase();
    if (isDistrictMissing && isConstituencyMissing) {
      if (lang === 'ta') return 'உங்கள் மாவட்டம் மற்றும் தொகுதி அல்லது வார்டின் பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने जिले और प्रखंड या वार्ड का नाम बताएं।';
      return 'Please specify your district and constituency or block/ward.';
    }
    if (isDistrictMissing && !isConstituencyMissing) {
      if (lang === 'ta') return 'உங்கள் மாவட்டத்தின் பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने जिले का नाम बताएं।';
      return 'Please specify your district.';
    }
    if (!isDistrictMissing && isConstituencyMissing) {
      if (lang === 'ta') return 'உங்கள் தொகுதி, வார்டு அல்லது வட்டாரத்தின் பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने प्रखंड, वार्ड या विधानसभा क्षेत्र का नाम बताएं।';
      return 'Please specify your constituency, block, or ward.';
    }
    return null;
  }

  /**
   * 2. Analyze problem turn using Llama 3.2 on NVIDIA NIM:
   * - Strict fact extraction without hallucination (no fake population numbers or durations).
   * - Dynamic domain & sub-domain classification based on actual problem content.
   * - Accumulates/merges state with previousState so no prior facts are lost.
   * - Generates follow-up question strictly in detected language if district or constituency is missing.
   * - Transforms citizen raw/imperfect speech into a professional Problem Statement.
   */
  async analyzeVoiceTurn(dto: AnalyzeVoiceTurnDto): Promise<VoiceTurnAnalysisResult> {
    const { currentTranscript, detectedLanguage, englishTranslation, previousState } = dto;
    const textForAnalysis = englishTranslation || currentTranscript;

    if (!this.nvidiaApiKey) {
      throw new InternalServerErrorException(
        'NVIDIA_API_KEY is not configured on the server.',
      );
    }

    const systemPrompt = `You are the SamadhanSetu Problem Intelligence AI for citizen civic reports.
Analyze citizen speech and extract structured facts strictly without hallucination.

CRITICAL ARCHITECTURAL RULES:
1. SEPARATE RAW SPEECH FROM PROFESSIONAL PROBLEM STATEMENT:
   - The citizen's raw speech or direct translation must NOT be used directly as the final problem statement.
   - Understand the actual meaning, remove speech disfluencies, clean grammar, and produce:
     a) "title": A concise, formal headline title (under 80 characters).
     b) "problem_statement": A concise, objective, formal Problem Statement in professional English suitable for government officers, universities, researchers, and project records.
   - Only include facts actually supported by the citizen's speech.

2. STRICT FACTUALITY (NO HALLUCINATION):
   - NEVER invent population numbers, duration, causes, solutions, or technology not stated by citizen.
   - If citizen did not state how many people are affected, "affected_population" MUST be null (never invent "80 families" or "100 people").
   - If citizen did not state duration, "duration" MUST be null.
   - Extract facts into "facts": { "what_is_happening", "where", "who_is_affected", "affected_population", "duration", "frequency", "impact" }.

3. DYNAMIC DOMAIN & SUB-DOMAIN (NO KEYWORD RULES):
   - Predict domain and sub-domain semantically from the complete complaint meaning.
   - Common examples:
     * Damaged road/bridge/culvert/potholes -> domain: "Infrastructure", sub_domain: "Rural Roads" (or "Bridges & Roads")
     * Drinking water pipeline burst/contamination/dry taps -> domain: "Water & Sanitation", sub_domain: "Drinking Water"
     * School building/classroom damage/no school toilets -> domain: "Education", sub_domain: "School Infrastructure"
     * Broken streetlights/dark streets -> domain: "Infrastructure", sub_domain: "Street Lighting"
     * Hospital/clinic lack of doctors/medicines -> domain: "Healthcare", sub_domain: "Primary Care"
     * Power cut/burnt transformer/voltage -> domain: "Energy & Utilities", sub_domain: "Power Supply"
     * Canal/crop damage/irrigation -> domain: "Agriculture", sub_domain: "Irrigation & Crops"
   - If genuinely uncertain: domain: null, sub_domain: null, requires_review: true.

4. LOCATION EXTRACTION & NORMALIZATION:
   - Extract location entities mentioned in ANY language (English, Hindi, Tamil, etc.):
     "location": { "state", "district", "constituency", "ward", "block", "village", "locality", "panchayat" }.
   - If citizen mentions a taluk, tehsil, mandal, or vattam (e.g. "Manachanallur taluk" or "மணச்சநல்லூர் வட்டம்"), map it to "block" or "constituency".
   - Normalize names by removing suffixes like "zilla", "district", "மாவட்டம்", "மாவட்ட", "வட்டம்", "வார்டு", "जिला", "वार्ड", "प्रखंड", "तहसील", "तालुक", "taluk", "tehsil".
   - E.g. "Ranchi district, Ward 12" -> district: "Ranchi", ward: "12".
   - E.g. "திருச்சி மாவட்டம் மணச்சநல்லூர் வட்டம்" -> district: "Tiruchirappalli", constituency: "Manachanallur".
   - NEVER overwrite explicit citizen-provided location.

5. MULTI-TURN STATE ACCUMULATION:
   - If previousState is provided, MERGE previous facts and locations with new information. NEVER lose previously identified facts.

6. MANDATORY LOCATION VALIDATION & SAME-LANGUAGE FOLLOW-UP:
   - Mandatory geographic fields: "district" is mandatory, and either "constituency", "ward", or "block" is mandatory.
   - If BOTH district AND (constituency OR ward OR block) are present:
     * missing_required_fields: []
     * follow_up_question: null
     * DO NOT ask any question!
   - If district is present, but constituency/ward/block are all missing:
     * missing_required_fields: ["constituency"]
     * ask ONLY for constituency or block in the citizen's detected language ("${detectedLanguage}").
   - If constituency or ward is present, but district is missing:
     * missing_required_fields: ["district"]
     * ask ONLY for district in the citizen's detected language ("${detectedLanguage}").
   - If both are missing:
     * missing_required_fields: ["district", "constituency"]
     * ask for district and constituency in the citizen's detected language ("${detectedLanguage}").
   - Follow-up question MUST be polite, natural, and strictly in "${detectedLanguage}" (Tamil for 'ta', Hindi for 'hi', English for 'en').

Return ONLY a valid JSON object matching this schema:
{
  "title": string,
  "problem_statement": string,
  "domain": string | null,
  "sub_domain": string | null,
  "location": {
    "state": string | null,
    "district": string | null,
    "constituency": string | null,
    "ward": string | null,
    "block": string | null,
    "village": string | null,
    "locality": string | null,
    "panchayat": string | null
  },
  "facts": {
    "what_is_happening": string | null,
    "where": string | null,
    "who_is_affected": string | null,
    "affected_population": number | null,
    "duration": string | null,
    "frequency": string | null,
    "impact": string | null
  },
  "missing_required_fields": string[],
  "requires_review": boolean,
  "follow_up_question": string | null
}`;

    const userContent = JSON.stringify({
      currentTranscript,
      detectedLanguage,
      englishTranslation: textForAnalysis,
      previousState: previousState || null,
    });

    try {
      this.logger.log(`Invoking Llama model (${this.llmModel}) on NVIDIA NIM for turn analysis...`);

      const data: any = await this.invokeNvidiaLlamaWithRetry(systemPrompt, userContent);
      const rawJson = data.choices?.[0]?.message?.content || '{}';
      const parsed: any = this.parseLlamaJson(rawJson);

      // Extract & Clean Entities
      const rawDistrict =
        this.cleanLocationSuffix(parsed.location?.district) ||
        this.cleanLocationSuffix(parsed.district) ||
        previousState?.location?.district ||
        previousState?.districtName ||
        null;

      const rawConstituency =
        this.cleanLocationSuffix(parsed.location?.constituency) ||
        this.cleanLocationSuffix(parsed.constituency) ||
        previousState?.location?.constituency ||
        null;

      const rawWard =
        this.cleanLocationSuffix(parsed.location?.ward) ||
        previousState?.location?.ward ||
        previousState?.ward ||
        null;

      const rawBlock =
        this.cleanLocationSuffix(parsed.location?.block) ||
        this.cleanLocationSuffix(parsed.location?.taluk) ||
        this.cleanLocationSuffix(parsed.location?.tehsil) ||
        this.cleanLocationSuffix(parsed.location?.mandal) ||
        this.cleanLocationSuffix(parsed.block) ||
        previousState?.location?.block ||
        previousState?.blockName ||
        null;

      const rawVillage =
        this.cleanLocationSuffix(parsed.location?.village) ||
        this.cleanLocationSuffix(parsed.location?.locality) ||
        this.cleanLocationSuffix(parsed.village) ||
        previousState?.location?.village ||
        previousState?.villageLocality ||
        null;

      // Database Match for District and Block
      let districtId: string | null = previousState?.districtId || null;
      let blockId: string | null = previousState?.blockId || null;
      let finalDistrictName: string | null = rawDistrict;
      let finalBlockName: string | null = rawBlock || rawConstituency || (rawWard ? `Ward ${rawWard}` : null);

      if (this.locationsService) {
        try {
          const allDistricts = await this.locationsService.getDistricts();
          if (rawDistrict && allDistricts && Array.isArray(allDistricts)) {
            const dLower = rawDistrict.toLowerCase();
            const matchedD = allDistricts.find(
              (d: any) =>
                d.name?.toLowerCase() === dLower ||
                dLower.includes(d.name?.toLowerCase()) ||
                (dLower.includes('trichy') && d.name?.toLowerCase().includes('tiruchirappalli')),
            );
            if (matchedD) {
              districtId = matchedD.id;
              finalDistrictName = matchedD.name;

              const blocks = await this.locationsService.getBlocksByDistrict(matchedD.id);
              const targetLocal = (rawBlock || rawConstituency || '').toLowerCase();
              if (targetLocal && blocks && Array.isArray(blocks)) {
                const matchedB = blocks.find(
                  (b: any) =>
                    b.name?.toLowerCase() === targetLocal ||
                    targetLocal.includes(b.name?.toLowerCase()),
                );
                if (matchedB) {
                  blockId = matchedB.id;
                  finalBlockName = matchedB.name;
                }
              }
            }
          }
        } catch (locErr) {
          this.logger.warn(`Failed to match location in database: ${(locErr as Error).message}`);
        }
      }

      // Determine completeness: district is mandatory AND either constituency, ward, or block is mandatory
      const hasDistrict = Boolean(finalDistrictName || districtId);
      const hasLocalUnit = Boolean(finalBlockName || rawConstituency || rawWard || blockId);
      const isDistrictMissing = !hasDistrict;
      const isConstituencyMissing = !hasLocalUnit;
      const isComplete = !isDistrictMissing && !isConstituencyMissing;

      // Deterministic validation & follow-up question
      let followUpQuestion: string | null = null;
      let missingRequiredFields: string[] = [];

      if (isComplete) {
        followUpQuestion = null;
        missingRequiredFields = [];
      } else {
        if (isDistrictMissing && isConstituencyMissing) {
          missingRequiredFields = ['district', 'constituency'];
        } else if (isDistrictMissing) {
          missingRequiredFields = ['district'];
        } else {
          missingRequiredFields = ['constituency'];
        }

        const candidateQ = parsed.follow_up_question;
        let questionValid = Boolean(candidateQ && candidateQ.trim());
        if (questionValid) {
          const qLower = candidateQ.toLowerCase();
          if (!isDistrictMissing && (qLower.includes('district') || qLower.includes('மாவட்ட') || qLower.includes('ज़िला') || qLower.includes('जिले'))) {
            questionValid = false;
          }
          if (!isConstituencyMissing && (qLower.includes('block') || qLower.includes('ward') || qLower.includes('constituency') || qLower.includes('வட்டார') || qLower.includes('தொகுதி') || qLower.includes('प्रखंड') || qLower.includes('वार्ड'))) {
            questionValid = false;
          }
        }

        followUpQuestion = questionValid
          ? candidateQ
          : this.getDeterministicFollowUpQuestion(detectedLanguage, isDistrictMissing, isConstituencyMissing);
      }

      // Facts & Population formatting (never hallucinate population)
      const popNumber =
        parsed.facts?.affected_population != null && typeof parsed.facts?.affected_population === 'number'
          ? parsed.facts.affected_population
          : previousState?.facts?.affected_population != null
          ? previousState.facts.affected_population
          : null;

      const affectedPopulationStr =
        popNumber != null
          ? `${popNumber} people`
          : parsed.affectedPopulation || previousState?.affectedPopulation || null;

      const finalLocation: ExtractedLocation = {
        state: parsed.location?.state || previousState?.location?.state || 'Jharkhand',
        district: finalDistrictName,
        constituency: rawConstituency,
        ward: rawWard,
        block: finalBlockName,
        village: rawVillage,
        locality: parsed.location?.locality || previousState?.location?.locality || null,
        panchayat: parsed.location?.panchayat || previousState?.location?.panchayat || null,
      };

      const finalFacts: ExtractedFacts = {
        what_is_happening: parsed.facts?.what_is_happening || previousState?.facts?.what_is_happening || null,
        where: parsed.facts?.where || previousState?.facts?.where || null,
        who_is_affected: parsed.facts?.who_is_affected || previousState?.facts?.who_is_affected || null,
        affected_population: popNumber,
        duration: parsed.facts?.duration || previousState?.facts?.duration || null,
        frequency: parsed.facts?.frequency || previousState?.facts?.frequency || null,
        impact: parsed.facts?.impact || previousState?.facts?.impact || null,
      };

      // Professional Problem Statement & Title
      const problemStatement =
        parsed.problem_statement ||
        parsed.problem ||
        previousState?.problem_statement ||
        previousState?.problem ||
        textForAnalysis;

      const title =
        parsed.title ||
        previousState?.title ||
        (problemStatement.length > 60 ? problemStatement.slice(0, 57) + '...' : problemStatement);

      const domain = parsed.domain || previousState?.domain || 'Infrastructure';
      const subDomain = parsed.sub_domain || parsed.subDomain || previousState?.subDomain || 'Rural Roads';
      const requiresReview = Boolean(parsed.requires_review ?? (!domain || !subDomain));

      // Multi-turn transcript accumulation
      const fullTranscript = previousState?.originalTranscript
        ? `${previousState.originalTranscript}\n[Citizen]: ${currentTranscript}`
        : currentTranscript;

      const fullTranslation = previousState?.englishTranslation
        ? `${previousState.englishTranslation}\n[English]: ${textForAnalysis}`
        : textForAnalysis;

      let languageName = 'English';
      if (detectedLanguage === 'ta') languageName = 'Tamil (தமிழ்)';
      else if (detectedLanguage === 'hi') languageName = 'Hindi (हिन्दी)';

      return {
        title,
        problem_statement: problemStatement,
        problem: problemStatement, // backwards compatibility
        domain,
        subDomain,
        location: finalLocation,
        facts: finalFacts,
        districtId,
        districtName: finalDistrictName,
        blockId,
        blockName: finalBlockName,
        ward: rawWard,
        villageLocality: rawVillage,
        affectedPopulation: affectedPopulationStr,
        missingRequiredFields,
        requiresReview,
        isDistrictMissing,
        isConstituencyMissing,
        isComplete,
        followUpQuestion,
        originalTranscript: fullTranscript,
        englishTranslation: fullTranslation,
        detectedLanguage,
        languageName,
      };
    } catch (err: any) {
      if (err instanceof InternalServerErrorException || err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`analyzeVoiceTurn exception: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `Failed to analyze problem with Llama AI: ${err.message}`,
      );
    }
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Invokes NVIDIA NIM Llama model with exponential backoff retry for transient errors.
   * Transient status codes: 500, 502, 503, 504, 429.
   * Maximum 3 attempts:
   *   Attempt 1: immediate
   *   Attempt 2: ~1000 ms backoff
   *   Attempt 3: ~2000 ms backoff
   * Non-transient status codes (400, 401, 403, 404, 422, etc.) fail immediately without retry.
   */
  private async invokeNvidiaLlamaWithRetry(
    systemPrompt: string,
    userContent: string,
  ): Promise<any> {
    const url = `${this.nvidiaBaseUrl}/chat/completions`;
    const maxAttempts = 3;
    const transientStatuses = new Set([500, 502, 503, 504, 429]);
    let lastError: Error | null = null;

    const requestBody = JSON.stringify({
      model: this.llmModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.0,
      max_tokens: 650,
      response_format: { type: 'json_object' },
    });

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const startTime = Date.now();
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.nvidiaApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: requestBody,
          signal: AbortSignal.timeout(45000),
        });

        const elapsedTimeMs = Date.now() - startTime;
        const nvcfReqId = response.headers.get('nvcf-reqid') || '<none>';

        if (response.ok) {
          this.logger.log(
            `[NvidiaDebug] attempt: ${attempt}\n` +
            `[NvidiaDebug] URL: ${url}\n` +
            `[NvidiaDebug] model: ${this.llmModel}\n` +
            `[NvidiaDebug] HTTP status: ${response.status}\n` +
            `[NvidiaDebug] elapsedTimeMs: ${elapsedTimeMs}\n` +
            `[NvidiaDebug] nvcf-reqid: ${nvcfReqId}`,
          );
          return await response.json();
        }

        // Handle non-200 HTTP response
        const rawBody = await response.text();
        const errBody = rawBody && rawBody.trim() ? rawBody.trim() : '<empty response body>';

        this.logger.error(
          `[NvidiaDebug] attempt: ${attempt}\n` +
          `[NvidiaDebug] URL: ${url}\n` +
          `[NvidiaDebug] model: ${this.llmModel}\n` +
          `[NvidiaDebug] HTTP status: ${response.status}\n` +
          `[NvidiaDebug] elapsedTimeMs: ${elapsedTimeMs}\n` +
          `[NvidiaDebug] nvcf-reqid: ${nvcfReqId}\n` +
          `[NvidiaDebug] error body: ${errBody}`,
        );

        const isTransient = transientStatuses.has(response.status);

        if (isTransient && attempt < maxAttempts) {
          const delayMs = attempt === 1 ? 1000 : 2000;
          this.logger.warn(
            `[NvidiaDebug] Transient NVIDIA error. Retrying... (attempt ${attempt + 1} of ${maxAttempts} in ~${delayMs}ms)`,
          );
          await this.sleep(delayMs);
          continue;
        }

        // Non-transient error or exhausted all attempts
        throw new InternalServerErrorException(
          `NVIDIA Llama inference failed (${response.status}): ${errBody}`,
        );
      } catch (err: any) {
        lastError = err;
        if (err instanceof InternalServerErrorException) {
          throw err;
        }

        const elapsedTimeMs = Date.now() - startTime;
        this.logger.error(
          `[NvidiaDebug] attempt: ${attempt}\n` +
          `[NvidiaDebug] URL: ${url}\n` +
          `[NvidiaDebug] model: ${this.llmModel}\n` +
          `[NvidiaDebug] HTTP status: NetworkError\n` +
          `[NvidiaDebug] elapsedTimeMs: ${elapsedTimeMs}\n` +
          `[NvidiaDebug] nvcf-reqid: <none>\n` +
          `[NvidiaDebug] error body: ${err.message}`,
        );

        if (attempt < maxAttempts) {
          const delayMs = attempt === 1 ? 1000 : 2000;
          this.logger.warn(
            `[NvidiaDebug] Transient NVIDIA error. Retrying... (attempt ${attempt + 1} of ${maxAttempts} in ~${delayMs}ms)`,
          );
          await this.sleep(delayMs);
          continue;
        }

        throw new InternalServerErrorException(
          `NVIDIA Llama connection error: ${err.message}`,
        );
      }
    }

    throw (
      lastError ||
      new InternalServerErrorException('NVIDIA Llama inference failed after 3 attempts.')
    );
  }
}
