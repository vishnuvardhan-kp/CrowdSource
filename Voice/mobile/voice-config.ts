/**
 * CitizenVoiceModule Configuration
 *
 * Specific constants and network options for the voice feature.
 * The 90-second timeout is specifically allocated for the voice pipeline
 * (audio upload -> NestJS -> Sarvam STT -> translation -> NVIDIA Llama NIM).
 *
 * Global network timeouts in the host app remain untouched.
 */

export const VOICE_CONFIG = {
  /**
   * Dedicated network timeout for voice requests (90 seconds).
   */
  API_TIMEOUT_MS: 90000,

  /**
   * Audio file MIME types accepted by the backend / Sarvam STT.
   * Note: Sarvam strictly requires audio/mp4 for M4A recordings.
   */
  MIME_TYPES: {
    M4A: 'audio/mp4',
    WAV: 'audio/wav',
  },

  /**
   * Default recording file names.
   */
  FILE_NAMES: {
    M4A: 'recording.m4a',
    WAV: 'recording.wav',
  },

  /**
   * API endpoints for voice operations.
   */
  ENDPOINTS: {
    TRANSCRIBE: '/voice/transcribe',
    ANALYZE_TURN: '/voice/analyze-turn',
  },
} as const;

export const VOICE_API_TIMEOUT_MS = VOICE_CONFIG.API_TIMEOUT_MS;
