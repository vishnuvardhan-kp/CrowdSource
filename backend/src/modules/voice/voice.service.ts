import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocationsService } from '../locations/locations.service';
import {
  AnalyzeVoiceTurnDto,
  VoiceConversationState,
  ExtractedLocation,
  ExtractedFacts,
} from './voice.dto';
import {
  TranscribeResult,
  VoiceTurnAnalysisResult,
  UploadedAudioFile,
} from './voice.types';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

const ALLOWED_AUDIO_MIMES = new Set([
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/aac',
  'audio/mpeg',
  'audio/mp3',
  'audio/webm',
  'audio/ogg',
]);

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private readonly sarvamApiKey: string;
  private readonly nvidiaApiKey: string;
  private readonly nvidiaBaseUrl: string;
  private readonly llmModel: string;

  constructor(
    private readonly configService: ConfigService,
    @Optional()
    private readonly locationsService?: LocationsService,
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
   * Helper to persist recorded audio file to uploads/evidence directory
   * so it can be referenced as persistent audio evidence in the challenge.
   */
  private async persistVoiceRecording(file: UploadedAudioFile): Promise<{ audioUrl: string; audioFilename: string }> {
    try {
      const uploadDir = path.resolve(
        process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads', 'evidence'),
      );
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      let ext = '.m4a';
      if (file.originalname && path.extname(file.originalname)) {
        ext = path.extname(file.originalname);
      } else if (file.mimetype) {
        if (file.mimetype.includes('webm')) ext = '.webm';
        else if (file.mimetype.includes('wav')) ext = '.wav';
        else if (file.mimetype.includes('mp3')) ext = '.mp3';
        else if (file.mimetype.includes('mp4')) ext = '.mp4';
      }

      const audioFilename = `voice-${randomUUID()}${ext}`;
      const targetPath = path.join(uploadDir, audioFilename);
      await fs.promises.writeFile(targetPath, file.buffer);

      const audioUrl = `/api/challenges/evidence/file/${audioFilename}`;
      return { audioUrl, audioFilename };
    } catch (saveErr: any) {
      this.logger.warn(`Could not persist voice recording file: ${saveErr.message}`);
      return { audioUrl: '', audioFilename: '' };
    }
  }

  /**
   * 1. Send recorded audio buffer to Sarvam STT API with auto language detection.
   * If non-English, translate to English via Sarvam Translate (Mayura).
   * Validates file size (<= 25MB) and MIME format.
   */
  async transcribeAudio(file: UploadedAudioFile): Promise<TranscribeResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No audio file provided for transcription.');
    }

    const byteLength = file.size || file.buffer.length;
    if (byteLength > MAX_AUDIO_SIZE_BYTES) {
      throw new BadRequestException(
        `Audio file size (${(byteLength / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of 25MB.`,
      );
    }

    const rawMime = (file.mimetype || '').toLowerCase();
    if (rawMime && !ALLOWED_AUDIO_MIMES.has(rawMime)) {
      throw new BadRequestException(
        `Unsupported audio format: "${rawMime}". Allowed audio formats: MP4, M4A, WAV, AAC, MP3, WebM.`,
      );
    }

    // Persist physical recording for persistent audio evidence
    const persisted = await this.persistVoiceRecording(file);

    // Normalized MIME type for Sarvam STT: accepts audio/mp4, strictly rejects audio/m4a
    let normalizedMimeType = rawMime;
    if (
      normalizedMimeType === 'audio/m4a' ||
      normalizedMimeType === 'audio/x-m4a' ||
      !normalizedMimeType
    ) {
      normalizedMimeType = 'audio/mp4';
    }

    // Deterministic mock fallback for test environments without real API keys
    if (!this.sarvamApiKey || this.sarvamApiKey === 'mock' || this.sarvamApiKey.startsWith('mock-')) {
      this.logger.log(`Using mock Sarvam STT response (${byteLength} bytes)...`);
      return {
        originalTranscript: 'हमारे गांव में पानी की पाइप फूट गई है और पानी बर्बाद हो रहा है',
        detectedLanguage: 'hi',
        languageName: 'Hindi (हिन्दी)',
        languageCode: 'hi-IN',
        englishTranslation: 'A water pipe has burst in our village and water is being wasted',
        confidence: 0.98,
        audioUrl: persisted.audioUrl,
        audioFilename: persisted.audioFilename,
      };
    }

    const startTime = Date.now();
    try {
      let sttData: any = null;
      try {
        sttData = await this.invokeSarvamSttWithRetry(
          file.buffer,
          file.originalname || 'recording.m4a',
          normalizedMimeType,
        );
      } catch (sttErr: any) {
        if (sttErr instanceof BadRequestException) throw sttErr;

        this.logger.error(
          `Sarvam STT failed: ${sttErr.message}`,
          sttErr.stack,
        );

        throw new BadRequestException(
          'Unable to transcribe voice recording. Please speak clearly into your microphone and try recording again.',
        );
      }

      const transcript = (sttData?.transcript || '').trim();

      if (!transcript) {
        throw new BadRequestException(
          'No intelligible speech was recognized in the recording. Please speak clearly and record again.',
        );
      }

      const languageCode = sttData.language_code || 'en-IN';
      const confidence =
        typeof sttData.language_probability === 'number'
          ? sttData.language_probability
          : 0.95;

      const langPrefix = languageCode.split('-')[0].toLowerCase();
      let languageName = 'English';
      if (langPrefix === 'ta') languageName = 'Tamil (தமிழ்)';
      else if (langPrefix === 'hi') languageName = 'Hindi (हिन्दी)';
      else if (langPrefix === 'te') languageName = 'Telugu (తెలుగు)';
      else if (langPrefix === 'kn') languageName = 'Kannada (ಕನ್ನಡ)';
      else if (langPrefix === 'bn') languageName = 'Bengali (বাংলা)';

      let englishTranslation = transcript;
      if (langPrefix !== 'en') {
        try {
          const transData = await this.invokeSarvamTranslateWithRetry(
            transcript,
            languageCode,
          );
          if (transData?.translated_text) {
            englishTranslation = transData.translated_text.trim();
          }
        } catch (transErr: any) {
          this.logger.warn(`Sarvam translation fallback to original transcript: ${transErr.message}`);
        }
      }

      const durationMs = Date.now() - startTime;
      // Privacy-safe metadata logging (no sensitive transcript in info log)
      this.logger.log(
        `Transcribed audio (${byteLength} bytes) in ${durationMs}ms: lang=${langPrefix}, confidence=${confidence.toFixed(2)}`,
      );

      return {
        originalTranscript: transcript,
        detectedLanguage: langPrefix,
        languageName,
        languageCode,
        englishTranslation,
        confidence,
        audioUrl: persisted.audioUrl,
        audioFilename: persisted.audioFilename,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`transcribeAudio error: ${err.message}`, err.stack);
      throw new InternalServerErrorException(
        `Failed to transcribe audio with Sarvam: ${err.message}`,
      );
    }
  }

  /**
   * Helper to clean suffixes like "district", "block", "zilla", "तहसील", "प्रखंड", etc.,
   * including spoken colloquial Tamil suffixes like "-ngira", "-la", "-il", "idathula".
   */
  private cleanLocationSuffix(name?: string | null): string | null {
    if (!name || typeof name !== 'string') return null;
    const cleaned = name
      .replace(/\b(district|dist|zilla|zila|jila|block|constituency|panchayat|village|ward|taluk|tehsil|mandal)\b/gi, '')
      .replace(/(டிஸ்ட்ரிக்ட்ல|டிஸ்ட்ரிக்ட்|டிஸ்ட்ரிக்|மாவட்டத்துல|மாவட்டத்தில்|மாவட்டம்|மாவட்ட|வட்டாரத்தில்|வட்டாரத்துல|வட்டாரம்|வட்டம்|வார்டுல|வார்டில்|வார்டு|தொகுதியில்|தொகுதி|கிராமத்தில்|கிராமம்|ஊர்|தாலுகா|பகுதியில்|பகுதி|இடத்துல|இடத்தில்|பிளாக்கில்|பிளாக்ல|பிளாக்|ப்ளாக்)/g, '')
      .replace(/(ங்கிற|ங்கற|என்ற|என்கிற|இருக்கிறேன்|இருக்கிறோம்|இருக்கோம்|நாங்கள்|நான்|நாங்க|அப்புறம்|மற்றும்)/g, '')
      .replace(/(जिला|वार्ड|प्रखंड|तहसील|पंचायत|गाँव|गांव|तालुक)/g, '')
      .trim();
    return cleaned || name.trim();
  }

  /**
   * Phonetic mapping of Tamil names for Jharkhand districts to canonical English names.
   */
  private resolveTamilDistrictName(rawName?: string | null): string | null {
    if (!rawName || typeof rawName !== 'string') return null;
    const cleaned = this.cleanLocationSuffix(rawName) || rawName;
    const trimmed = cleaned.trim();

    const directMap: Record<string, string> = {
      'ராஞ்சி': 'Ranchi', 'ரான்சி': 'Ranchi', 'ராஞ்சிங்கிற': 'Ranchi', 'ராஞ்சங்கர்': 'Ranchi', 'ராஞ்சில': 'Ranchi', 'ராஞ்சியில்': 'Ranchi', 'ராஞ்ச': 'Ranchi',
      'தன்பாத்': 'Dhanbad', 'தான்பாத்': 'Dhanbad',
      'பொகாரோ': 'Bokaro', 'போகாரோ': 'Bokaro',
      'கிழக்கு சிங்பூம்': 'East Singhbhum', 'சிங்பூம்': 'East Singhbhum',
      'மேற்கு சிங்பூம்': 'West Singhbhum',
      'ஹசாரிபாக்': 'Hazaribagh', 'ஹசாரிபாஹ்': 'Hazaribagh',
      'தியோகர்': 'Deoghar', 'தேவ்கர்': 'Deoghar',
      'கிரிதி': 'Giridih',
      'ராம்கர்': 'Ramgarh', 'ராம்கட்': 'Ramgarh',
      'தும்கா': 'Dumka',
      'கோடா': 'Godda',
      'கும்லா': 'Gumla',
      'சத்ரா': 'Chatra',
      'கட்வா': 'Garhwa', 'கர்வாவ்': 'Garhwa',
      'ஜாம்தாரா': 'Jamtara',
      'குந்தி': 'Khunti',
      'கோடெர்மா': 'Koderma', 'கோடர்மா': 'Koderma',
      'லாதேஹார்': 'Latehar',
      'லோஹர்டகா': 'Lohardaga',
      'பாகுர்': 'Pakur',
      'பாலாமு': 'Palamu',
      'சாகிப்கஞ்ச்': 'Sahibganj',
      'சராய்கேலா': 'Saraikela Kharsawan', 'சராய்கேலா கார்சாவான்': 'Saraikela Kharsawan',
      'சிம்டேகா': 'Simdega',
    };

    if (directMap[trimmed]) return directMap[trimmed];
    for (const [ta, en] of Object.entries(directMap)) {
      if (trimmed.includes(ta)) return en;
    }
    return null;
  }

  /**
   * Phonetic mapping of Tamil names for Jharkhand blocks to canonical English names.
   * Includes all Ranchi blocks (Tamar, Kanke, Ratu, Namkum, Ormanjhi, Angara, Burmu, Bero, etc.)
   */
  private resolveTamilBlockName(rawName?: string | null): string | null {
    if (!rawName || typeof rawName !== 'string') return null;
    const cleaned = this.cleanLocationSuffix(rawName) || rawName;
    const trimmed = cleaned.trim();

    const blockMap: Record<string, string> = {
      'தாமர்': 'Tamar', 'தமர்': 'Tamar', 'தமாரு': 'Tamar', 'தமார்': 'Tamar', 'தமாருங்கிற': 'Tamar', 'தமர்ங்கிற': 'Tamar', 'தமரில்': 'Tamar',
      'காங்கே': 'Kanke', 'கான்கே': 'Kanke', 'காங்கேங்கிற': 'Kanke',
      'நம்கும்': 'Namkum', 'நம்கூம்': 'Namkum',
      'பெரோ': 'Bero',
      'ஓர்மஞ்சி': 'Ormanjhi',
      'ராது': 'Ratu',
      'சில்லில': 'Silli', 'சில்லி': 'Silli',
      'சோனஹாது': 'Sonahatu',
      'புண்டு': 'Bundu',
      'இட்கி': 'Itki',
      'அனகரா': 'Angara',
      'சாஹோ': 'Chanho', 'சான்ஹோ': 'Chanho',
      'புர்மூ': 'Burmu',
      'லாபுங்': 'Lapung',
      'மந்தர்': 'Mandar',
      'கல்கலியா': 'Khalari', 'கலாரி': 'Khalari',
      'பெர்மோ': 'Bermo',
      'சாஸ்': 'Chas',
      'கோவிந்த்பூர்': 'Govindpur',
      'ஜாரியா': 'Jharia',
      'நாக்ரி': 'Nagri', 'நகரி': 'Nagri',
    };

    if (blockMap[trimmed]) return blockMap[trimmed];
    for (const [ta, en] of Object.entries(blockMap)) {
      if (trimmed.includes(ta)) return en;
    }
    return null;
  }

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
   * Localized follow-up question generation strictly in speaker language
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
      if (lang === 'ta') return 'உங்கள் மாவட்டம் மற்றும் வட்டாரத்தின் (Block) பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने जिले और प्रखंड या वार्ड का नाम बताएं।';
      return 'Please specify your district and block / constituency.';
    }
    if (isDistrictMissing && !isConstituencyMissing) {
      if (lang === 'ta') return 'உங்கள் மாவட்டத்தின் பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने जिले का नाम बताएं।';
      return 'Please specify your district.';
    }
    if (!isDistrictMissing && isConstituencyMissing) {
      if (lang === 'ta') return 'உங்கள் வட்டாரத்தின் (Block) பெயரை கூறுங்கள்.';
      if (lang === 'hi') return 'कृपया अपने प्रखंड, वार्ड या विधानसभा क्षेत्र का नाम बताएं।';
      return 'Please specify your block, ward, or constituency.';
    }
    return null;
  }


  /**
   * 2. Analyze problem turn using Llama on NVIDIA NIM:
   * - Strict fact extraction without hallucination (no fake population or fake durations).
   * - Dynamic domain & sub-domain without hardcoded 'Infrastructure' fallback.
   * - Accumulates/merges state with previousState.
   * - Validates location completeness and generates localized follow-up question.
   */
  async analyzeVoiceTurn(dto: AnalyzeVoiceTurnDto): Promise<VoiceTurnAnalysisResult> {
    const { currentTranscript, detectedLanguage, englishTranslation, previousState } = dto;
    const textForAnalysis = englishTranslation || currentTranscript;

    // Deterministic mock fallback for automated test environments without NVIDIA API key
    if (!this.nvidiaApiKey || this.nvidiaApiKey === 'mock' || this.nvidiaApiKey.startsWith('mock-')) {
      return this.generateMockTurnAnalysis(dto);
    }

    const systemPrompt = `You are the ResolvIN Problem Intelligence AI for citizen civic reports.
Analyze citizen speech and extract structured facts strictly without hallucination.

CRITICAL ARCHITECTURAL RULES:
1. SEPARATE RAW SPEECH FROM PROFESSIONAL PROBLEM STATEMENT:
   - Produce a concise, formal "title" (under 80 characters).
   - Produce an objective, formal "problem_statement" in English suitable for civic records.
   - Do NOT invent facts not stated by the citizen.

2. STRICT FACTUALITY (NO HALLUCINATION):
   - NEVER invent population numbers, duration, causes, solutions, or technology not stated by citizen.
   - If citizen did not state how many people are affected, "affected_population" MUST be null.
   - If citizen did not state duration, "duration" MUST be null.
   - Extract facts into "facts": { "what_is_happening", "where", "who_is_affected", "affected_population", "duration", "frequency", "impact" }.

3. DYNAMIC DOMAIN & SUB-DOMAIN (NO HARDCODED DEFAULTS):
   - Predict domain and sub-domain semantically from the complaint meaning.
   - If genuinely uncertain: domain: null, sub_domain: null, requires_review: true.

4. LOCATION EXTRACTION:
   - Extract location entities mentioned in ANY language:
     "location": { "state", "district", "constituency", "ward", "block", "village", "locality", "panchayat" }.
   - Normalize names by removing administrative suffixes like "district", "zilla", "block", "tehsil", "taluk", "ward".

5. MULTI-TURN STATE ACCUMULATION:
   - If previousState is provided, MERGE previous facts and locations with new information. Never lose previously identified facts.

6. MANDATORY LOCATION VALIDATION & SAME-LANGUAGE FOLLOW-UP:
   - "district" is mandatory, and either "constituency", "ward", or "block" is mandatory.
   - If both are present: missing_required_fields: [], follow_up_question: null.
   - If missing: ask politely and strictly in "${detectedLanguage}" (Tamil for 'ta', Hindi for 'hi', English for 'en').

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

    const startTime = Date.now();
    try {
      const data: any = await this.invokeNvidiaLlamaWithRetry(systemPrompt, userContent);
      const rawJson = data.choices?.[0]?.message?.content || '{}';
      const parsed: any = this.parseLlamaJson(rawJson);

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

      // Database Match for District and Block UUIDs using LocationsService
      let districtId: string | null = previousState?.districtId || null;
      let blockId: string | null = previousState?.blockId || null;
      let finalDistrictName: string | null = rawDistrict;
      let finalBlockName: string | null = rawBlock || rawConstituency || (rawWard ? `Ward ${rawWard}` : null);

      if (this.locationsService) {
        try {
          const allDistricts = await this.locationsService.getDistricts();
          const combinedSpeech = `${currentTranscript} ${textForAnalysis} ${rawDistrict || ''} ${rawBlock || ''}`.toLowerCase();

          // 1. Resolve District if not already resolved
          if (!districtId && allDistricts && Array.isArray(allDistricts)) {
            // First check Tamil phonetic resolver
            const distFromTamil = this.resolveTamilDistrictName(currentTranscript) || this.resolveTamilDistrictName(rawDistrict);
            if (distFromTamil) {
              finalDistrictName = distFromTamil;
            }

            const targetD = (finalDistrictName || '').toLowerCase();
            let matchedD = targetD
              ? allDistricts.find(
                  (d: any) =>
                    d.name?.toLowerCase() === targetD ||
                    targetD.includes(d.name?.toLowerCase()) ||
                    d.name?.toLowerCase().includes(targetD),
                )
              : null;

            // Fallback: search speech transcript directly for any district name
            if (!matchedD) {
              matchedD = allDistricts.find((d: any) =>
                combinedSpeech.includes(d.name.toLowerCase()),
              );
            }

            if (matchedD) {
              districtId = matchedD.id;
              finalDistrictName = matchedD.name;
            }
          }

          // 2. Resolve Block within District (or scan if block is known)
          if (districtId) {
            const blocks = await this.locationsService.getBlocksByDistrict(districtId);
            if (blocks && Array.isArray(blocks)) {
              const blockFromTamil = this.resolveTamilBlockName(currentTranscript) || this.resolveTamilBlockName(rawBlock || rawConstituency);
              if (blockFromTamil) {
                finalBlockName = blockFromTamil;
              }

              const targetB = (finalBlockName || '').toLowerCase();
              let matchedB = targetB
                ? blocks.find(
                    (b: any) =>
                      b.name?.toLowerCase() === targetB ||
                      targetB.includes(b.name?.toLowerCase()) ||
                      b.name?.toLowerCase().includes(targetB),
                  )
                : null;

              // Fallback: search speech transcript for any block of this district
              if (!matchedB) {
                matchedB = blocks.find((b: any) => {
                  const bLower = b.name.toLowerCase();
                  if (combinedSpeech.includes(bLower)) return true;
                  // Check Tamil mapping for this specific block name
                  const taName = this.resolveTamilBlockName(b.name);
                  return taName && combinedSpeech.includes(taName.toLowerCase());
                });
              }

              if (matchedB) {
                blockId = matchedB.id;
                finalBlockName = matchedB.name;
              }
            }
          } else {
            // District was not explicitly named, but maybe block was (e.g. "Tamar" is unique to Ranchi)
            const blockFromTamil = this.resolveTamilBlockName(currentTranscript) || this.resolveTamilBlockName(rawBlock);
            const candidateBlockName = blockFromTamil || rawBlock;
            if (candidateBlockName && allDistricts && Array.isArray(allDistricts)) {
              for (const dist of allDistricts) {
                const distBlocks = await this.locationsService.getBlocksByDistrict(dist.id);
                const bMatch = distBlocks?.find(
                  (b: any) =>
                    b.name.toLowerCase() === candidateBlockName.toLowerCase(),
                );
                if (bMatch) {
                  districtId = dist.id;
                  finalDistrictName = dist.name;
                  blockId = bMatch.id;
                  finalBlockName = bMatch.name;
                  break;
                }
              }
            }
          }
        } catch (locErr: any) {
          this.logger.warn(`Locations matching non-fatal warning: ${locErr.message}`);
        }
      }

      // Check completeness: District is mandatory, and either Block, Constituency, or Ward is mandatory
      const hasDistrict = Boolean(finalDistrictName || districtId);
      const hasLocalUnit = Boolean(finalBlockName || rawConstituency || rawWard || blockId);
      const isDistrictMissing = !hasDistrict;
      const isConstituencyMissing = !hasLocalUnit;
      const isComplete = !isDistrictMissing && !isConstituencyMissing;

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
          if (!isDistrictMissing && (qLower.includes('district') || qLower.includes('जिले') || qLower.includes('மாவட்டம்'))) {
            questionValid = false;
          }
          if (!isConstituencyMissing && (qLower.includes('block') || qLower.includes('ward') || qLower.includes('प्रखंड') || qLower.includes('வட்டார'))) {
            questionValid = false;
          }
          // Enforce script matching for Tamil and Hindi so AI doesn't reply in English
          if (questionValid && detectedLanguage === 'ta' && !/[\u0B80-\u0BFF]/.test(candidateQ)) {
            questionValid = false;
          }
          if (questionValid && detectedLanguage === 'hi' && !/[\u0900-\u097F]/.test(candidateQ)) {
            questionValid = false;
          }
        }

        followUpQuestion = questionValid
          ? candidateQ
          : this.getDeterministicFollowUpQuestion(detectedLanguage, isDistrictMissing, isConstituencyMissing);
      }

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

      // NO HARDCODED STATE FALLBACK
      const stateVal =
        parsed.location?.state ||
        previousState?.location?.state ||
        null;

      const finalLocation: ExtractedLocation = {
        state: stateVal,
        district: finalDistrictName,
        constituency: rawConstituency,
        ward: rawWard,
        block: finalBlockName,
        village: rawVillage,
        locality: parsed.location?.locality || previousState?.location?.locality || null,
        panchayat: parsed.location?.panchayat || previousState?.location?.panchayat || null,
      };

      // Multi-turn State Preservation:
      // If previousState already had a problem statement and this turn is answering a follow-up location question,
      // preserve the original problem statement, problem title, domain, and subDomain from previousState.
      const isClarificationTurn = Boolean(previousState && (previousState.problem_statement || previousState.problem));

      let problemStatement = previousState?.problem_statement || previousState?.problem || '';
      if (!problemStatement || !isClarificationTurn) {
        problemStatement = parsed.problem_statement || parsed.problem || textForAnalysis;
      }

      let title = previousState?.title || '';
      if (!title || !isClarificationTurn) {
        title = parsed.title || (problemStatement.length > 60 ? problemStatement.slice(0, 57) + '...' : problemStatement);
      }

      let domain = previousState?.domain ?? null;
      if (!domain || !isClarificationTurn) {
        domain = parsed.domain ?? null;
      }

      let subDomain = previousState?.subDomain ?? null;
      if (!subDomain || !isClarificationTurn) {
        subDomain = parsed.sub_domain ?? parsed.subDomain ?? null;
      }

      const finalFacts: ExtractedFacts = {
        what_is_happening: previousState?.facts?.what_is_happening || parsed.facts?.what_is_happening || problemStatement,
        where: finalDistrictName ? `${finalDistrictName}${finalBlockName ? ', ' + finalBlockName : ''}` : parsed.facts?.where || previousState?.facts?.where || null,
        who_is_affected: previousState?.facts?.who_is_affected || parsed.facts?.who_is_affected || null,
        affected_population: popNumber,
        duration: previousState?.facts?.duration || parsed.facts?.duration || null,
        frequency: previousState?.facts?.frequency || parsed.facts?.frequency || null,
        impact: previousState?.facts?.impact || parsed.facts?.impact || null,
      };

      const requiresReview = Boolean(parsed.requires_review ?? (!domain || !subDomain));

      const fullTranscript = previousState?.originalTranscript
        ? `${previousState.originalTranscript}\n[Citizen]: ${currentTranscript}`
        : currentTranscript;

      const fullTranslation = previousState?.englishTranslation
        ? `${previousState.englishTranslation}\n[English]: ${textForAnalysis}`
        : textForAnalysis;

      const finalLang = previousState?.detectedLanguage || detectedLanguage;
      let languageName = 'English';
      if (finalLang === 'ta') languageName = 'Tamil (தமிழ்)';
      else if (finalLang === 'hi') languageName = 'Hindi (हिन्दी)';


      const latencyMs = Date.now() - startTime;
      this.logger.log(`Analyzed voice turn in ${latencyMs}ms: complete=${isComplete}, domain=${domain || 'unresolved'}`);

      return {
        title,
        problem_statement: problemStatement,
        problem: problemStatement,
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
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`analyzeVoiceTurn error: ${err.message}`, err.stack);
      this.logger.warn(`NVIDIA NIM unavailable (${err.message}). Falling back to deterministic turn analysis.`);
      return this.generateMockTurnAnalysis(dto);
    }
  }

  /**
   * Deterministic mock turn analysis for tests or offline local development
   */
  private async generateMockTurnAnalysis(dto: AnalyzeVoiceTurnDto): Promise<VoiceTurnAnalysisResult> {
    const { currentTranscript, detectedLanguage, englishTranslation, previousState } = dto;
    const text = englishTranslation || currentTranscript;
    const lower = text.toLowerCase();

    // Check if location is present in current turn or previousState
    let districtName: string | null = previousState?.districtName || null;
    let blockName: string | null = previousState?.blockName || null;
    let districtId: string | null = previousState?.districtId || null;
    let blockId: string | null = previousState?.blockId || null;

    // Detect district in English, Hindi, or Tamil
    const resolvedDistFromTamil = this.resolveTamilDistrictName(currentTranscript);
    if (resolvedDistFromTamil) {
      districtName = resolvedDistFromTamil;
    } else if (lower.includes('ranchi') || currentTranscript.includes('ராஞ்சி') || currentTranscript.includes('ரான்சி') || currentTranscript.includes('रांची') || currentTranscript.includes('ராஞ்சங்கர்')) {
      districtName = 'Ranchi';
    } else if (lower.includes('dhanbad') || currentTranscript.includes('தன்பாத்') || currentTranscript.includes('धनबाद')) {
      districtName = 'Dhanbad';
    } else if (lower.includes('bokaro') || currentTranscript.includes('பொகாரோ') || currentTranscript.includes('போகாரோ') || currentTranscript.includes('बोकारो')) {
      districtName = 'Bokaro';
    } else if (lower.includes('chatra') || currentTranscript.includes('சத்ரா')) {
      districtName = 'Chatra';
    } else if (lower.includes('hazaribagh') || currentTranscript.includes('ஹசாரிபாக்')) {
      districtName = 'Hazaribagh';
    } else if (lower.includes('deoghar') || currentTranscript.includes('தியோகர்')) {
      districtName = 'Deoghar';
    } else if (lower.includes('palamu') || currentTranscript.includes('பாலாமு')) {
      districtName = 'Palamu';
    }

    // Detect block in English, Hindi, or Tamil
    const resolvedBlockFromTamil = this.resolveTamilBlockName(currentTranscript);
    if (resolvedBlockFromTamil) {
      blockName = resolvedBlockFromTamil;
    } else if (lower.includes('tamar') || currentTranscript.includes('தாமர்') || currentTranscript.includes('தமர்') || currentTranscript.includes('தமாரு') || currentTranscript.includes('तामार')) {
      blockName = 'Tamar';
    } else if (lower.includes('kanke') || currentTranscript.includes('காங்கே') || currentTranscript.includes('கான்கே') || currentTranscript.includes('कांके')) {
      blockName = 'Kanke';
    } else if (lower.includes('namkum') || currentTranscript.includes('நம்கும்') || currentTranscript.includes('नामकुम')) {
      blockName = 'Namkum';
    } else if (lower.includes('ratu') || currentTranscript.includes('ராது')) {
      blockName = 'Ratu';
    } else if (lower.includes('ormanjhi') || currentTranscript.includes('ஓர்மஞ்சி')) {
      blockName = 'Ormanjhi';
    } else if (lower.includes('angara') || currentTranscript.includes('அனகரா')) {
      blockName = 'Angara';
    } else if (lower.includes('bermo') || currentTranscript.includes('பெர்மோ') || currentTranscript.includes('बेरमो')) {
      blockName = 'Bermo';
    }

    // If block is Tamar and district is not set, infer Ranchi
    if (blockName === 'Tamar' && !districtName) {
      districtName = 'Ranchi';
    }

    // Match with LocationsService if available
    if (this.locationsService) {
      try {
        const districts = await this.locationsService.getDistricts();
        if (districts && Array.isArray(districts)) {
          if (districtName) {
            const matchedD = districts.find(
              (d) => d.name.toLowerCase() === districtName!.toLowerCase(),
            );
            if (matchedD) {
              districtId = matchedD.id;
              districtName = matchedD.name;

              if (blockName) {
                const blocks = await this.locationsService.getBlocksByDistrict(matchedD.id);
                const matchedB = blocks?.find(
                  (b) => b.name.toLowerCase() === blockName!.toLowerCase(),
                );
                if (matchedB) {
                  blockId = matchedB.id;
                  blockName = matchedB.name;
                }
              }
            }
          } else if (blockName) {
            // Search all districts for this block
            for (const dist of districts) {
              const blocks = await this.locationsService.getBlocksByDistrict(dist.id);
              const matchedB = blocks?.find(
                (b) => b.name.toLowerCase() === blockName!.toLowerCase(),
              );
              if (matchedB) {
                districtId = dist.id;
                districtName = dist.name;
                blockId = matchedB.id;
                blockName = matchedB.name;
                break;
              }
            }
          }
        }
      } catch {}
    }

    const isDistrictMissing = !districtName && !districtId;
    const isConstituencyMissing = !blockName && !blockId;
    const isComplete = !isDistrictMissing && !isConstituencyMissing;

    // Multi-turn State Preservation:
    const isClarification = Boolean(previousState && (previousState.problem_statement || previousState.problem));

    const problemStatement = isClarification
      ? (previousState?.problem_statement || previousState?.problem || text)
      : text;

    const title = previousState?.title || (problemStatement.length > 50 ? problemStatement.slice(0, 47) + '...' : problemStatement);

    const domain = previousState?.domain || (
      lower.includes('water') || lower.includes('पानी') || currentTranscript.includes('குடிநீர்') || currentTranscript.includes('தண்ணீர்')
        ? 'Water & Sanitation'
        : lower.includes('road') || lower.includes('सड़क') || currentTranscript.includes('சாலை')
        ? 'Public Infrastructure'
        : null
    );

    const subDomain = previousState?.subDomain || (
      domain === 'Water & Sanitation'
        ? 'Drinking Water'
        : domain === 'Public Infrastructure'
        ? 'Rural Roads'
        : null
    );

    const followUpQuestion = isComplete
      ? null
      : this.getDeterministicFollowUpQuestion(detectedLanguage, isDistrictMissing, isConstituencyMissing);

    const fullTranscript = previousState?.originalTranscript
      ? `${previousState.originalTranscript}\n[Citizen]: ${currentTranscript}`
      : currentTranscript;

    const fullTranslation = previousState?.englishTranslation
      ? `${previousState.englishTranslation}\n[English]: ${text}`
      : text;

    const finalLang = previousState?.detectedLanguage || detectedLanguage;
    let languageName = 'English';
    if (finalLang === 'ta') languageName = 'Tamil (தமிழ்)';
    else if (finalLang === 'hi') languageName = 'Hindi (हिन्दी)';

    return {
      title,
      problem_statement: problemStatement,
      problem: problemStatement,
      domain,
      subDomain,
      location: {
        state: 'Jharkhand',
        district: districtName,
        block: blockName,
        constituency: blockName,
        ward: null,
        village: null,
        locality: null,
        panchayat: null,
      },
      facts: {
        what_is_happening: previousState?.facts?.what_is_happening || problemStatement,
        where: districtName ? `${districtName}, ${blockName || ''}` : null,
        who_is_affected: previousState?.facts?.who_is_affected || 'Local residents',
        affected_population: null,
        duration: null,
        frequency: null,
        impact: null,
      },
      districtId,
      districtName,
      blockId,
      blockName,
      missingRequiredFields: isComplete ? [] : isDistrictMissing && isConstituencyMissing ? ['district', 'constituency'] : isDistrictMissing ? ['district'] : ['constituency'],
      requiresReview: !domain || !subDomain,
      isDistrictMissing,
      isConstituencyMissing,
      isComplete,
      followUpQuestion,
      originalTranscript: fullTranscript,
      englishTranslation: fullTranslation,
      detectedLanguage: finalLang,
      languageName,
    };
  }


  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async invokeNvidiaLlamaWithRetry(
    systemPrompt: string,
    userContent: string,
  ): Promise<any> {
    const url = `${this.nvidiaBaseUrl}/chat/completions`;
    const maxAttempts = 2;
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
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.nvidiaApiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: requestBody,
          signal: AbortSignal.timeout(8000), // 8s bounded timeout for responsive mobile turn analysis
        });

        if (response.ok) {
          return await response.json();
        }

        const rawBody = await response.text();
        const isTransient = transientStatuses.has(response.status);

        if (isTransient && attempt < maxAttempts) {
          const delayMs = 500;
          this.logger.warn(
            `Transient NVIDIA NIM error (${response.status}). Retrying attempt ${attempt + 1}/${maxAttempts} in ${delayMs}ms...`,
          );
          await this.sleep(delayMs);
          continue;
        }

        throw new Error(
          `NVIDIA Llama inference failed (${response.status}): ${rawBody}`,
        );
      } catch (err: any) {
        lastError = err;
        const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout') || err.message?.includes('aborted');
        // If timed out, don't waste another 8s retrying - immediately let the deterministic fallback handle it
        if (isTimeout) {
          this.logger.warn(`NVIDIA NIM timed out after 8s. Proceeding to instant turn fallback.`);
          break;
        }
        if (attempt < maxAttempts) {
          const delayMs = 500;
          this.logger.warn(
            `NVIDIA NIM network error: ${err.message}. Retrying attempt ${attempt + 1}/${maxAttempts}...`,
          );
          await this.sleep(delayMs);
          continue;
        }
        throw new Error(`NVIDIA Llama connection error: ${err.message}`);
      }
    }

    throw lastError || new Error('NVIDIA Llama inference failed after 2 attempts.');
  }

  /**
   * Invokes Sarvam Speech-to-Text API with retry and socket-reset resilience.
   */
  private async invokeSarvamSttWithRetry(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    maxAttempts = 3,
  ): Promise<any> {
    const transientStatuses = new Set([500, 502, 503, 504, 429]);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const formData = new FormData();
        const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
        formData.append('file', blob, fileName);
        formData.append('model', 'saaras:v3');

        const response = await fetch('https://api.sarvam.ai/speech-to-text', {
          method: 'POST',
          headers: {
            'api-subscription-key': this.sarvamApiKey,
          },
          body: formData,
          signal: AbortSignal.timeout(45000),
        });

        if (response.ok) {
          return await response.json();
        }

        const errText = await response.text();
        const isTransient = transientStatuses.has(response.status);

        if (isTransient && attempt < maxAttempts) {
          const delayMs = attempt * 750;
          this.logger.warn(
            `Transient Sarvam STT error (${response.status}). Retrying attempt ${attempt + 1}/${maxAttempts} in ${delayMs}ms...`,
          );
          await this.sleep(delayMs);
          continue;
        }

        if (response.status === 400) {
          this.logger.warn(`Sarvam STT rejected audio (HTTP 400): ${errText}`);
          throw new BadRequestException(
            'No intelligible speech was recognized in the recording. Please speak clearly and record again.',
          );
        }

        throw new Error(`Sarvam STT failed with HTTP ${response.status}: ${errText}`);
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        lastError = err;
        const causeDetail = (err as any).cause?.code || (err as any).cause?.message || err.message || '';
        this.logger.warn(
          `Sarvam STT attempt ${attempt}/${maxAttempts} failed: ${err.message} (${causeDetail})`,
        );

        if (attempt < maxAttempts) {
          const delayMs = attempt * 750;
          await this.sleep(delayMs);
          continue;
        }
      }
    }

    throw lastError || new Error('Sarvam STT failed after all retry attempts.');
  }

  /**
   * Invokes Sarvam Translate API with retry resilience.
   */
  private async invokeSarvamTranslateWithRetry(
    transcript: string,
    sourceLanguageCode: string,
    maxAttempts = 2,
  ): Promise<any> {
    const transientStatuses = new Set([500, 502, 503, 504, 429]);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch('https://api.sarvam.ai/translate', {
          method: 'POST',
          headers: {
            'api-subscription-key': this.sarvamApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: transcript,
            source_language_code: sourceLanguageCode,
            target_language_code: 'en-IN',
            speaker_gender: 'Male',
            mode: 'formal',
            model: 'mayura:v1',
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (response.ok) {
          return await response.json();
        }

        const errText = await response.text();
        const isTransient = transientStatuses.has(response.status);

        if (isTransient && attempt < maxAttempts) {
          const delayMs = 500;
          await this.sleep(delayMs);
          continue;
        }

        throw new Error(`Sarvam translation failed (${response.status}): ${errText}`);
      } catch (err: any) {
        lastError = err;
        if (attempt < maxAttempts) {
          await this.sleep(500);
          continue;
        }
      }
    }

    throw lastError || new Error('Sarvam translation failed after retry attempts.');
  }
}
