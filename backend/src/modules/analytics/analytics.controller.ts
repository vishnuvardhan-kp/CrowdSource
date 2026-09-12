import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService, AnalyticsFilters } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getOverview(user, filters);
  }

  @Get('challenges')
  async getChallenges(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getChallengesAnalytics(user, filters);
  }

  @Get('action-queue')
  async getActionQueue(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getActionQueue(user, filters);
  }

  @Get('matching-insights')
  async getMatchingInsights(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getMatchingInsights(user, filters);
  }

  @Get('districts')
  async getDistricts(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getDistrictsAnalytics(user, filters);
  }

  @Get('problem-clusters')
  async getProblemClusters(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getProblemClustersAnalytics(user, filters);
  }

  @Get('projects')
  async getProjects(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getProjectsAnalytics(user, filters);
  }

  @Get('ecosystem')
  async getEcosystem(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getEcosystemAnalytics(user, filters);
  }

  @Get('impact')
  async getImpact(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getImpactAnalytics(user, filters);
  }

  @Get('innovations')
  async getInnovations(
    @Query() filters: AnalyticsFilters,
    @CurrentUser() user: any,
  ) {
    return this.analyticsService.getInnovationOutcomes(user, filters);
  }
}
