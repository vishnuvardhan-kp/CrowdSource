import { Platform } from 'react-native';
import {
  TranscribeResponse,
  VoiceTurnResponse,
  VoiceAnalysisResult,
  VoiceConversationState,
  SubmitVoiceReportParams,
  VoiceChallengeAdapter,
  DistrictItem,
  ChallengeItem,
} from './voice-types';
import { VOICE_CONFIG, VOICE_API_TIMEOUT_MS } from './voice-config';
import { toConversationState, buildVoiceAnalysisResult } from './voice-state';

export type ApiClientFn = <T = any>(
  path: string,
  options?: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
    timeoutMs?: number;
  },
) => Promise<T>;

export interface VoiceApiOptions {
  baseUrl?: string;
  getAuthToken?: () => Promise<string | null>;
  apiClient?: ApiClientFn;
  challengeAdapter?: VoiceChallengeAdapter;
}

/**
 * Service handling all Voice API communications with the backend.
 * Uses dedicated 90-second timeouts for AI voice processing.
 */
export class VoiceApi {
  private baseUrl: string;
  private getAuthToken: () => Promise<string | null>;
  private customApiClient: ApiClientFn | null;
  private challengeAdapter: VoiceChallengeAdapter | null;

  constructor(options?: VoiceApiOptions) {
    this.baseUrl = options?.baseUrl || '';
    this.getAuthToken = options?.getAuthToken || (async () => null);
    this.customApiClient = options?.apiClient || null;
    this.challengeAdapter = options?.challengeAdapter || null;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  public setAuthTokenProvider(provider: () => Promise<string | null>) {
    this.getAuthToken = provider;
  }

  public setApiClient(client: ApiClientFn) {
    this.customApiClient = client;
  }

  public setChallengeAdapter(adapter: VoiceChallengeAdapter) {
    this.challengeAdapter = adapter;
  }

  /**
   * Detect speech language from text hint (used strictly for developer simulation testing).
   */
  detectLanguage(text: string): { code: string; name: string } {
    if (/[\u0B80-\u0BFF]/.test(text)) {
      return { code: 'ta', name: 'Tamil (தமிழ்)' };
    }
    if (/[\u0900-\u097F]/.test(text)) {
      return { code: 'hi', name: 'Hindi (हिन्दी)' };
    }
    const lower = text.toLowerCase();
    if (
      lower.includes('mavattam') ||
      lower.includes('thoguthi') ||
      lower.includes('engal') ||
      lower.includes('kiramam') ||
      lower.includes('kuzhai') ||
      lower.includes('tannir') ||
      lower.includes('thanni') ||
      lower.includes('udainthu') ||
      lower.includes('salai') ||
      lower.includes('vanakkam')
    ) {
      return { code: 'ta', name: 'Tamil (தமிழ்)' };
    }
    if (
      lower.includes('zila') ||
      lower.includes('jila') ||
      lower.includes('prakhand') ||
      lower.includes('gaon') ||
      lower.includes('hamare') ||
      lower.includes('paani') ||
      lower.includes('sadak') ||
      lower.includes('chapakar') ||
      lower.includes('kharaab') ||
      lower.includes('namaste')
    ) {
      return { code: 'hi', name: 'Hindi (हिन्दी)' };
    }
    return { code: 'en', name: 'English' };
  }

  /**
   * Uploads real recorded audio file (m4a/wav) to backend Sarvam STT endpoint.
   * Uses React Native native FormData part object routed via XMLHttpRequest.
   * Enforces 90-second dedicated voice timeout.
   */
  async uploadAndTranscribe(audioUri: string): Promise<TranscribeResponse> {
    if (!audioUri || !audioUri.trim()) {
      throw new Error('No audio recording found to transcribe.');
    }

    const isWav = audioUri.toLowerCase().endsWith('.wav');
    const fileName = isWav
      ? VOICE_CONFIG.FILE_NAMES.WAV
      : VOICE_CONFIG.FILE_NAMES.M4A;
    const mimeType = isWav
      ? VOICE_CONFIG.MIME_TYPES.WAV
      : VOICE_CONFIG.MIME_TYPES.M4A;

    const formData = new FormData();

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } catch (e) {
        formData.append('file', {
          uri: audioUri,
          type: mimeType,
          name: fileName,
        } as any);
      }
    } else {
      formData.append('file', {
        uri: audioUri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    if (this.customApiClient) {
      return await this.customApiClient<TranscribeResponse>(
        VOICE_CONFIG.ENDPOINTS.TRANSCRIBE,
        {
          method: 'POST',
          body: formData,
          timeoutMs: VOICE_CONFIG.API_TIMEOUT_MS,
        },
      );
    }

    // Portable XMLHttpRequest fallback
    const token = await this.getAuthToken();
    const targetUrl = `${this.baseUrl}${VOICE_CONFIG.ENDPOINTS.TRANSCRIBE}`;

    return new Promise<TranscribeResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', targetUrl);
      xhr.timeout = VOICE_API_TIMEOUT_MS;

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            const payload = data.data || data;
            resolve({
              originalTranscript: payload.originalTranscript || '',
              detectedLanguage: payload.detectedLanguage || 'en',
              languageName: payload.languageName || 'English',
              languageCode: payload.languageCode || 'en-IN',
              englishTranslation: payload.englishTranslation || payload.originalTranscript || '',
              confidence: payload.confidence || 0.95,
            });
          } catch (e) {
            reject(new Error(`Failed to parse transcribe response: ${xhr.responseText}`));
          }
        } else {
          reject(
            new Error(
              `Voice transcription failed with HTTP ${xhr.status}: ${xhr.responseText}`,
            ),
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during audio upload'));
      };

      xhr.ontimeout = () => {
        reject(new Error(`Voice upload timed out after ${VOICE_API_TIMEOUT_MS / 1000}s`));
      };

      xhr.send(formData);
    });
  }

  /**
   * Calls backend Llama 3.2 NIM turn-analysis endpoint.
   * Enforces 90-second dedicated voice timeout.
   */
  async analyzeVoiceTurn(
    currentTranscript: string,
    detectedLanguage: string,
    englishTranslation?: string,
    previousState?: any,
  ): Promise<VoiceTurnResponse> {
    if (this.customApiClient) {
      return await this.customApiClient<VoiceTurnResponse>(
        VOICE_CONFIG.ENDPOINTS.ANALYZE_TURN,
        {
          method: 'POST',
          body: JSON.stringify({
            currentTranscript,
            detectedLanguage,
            englishTranslation,
            previousState,
          }),
          timeoutMs: VOICE_CONFIG.API_TIMEOUT_MS,
        },
      );
    }

    // Portable fetch fallback
    const token = await this.getAuthToken();
    const targetUrl = `${this.baseUrl}${VOICE_CONFIG.ENDPOINTS.ANALYZE_TURN}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), VOICE_API_TIMEOUT_MS);

    try {
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          currentTranscript,
          detectedLanguage,
          englishTranslation,
          previousState,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Voice turn analysis failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      return data.data || data;
    } catch (e: any) {
      clearTimeout(timer);
      if (e.name === 'AbortError') {
        throw new Error(`Voice turn analysis timed out after ${VOICE_API_TIMEOUT_MS / 1000}s`);
      }
      throw e;
    }
  }

  /**
   * Processes the initial voice recording:
   * 1. Audio upload -> Sarvam STT -> translation
   * 2. Llama 3.2 NIM turn analysis
   * 3. Entity and state mapping (without fake defaults)
   */
  async processVoiceRecording(
    audioUri: string,
    durationSeconds: number,
    districts: DistrictItem[],
    speechTextHint?: string,
  ): Promise<VoiceAnalysisResult> {
    let originalTranscript = '';
    let detectedLanguage = 'en';
    let languageName = 'English';
    let englishTranslation = '';

    if (speechTextHint && speechTextHint.trim()) {
      originalTranscript = speechTextHint.trim();
      const detected = this.detectLanguage(originalTranscript);
      detectedLanguage = detected.code;
      languageName = detected.name;
      englishTranslation = originalTranscript;
    } else {
      const stt = await this.uploadAndTranscribe(audioUri);
      originalTranscript = stt.originalTranscript;
      detectedLanguage = stt.detectedLanguage;
      languageName = stt.languageName;
      englishTranslation = stt.englishTranslation;
    }

    const llama = await this.analyzeVoiceTurn(
      originalTranscript,
      detectedLanguage,
      englishTranslation,
    );

    return buildVoiceAnalysisResult(
      llama,
      { originalTranscript, detectedLanguage, languageName, englishTranslation },
      districts,
    );
  }

  /**
   * Processes follow-up answer:
   * 1. Uploads answer audio or processes text
   * 2. Sends previous state + new answer to Llama 3.2 NIM
   * 3. Returns accumulated state
   */
  async processFollowUpAnswer(
    previousAnalysis: VoiceAnalysisResult,
    newAudioUri: string,
    districts: DistrictItem[],
    answerTextHint?: string,
  ): Promise<VoiceAnalysisResult> {
    let answerTranscript = '';
    let answerLang = previousAnalysis.detectedLanguage;
    let answerTranslation = '';

    if (answerTextHint && answerTextHint.trim()) {
      answerTranscript = answerTextHint.trim();
      const detected = this.detectLanguage(answerTranscript);
      answerLang = detected.code;
      answerTranslation = answerTranscript;
    } else {
      const stt = await this.uploadAndTranscribe(newAudioUri);
      answerTranscript = stt.originalTranscript;
      answerLang = stt.detectedLanguage;
      answerTranslation = stt.englishTranslation;
    }

    const previousState = toConversationState(previousAnalysis);

    const llama = await this.analyzeVoiceTurn(
      answerTranscript,
      answerLang,
      answerTranslation,
      previousState,
    );

    return buildVoiceAnalysisResult(
      llama,
      {
        originalTranscript: llama.originalTranscript || previousAnalysis.originalTranscript,
        detectedLanguage: previousAnalysis.detectedLanguage,
        languageName: previousAnalysis.languageName,
        englishTranslation: llama.englishTranslation || previousAnalysis.englishTranslation,
      },
      districts,
      previousAnalysis,
    );
  }

  /**
   * Submits confirmed voice report to the Challenge registry.
   * Strictly enforces that district and block are provided.
   * NEVER silently falls back to districts[0] or blocks[0].
   */
  async submitVoiceReport(
    params: SubmitVoiceReportParams,
    customAdapter?: VoiceChallengeAdapter,
  ): Promise<ChallengeItem> {
    const adapter = customAdapter || this.challengeAdapter;
    if (!adapter) {
      throw new Error('No VoiceChallengeAdapter provided to submit voice report.');
    }

    if (!params.districtId) {
      throw new Error('Please provide a valid district before submitting.');
    }
    if (!params.blockId) {
      throw new Error('Please provide a valid block / constituency before submitting.');
    }

    const draft = await adapter.createDraft({
      title: params.title,
      description: params.description,
      district_id: params.districtId,
      block_id: params.blockId,
      village_locality: params.villageLocality,
      citizen_severity: params.citizenSeverity,
      category: params.category || 'Public Infrastructure',
      original_language: params.originalLanguage || 'en',
      original_text: params.originalTranscript || params.description,
    });

    return adapter.submitChallenge(draft.id);
  }
}

export const voiceApi = new VoiceApi();
