import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProblemCluster } from './entities/problem-cluster.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { ChallengeEvidence } from '../challenges/entities/challenge-evidence.entity';
import { ProblemClustersService } from './problem-clusters.service';
import { ProblemClustersController } from './problem-clusters.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProblemCluster, Challenge, ChallengeEvidence]),
    NotificationsModule,
    forwardRef(() => ReviewsModule),
  ],
  controllers: [ProblemClustersController],
  providers: [ProblemClustersService],
  exports: [ProblemClustersService],
})
export class ProblemClustersModule {}
