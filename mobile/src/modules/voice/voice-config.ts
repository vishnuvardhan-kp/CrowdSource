/**
 * SamadhanSetu Mobile Voice Configuration
 *
 * Dedicated network settings and constants for voice transcription and turn analysis.
 * Uses 90-second timeout to accommodate remote speech inference and multi-turn LLM reasoning.
 */

export const VOICE_CONFIG = {
  /**
   * Dedicated network timeout for voice requests (90 seconds).
   */
  API_TIMEOUT_MS: 90000,

  /**
   * Audio file MIME types accepted by the backend / Sarvam STT.
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
   * API endpoints for voice operations (supporting both versioned and unversioned).
   */
  ENDPOINTS: {
    TRANSCRIBE: '/voice/transcribe',
    ANALYZE_TURN: '/voice/analyze-turn',
  },
} as const;

export const VOICE_API_TIMEOUT_MS = VOICE_CONFIG.API_TIMEOUT_MS;
