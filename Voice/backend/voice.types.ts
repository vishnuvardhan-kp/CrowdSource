/**
 * CitizenVoiceModule Backend Types
 *
 * Core interfaces and types for the Citizen Voice processing pipeline:
 * Sarvam STT transcription, translation, and NVIDIA NIM Llama Problem Intelligence.
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

export interface ExtractedFacts {
  what_is_happening?: string | null;
  where?: string | null;
  who_is_affected?: string | null;
  affected_population?: number | null;
  duration?: string | null;
  frequency?: string | null;
  impact?: string | null;
}

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

export interface TranscribeResult {
  originalTranscript: string;
  detectedLanguage: string; // e.g. 'ta', 'hi', 'en'
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
