import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LocationsModule } from '../locations/locations.module';
import { VoiceController } from './voice.controller';
import { VoiceService } from './voice.service';

@Module({
  imports: [ConfigModule, LocationsModule],
  controllers: [VoiceController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
