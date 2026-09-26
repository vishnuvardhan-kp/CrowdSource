import { Platform } from 'react-native';
import { apiClient } from '../../api/client';
import {
  TranscribeResponse,
  VoiceTurnResponse,
  VoiceAnalysisResult,
  DistrictItem,
} from './voice-types';
import { VOICE_CONFIG, VOICE_API_TIMEOUT_MS } from './voice-config';
import { toConversationState, buildVoiceAnalysisResult } from './voice-state';

/**
 * Service handling all Voice API communications with the SamadhanSetu backend.
 * Uses dedicated 90-second timeouts for AI voice processing and multipart FormData uploads.
 */
export class VoiceApi {
  /**
   * Uploads recorded audio file (m4a/wav) to backend Sarvam STT endpoint.
   */
  async uploadAndTranscribe(audioUri: string): Promise<TranscribeResponse> {
    if (!audioUri || !audioUri.trim()) {
      throw new Error('No audio recording found to transcribe.');
    }

    const cleanUri = audioUri.split('?')[0];
    const isWav = cleanUri.toLowerCase().endsWith('.wav');
    const fileName = isWav
      ? VOICE_CONFIG.FILE_NAMES.WAV
      : VOICE_CONFIG.FILE_NAMES.M4A;
    const mimeType = isWav
      ? VOICE_CONFIG.MIME_TYPES.WAV
      : VOICE_CONFIG.MIME_TYPES.M4A;

    const normalizedUri =
      Platform.OS === 'android' &&
      !audioUri.startsWith('file://') &&
      !audioUri.startsWith('content://')
        ? `file://${audioUri}`
        : audioUri;

    const formData = new FormData();

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } catch (e) {
        formData.append('file', {
          uri: normalizedUri,
          type: mimeType,
          name: fileName,
        } as any);
      }
    } else {
      formData.append('file', {
        uri: normalizedUri,
        type: mimeType,
        name: fileName,
      } as any);
    }

    const res = await apiClient<any>(VOICE_CONFIG.ENDPOINTS.TRANSCRIBE, {
      method: 'POST',
      body: formData,
      timeoutMs: VOICE_API_TIMEOUT_MS,
    });

    const payload = res.data || res;
    return {
      originalTranscript: payload.originalTranscript || '',
      detectedLanguage: payload.detectedLanguage || 'en',
      languageName: payload.languageName || 'English',
      languageCode: payload.languageCode || 'en-IN',
      englishTranslation: payload.englishTranslation || payload.originalTranscript || '',
      confidence: payload.confidence || 0.95,
    };
  }

  /**
   * Calls backend Llama NIM turn-analysis endpoint.
   */
  async analyzeVoiceTurn(
    currentTranscript: string,
    detectedLanguage: string,
    englishTranslation?: string,
    previousState?: any,
  ): Promise<VoiceTurnResponse> {
    const res = await apiClient<any>(VOICE_CONFIG.ENDPOINTS.ANALYZE_TURN, {
      method: 'POST',
      body: JSON.stringify({
        currentTranscript,
        detectedLanguage,
        englishTranslation,
        previousState,
      }),
      timeoutMs: VOICE_API_TIMEOUT_MS,
    });

    return res.data || res;
  }

  /**
   * Processes the initial voice recording:
   * 1. Audio upload -> Sarvam STT -> translation
   * 2. Llama NIM turn analysis
   * 3. Entity and state mapping
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
      detectedLanguage = /[\u0B80-\u0BFF]/.test(originalTranscript)
        ? 'ta'
        : /[\u0900-\u097F]/.test(originalTranscript)
        ? 'hi'
        : 'en';
      languageName =
        detectedLanguage === 'ta'
          ? 'Tamil (தமிழ்)'
          : detectedLanguage === 'hi'
          ? 'Hindi (हिन्दी)'
          : 'English';
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
   * 2. Sends previous state + new answer to Llama NIM
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
      answerLang = /[\u0B80-\u0BFF]/.test(answerTranscript)
        ? 'ta'
        : /[\u0900-\u097F]/.test(answerTranscript)
        ? 'hi'
        : previousAnalysis.detectedLanguage;
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
}

export const voiceApi = new VoiceApi();
