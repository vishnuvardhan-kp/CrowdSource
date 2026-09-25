import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';
import {
  ExtractedLocation,
  ExtractedFacts,
  VoiceConversationState,
} from './voice.types';

export {
  ExtractedLocation,
  ExtractedFacts,
  VoiceConversationState,
};

export class AnalyzeVoiceTurnDto {
  @IsString()
  @IsNotEmpty()
  currentTranscript: string;

  @IsString()
  @IsNotEmpty()
  detectedLanguage: string; // e.g. 'ta', 'hi', 'en'

  @IsString()
  @IsOptional()
  englishTranslation?: string;

  @IsObject()
  @IsOptional()
  previousState?: VoiceConversationState;
}
