import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VoiceService } from './voice.service';
import { AnalyzeVoiceTurnDto } from './voice.dto';

const MAX_AUDIO_UPLOAD_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * SamadhanSetu Voice Module Controller
 *
 * Exposes:
 * - POST /api/v1/voice/transcribe & POST /api/voice/transcribe (audio upload, 25MB max)
 * - POST /api/v1/voice/analyze-turn & POST /api/voice/analyze-turn (conversational intelligence)
 *
 * Protected with JwtAuthGuard to prevent unauthorized API quota abuse.
 */
@Controller(['v1/voice', 'voice'])
@UseGuards(JwtAuthGuard)
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  /**
   * 1. Receive recorded audio file, validate MIME & size, forward to Sarvam STT
   */
  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_AUDIO_UPLOAD_SIZE,
      },
      fileFilter: (req, file, callback) => {
        const allowedMimes = [
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
          'application/octet-stream', // Some mobile multipart clients send octet-stream for m4a
        ];
        if (!file.mimetype || allowedMimes.includes(file.mimetype.toLowerCase())) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException(
              `Unsupported audio file MIME type: ${file.mimetype}. Allowed audio types: MP4, M4A, WAV, AAC, MP3, WebM.`,
            ),
            false,
          );
        }
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async transcribeAudio(@UploadedFile() file: any) {
    return this.voiceService.transcribeAudio(file);
  }

  /**
   * 2. Analyze problem transcript using Llama AI on NVIDIA NIM:
   * - Strict fact extraction without hallucination
   * - Dynamic domain & sub-domain without hardcoded defaults
   * - Multi-turn state accumulation
   * - Follow-up questions in speaker's language
   */
  @Post('analyze-turn')
  @HttpCode(HttpStatus.OK)
  async analyzeVoiceTurn(@Body() dto: AnalyzeVoiceTurnDto) {
    return this.voiceService.analyzeVoiceTurn(dto);
  }
}
