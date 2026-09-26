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
  @IsNotEmpty({ message: 'currentTranscript is required.' })
  currentTranscript: string;

  @IsString()
  @IsNotEmpty({ message: 'detectedLanguage is required.' })
  detectedLanguage: string; // e.g. 'ta', 'hi', 'en'

  @IsString()
  @IsOptional()
  englishTranslation?: string;

  @IsObject()
  @IsOptional()
  previousState?: VoiceConversationState;
}
