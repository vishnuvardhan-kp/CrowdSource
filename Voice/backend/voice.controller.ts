import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceService } from './voice.service';
import { AnalyzeVoiceTurnDto } from './voice.dto';

/**
 * CitizenVoiceModule Controller
 *
 * Exposes:
 * - POST /api/voice/transcribe (multipart file upload)
 * - POST /api/voice/analyze-turn (JSON body turn analysis)
 *
 * Note: Apply your application's authentication guard (e.g. JwtAuthGuard)
 * at the controller or route level as required by your project.
 */
@Controller('voice')
export class VoiceController {
  constructor(private readonly voiceService: VoiceService) {}

  /**
   * 1. Receive recorded audio file, forward to Sarvam STT, return transcript + translation
   */
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async transcribeAudio(@UploadedFile() file: any) {
    return this.voiceService.transcribeAudio(file);
  }

  /**
   * 2. Analyze problem transcript using Llama AI on NVIDIA NIM:
   * - Strict fact extraction
   * - Dynamic domain & sub-domain
   * - Multi-turn state accumulation
   * - Follow-up questions in speaker's language
   */
  @Post('analyze-turn')
  @HttpCode(HttpStatus.OK)
  async analyzeVoiceTurn(@Body() dto: AnalyzeVoiceTurnDto) {
    return this.voiceService.analyzeVoiceTurn(dto);
  }
}
