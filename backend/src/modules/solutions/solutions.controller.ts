import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Headers,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';

import { SolutionsService, ExpressUploadedFile } from './solutions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

import {
  CreateProposedSolutionDto,
  UpdateProposedSolutionDto,
  QuerySolutionsDto,
  AddSolutionMemberDto,
  CreateCollaborationOfferDto,
  RespondCollaborationOfferDto,
  ConvertSolutionToProjectDto,
} from './dto';

@Controller('solutions')
export class SolutionsController {
  constructor(
    private readonly solutionsService: SolutionsService,
    private readonly jwtService: JwtService,
  ) {}

  private extractOptionalUserId(authHeader?: string): string | undefined {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    try {
      const token = authHeader.split(' ')[1];
      const decoded: any = this.jwtService.decode(token);
      return decoded?.sub;
    } catch {
      return undefined;
    }
  }

  // 1. Browse Open Solution Workspace (Public & Authenticated)
  @Get()
  async getPublicSolutions(@Query() query: QuerySolutionsDto) {
    return this.solutionsService.getPublicSolutions(query);
  }

  // 2. Proposing University Solutions
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMySolutions(
    @CurrentUser('id') userId: string,
    @Query('orgId') orgId?: string,
    @CurrentUser('primaryOrganizationId') primaryOrgId?: string,
  ) {
    const targetOrgId = orgId || primaryOrgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required.');
    }
    return this.solutionsService.getMyOrganizationSolutions(targetOrgId, userId);
  }

  // 3. Get Solution Detail
  @Get(':id')
  async getSolutionById(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractOptionalUserId(authHeader);
    return this.solutionsService.getSolutionById(id, userId);
  }

  // 4. Create Proposed Solution (Draft)
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSolution(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProposedSolutionDto,
    @Query('orgId') orgId?: string,
    @CurrentUser('primaryOrganizationId') primaryOrgId?: string,
  ) {
    const targetOrgId = orgId || primaryOrgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required to create a proposed solution.');
    }
    return this.solutionsService.createSolution(targetOrgId, userId, dto);
  }

  // 5. Update Solution
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProposedSolutionDto,
  ) {
    return this.solutionsService.updateSolution(id, userId, dto);
  }

  // 6. Submit Solution for Review / Publication
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.solutionsService.submitSolution(id, userId);
  }

  // 7. Publish Solution to Open Solution Workspace
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async publishSolution(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.solutionsService.publishSolution(id, userId);
  }

  // 8. Team Member Assignment
  @Post(':id/team-members')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: AddSolutionMemberDto,
  ) {
    return this.solutionsService.addTeamMember(id, userId, dto);
  }

  @Delete(':id/team-members/:memberId')
  @UseGuards(JwtAuthGuard)
  async removeTeamMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.solutionsService.removeTeamMember(id, memberId, userId);
  }

  // 9. Supporting Documents Upload & Download
  @Post(':id/documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile() file: ExpressUploadedFile,
    @Body('title') title?: string,
    @Body('document_type') documentType?: any,
  ) {
    return this.solutionsService.uploadDocument(id, userId, file, documentType, title);
  }

  @Delete(':id/documents/:documentId')
  @UseGuards(JwtAuthGuard)
  async removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.solutionsService.removeDocument(id, documentId, userId);
  }

  @Get('documents/:filename/download')
  serveDocumentFile(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Headers('authorization') authHeader?: string,
  ) {
    const userId = this.extractOptionalUserId(authHeader);
    return this.solutionsService.serveDocumentFile(filename, res, userId);
  }

  // 10. Collaboration Offers
  @Post(':id/collaborations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createCollaborationOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCollaborationOfferDto,
    @Query('orgId') orgId?: string,
    @CurrentUser('primaryOrganizationId') primaryOrgId?: string,
  ) {
    const targetOrgId = orgId || primaryOrgId;
    if (!targetOrgId) {
      throw new BadRequestException('Organization ID is required to offer collaboration.');
    }
    return this.solutionsService.createCollaborationOffer(id, targetOrgId, userId, dto);
  }

  @Post(':id/collaborations/:offerId/respond')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async respondToCollaborationOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RespondCollaborationOfferDto,
  ) {
    return this.solutionsService.respondToCollaborationOffer(id, offerId, userId, dto);
  }

  // 11. Convert to Project
  @Post(':id/convert-to-project')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async convertToProject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ConvertSolutionToProjectDto,
  ) {
    return this.solutionsService.convertToProject(id, userId, dto);
  }
}
