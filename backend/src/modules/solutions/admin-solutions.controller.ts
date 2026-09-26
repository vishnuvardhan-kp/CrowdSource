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
import { SolutionsService } from './solutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';
import { QuerySolutionsDto, ConvertSolutionToProjectDto } from './dto';

@Controller('admin/solutions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.PLATFORM_ADMIN,
  UserRole.GOVERNMENT_OFFICER,
  UserRole.GOVERNMENT_ADMIN,
)
export class AdminSolutionsController {
  constructor(private readonly solutionsService: SolutionsService) {}

  @Get()
  async getSolutionsQueue(@Query() query: QuerySolutionsDto) {
    return this.solutionsService.getPublicSolutions(query);
  }

  @Post(':id/review')
  @HttpCode(HttpStatus.OK)
  async adminReviewSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('review_notes') reviewNotes?: string,
  ) {
    return this.solutionsService.reviewSolution(id, reviewerId, reviewNotes);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async adminRejectSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body('reason') reason: string,
  ) {
    return this.solutionsService.rejectSolution(id, reviewerId, reason);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  async adminPublishSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
  ) {
    return this.solutionsService.publishSolution(id, reviewerId);
  }

  @Post(':id/convert-to-project')
  @HttpCode(HttpStatus.CREATED)
  async adminConvertToProject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') reviewerId: string,
    @Body() dto: ConvertSolutionToProjectDto,
  ) {
    return this.solutionsService.convertToProject(id, reviewerId, dto);
  }
}
