/**
 * CitizenVoiceModule Mobile Barrel
 *
 * Provides self-contained mobile voice reporting components,
 * recording management, API networking, adapters, and domain contracts.
 */

// Primary Screen Component
export { VoiceReportScreen } from './VoiceReportScreen';
export type { VoiceReportScreenProps } from './VoiceReportScreen';

// Audio Recording Manager
export { VoiceRecorder, voiceRecorder } from './voice-recording';

// API Client
export { VoiceApi, voiceApi } from './voice-api';
export type { VoiceApiOptions, ApiClientFn } from './voice-api';

// Challenge Adapters
export {
  createVoiceChallengeAdapter,
  HttpVoiceChallengeAdapter,
} from './voice-challenge-adapter';

// State & Entity Matchers
export {
  toConversationState,
  buildVoiceAnalysisResult,
  matchDistrictName,
  matchBlockName,
} from './voice-state';

// Configuration
export {
  VOICE_CONFIG,
  VOICE_API_TIMEOUT_MS,
} from './voice-config';

// Theme Tokens
export {
  DEFAULT_VOICE_THEME,
} from './voice-theme';
export type { VoiceTheme } from './voice-theme';

// Types & Contracts
export {
  CitizenSeverity,
} from './voice-types';
export type {
  ConversationUiState,
  TranscribeResponse,
  ExtractedFacts,
  ExtractedLocation,
  VoiceTurnResponse,
  VoiceAnalysisResult,
  VoiceConversationState,
  SubmitVoiceReportParams,
  VoiceChallengeAdapter,
  VoiceLocationProvider,
  VoiceAuthProvider,
  AudioRecordingState,
  DistrictItem,
  BlockItem,
  ChallengeItem,
} from './voice-types';
