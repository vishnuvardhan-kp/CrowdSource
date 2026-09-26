/**
 * CitizenVoiceModule Mobile Types & Contracts
 *
 * Fully decoupled domain models, provider interfaces, and pipeline types
 * for the portable Citizen Voice module.
 */

export enum CitizenSeverity {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface DistrictItem {
  id: string;
  name: string;
  code?: string;
  state?: string;
}

export interface BlockItem {
  id: string;
  district_id: string;
  name: string;
  code?: string;
}

export interface ChallengeItem {
  id: string;
  title: string;
  status?: string;
  [key: string]: any;
}

/**
 * UI State of the Voice Conversation Screen.
 */
export type ConversationUiState =
  | 'idle'
  | 'recording'
  | 'processing'
  | 'asking'
  | 'recording_answer'
  | 'ready_for_confirmation'
  | 'submitting'
  | 'success'
  | 'permission_denied'
  | 'error';

/**
 * Result returned from backend Sarvam STT transcription.
 */
export interface TranscribeResponse {
  originalTranscript: string;
  detectedLanguage: string;
  languageName: string;
  languageCode: string;
  englishTranslation: string;
  confidence: number;
}

/**
 * Structured facts extracted by Llama Problem Intelligence.
 */
export interface ExtractedFacts {
  what_is_happening?: string | null;
  where?: string | null;
  who_is_affected?: string | null;
  affected_population?: number | null;
  duration?: string | null;
  frequency?: string | null;
  impact?: string | null;
}

/**
 * Location entities extracted by Llama Problem Intelligence.
 */
export interface ExtractedLocation {
  state?: string | null;
  district?: string | null;
  constituency?: string | null;
  ward?: string | null;
  block?: string | null;
  village?: string | null;
  locality?: string | null;
  panchayat?: string | null;
}

/**
 * Response from backend NVIDIA Llama turn-analysis endpoint (/voice/analyze-turn).
 */
export interface VoiceTurnResponse {
  title: string;
  problem_statement: string;
  problem: string;
  domain: string | null;
  subDomain: string | null;
  location?: ExtractedLocation | null;
  facts?: ExtractedFacts | null;
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

/**
 * Clean result object used by the Voice UI and consumers.
 */
export interface VoiceAnalysisResult {
  originalTranscript: string;
  detectedLanguage: string;
  languageName: string;
  englishTranslation: string;
  title: string;
  problem_statement?: string;
  description: string;
  domain: string | null;
  subDomain: string | null;
  category?: string | null;
  citizen_severity: CitizenSeverity;
  districtId?: string | null;
  districtName?: string | null;
  blockId?: string | null;
  blockName?: string | null;
  ward?: string | null;
  villageLocality?: string | null;
  affectedPopulation?: string | null;
  location?: ExtractedLocation | null;
  facts?: ExtractedFacts | null;
  missingRequiredFields: string[];
  requiresReview: boolean;
  isDistrictMissing: boolean;
  isConstituencyMissing: boolean;
  isComplete?: boolean;
  followUpQuestion: string | null;
}

/**
 * Multi-turn state representation sent back to backend on follow-up turns.
 */
export interface VoiceConversationState {
  title?: string | null;
  problem_statement?: string | null;
  problem?: string | null;
  domain?: string | null;
  subDomain?: string | null;
  location?: ExtractedLocation | null;
  facts?: ExtractedFacts | null;
  districtId?: string | null;
  districtName?: string | null;
  blockId?: string | null;
  blockName?: string | null;
  ward?: string | null;
  villageLocality?: string | null;
  affectedPopulation?: string | null;
  originalTranscript?: string | null;
  englishTranslation?: string | null;
  detectedLanguage?: string | null;
}

/**
 * Parameters for submitting a confirmed voice report to the Challenge registry.
 */
export interface SubmitVoiceReportParams {
  title: string;
  description: string;
  districtId: string;
  blockId: string;
  villageLocality?: string;
  citizenSeverity?: CitizenSeverity;
  category?: string;
  originalLanguage?: string;
  originalTranscript?: string;
  englishTranslation?: string;
}

/**
 * Adapter interface to decouple the Voice module from the specific Challenge API.
 */
export interface VoiceChallengeAdapter {
  createDraft(params: {
    title: string;
    description: string;
    district_id: string;
    block_id: string;
    village_locality?: string;
    citizen_severity?: CitizenSeverity;
    category?: string;
    original_language?: string;
    original_text?: string;
  }): Promise<{ id: string }>;

  submitChallenge(challengeId: string): Promise<ChallengeItem>;
}

/**
 * Location Provider interface for resolving administrative boundaries.
 */
export interface VoiceLocationProvider {
  getDistricts(): Promise<DistrictItem[]>;
  getBlocks(districtId: string): Promise<BlockItem[]>;
}

/**
 * Auth Provider interface for retrieving authentication tokens.
 */
export interface VoiceAuthProvider {
  getAuthToken(): Promise<string | null>;
}

/**
 * State of the audio recording service.
 */
export interface AudioRecordingState {
  isRecording: boolean;
  durationMillis: number;
  uri: string | null;
  hasPermission: boolean | null;
}
