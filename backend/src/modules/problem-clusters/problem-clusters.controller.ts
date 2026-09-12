import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProblemClustersService } from './problem-clusters.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import {
  QueryProblemClustersDto,
  ReviewPotentialMatchDto,
  RejectProblemClusterDto,
} from './dto';

@Controller('problem-clusters')
export class ProblemClustersController {
  constructor(private readonly clustersService: ProblemClustersService) {}

  /**
   * GET /api/problem-clusters
   * Discover consolidated societal problem clusters.
   */
  @Get()
  async getClusters(@Query() query: QueryProblemClustersDto) {
    return this.clustersService.getClusters(query);
  }

  /**
   * GET /api/problem-clusters/:id
   * Detailed problem cluster intelligence, including underlying citizen reports and aggregated evidence.
   */
  @Get(':id')
  async getClusterById(@Param('id', ParseUUIDPipe) id: string) {
    return this.clustersService.getClusterById(id);
  }

  /**
   * POST /api/problem-clusters/:id/verify
   * Single Government Verification step: Validates the consolidated societal problem
   * and automatically marks all underlying citizen reports as VALIDATED.
   */
  @Post(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.GOVERNMENT_OFFICER,
    UserRole.GOVERNMENT_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async verifyCluster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.clustersService.verifyCluster(id, reviewerId);
  }

  /**
   * POST /api/problem-clusters/:id/reject
   * Rejects a problem cluster with mandatory reason.
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.GOVERNMENT_OFFICER,
    UserRole.GOVERNMENT_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async rejectCluster(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: RejectProblemClusterDto,
  ) {
    return this.clustersService.rejectCluster(id, reviewerId, dto);
  }

  /**
   * POST /api/problem-clusters/potential-matches/:reportId/review
   * Evaluates medium-confidence match.
   * If REJECT: IMMEDIATELY creates a new independent ProblemCluster for the report.
   */
  @Post('potential-matches/:reportId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.GOVERNMENT_OFFICER,
    UserRole.GOVERNMENT_ADMIN,
  )
  @HttpCode(HttpStatus.OK)
  async reviewPotentialMatch(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ReviewPotentialMatchDto,
  ) {
    return this.clustersService.reviewPotentialMatch(reportId, dto, reviewerId);
  }
}
