import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChallengeAiAnalysis } from './entities/challenge-ai-analysis.entity';
import { EntityEmbedding } from './entities/entity-embedding.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { Capability } from '../capabilities/entities/capability.entity';
import { AiAnalysisService } from './ai-analysis.service';
import { AiAnalysisController } from './ai-analysis.controller';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ChallengeAiAnalysis,
      EntityEmbedding,
      Challenge,
      Capability,
    ]),
    forwardRef(() => ReviewsModule),
  ],
  controllers: [AiAnalysisController],
  providers: [AiAnalysisService],
  exports: [AiAnalysisService, TypeOrmModule],
})
export class AiAnalysisModule {}
