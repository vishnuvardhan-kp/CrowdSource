import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Challenge } from './entities/challenge.entity';
import { ChallengeEvidence } from './entities/challenge-evidence.entity';
import { ChallengeConfirmation } from './entities/challenge-confirmation.entity';
import { User } from '../users/entities/user.entity';
import { VerificationRecord } from '../verification/entities/verification-record.entity';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { EvidenceService } from './services/evidence.service';
import { DraftCleanupService } from './services/draft-cleanup.service';
import { LocationsModule } from '../locations/locations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ProblemClustersModule } from '../problem-clusters/problem-clusters.module';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { AuthModule } from '../auth/auth.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Challenge,
      ChallengeEvidence,
      ChallengeConfirmation,
      User,
      VerificationRecord,
    ]),
    LocationsModule,
    NotificationsModule,
    ProblemClustersModule,
    AuthModule,
    forwardRef(() => AiAnalysisModule),
    forwardRef(() => ReviewsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('app.jwtSecret') ||
          configService.get<string>('JWT_SECRET') ||
          'dev-jwt-secret-key-change-in-prod',
        signOptions: {
          expiresIn:
            configService.get<string>('app.jwtExpiresIn') ||
            configService.get<string>('JWT_EXPIRES_IN') ||
            '7d',
        },
      }),
    }),
  ],
  controllers: [ChallengesController],
  providers: [ChallengesService, EvidenceService, DraftCleanupService],
  exports: [ChallengesService, EvidenceService, TypeOrmModule],
})
export class ChallengesModule {}
