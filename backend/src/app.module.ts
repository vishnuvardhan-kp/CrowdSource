import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CapabilitiesModule } from './modules/capabilities/capabilities.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { IndustriesModule } from './modules/industries/industries.module';
import { VerificationModule } from './modules/verification/verification.module';
import { LocationsModule } from './modules/locations/locations.module';
import { ChallengesModule } from './modules/challenges/challenges.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ImpactModule } from './modules/impact/impact.module';
import { EoisModule } from './modules/eois/eois.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ProblemClustersModule } from './modules/problem-clusters/problem-clusters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig],
      envFilePath: ['.env.local', '.env', '../.env'],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CapabilitiesModule,
    InstitutionsModule,
    IndustriesModule,
    VerificationModule,
    LocationsModule,
    ChallengesModule,
    AiAnalysisModule,
    ReviewsModule,
    ProjectsModule,
    ImpactModule,
    EoisModule,
    NotificationsModule,
    AnalyticsModule,
    ProblemClustersModule,
  ],
})
export class AppModule {}
