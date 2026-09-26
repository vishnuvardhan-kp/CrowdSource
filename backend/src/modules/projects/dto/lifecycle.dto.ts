import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ProjectStatus } from '../../../common/enums';

export class RecordPrototypeDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  stage?: string;

  @IsOptional()
  @IsObject()
  specifications?: Record<string, any>;

  @IsOptional()
  @IsArray()
  resourceNeeds?: string[];

  @IsOptional()
  @IsArray()
  partnerAssignments?: Array<{
    organizationId?: string;
    organizationName?: string;
    role?: string;
    contribution?: string;
  }>;

  @IsOptional()
  @IsString()
  evidenceDocumentId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordTestValidationDto {
  @IsString()
  testPlan: string;

  @IsString()
  testType: string;

  @IsOptional()
  parameters?: any;

  @IsString()
  testerName: string;

  @IsOptional()
  @IsString()
  testerRole?: string;

  @IsOptional()
  @IsString()
  testerOrgId?: string;

  @IsOptional()
  @IsString()
  lab?: string;

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsString()
  observedResults: string;

  @IsBoolean()
  passed: boolean;

  @IsOptional()
  @IsArray()
  issuesIdentified?: string[];

  @IsOptional()
  @IsString()
  correctiveAction?: string;

  @IsOptional()
  @IsBoolean()
  retestRequired?: boolean;

  @IsOptional()
  @IsString()
  evidenceDeliverableId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RecordPilotDeploymentDto {
  @IsString()
  location: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  implementingOrg?: string;

  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsNumber()
  targetCohortSize?: number;

  @IsOptional()
  @IsString()
  coverageScale?: string;

  @IsOptional()
  @IsString()
  targetBeneficiaryGroup?: string;

  @IsOptional()
  @IsArray()
  objectives?: string[];

  @IsOptional()
  @IsObject()
  baselineMetrics?: Record<string, any>;

  @IsOptional()
  @IsObject()
  observedImpactMetrics?: Record<string, any>;

  @IsOptional()
  @IsString()
  feedbackSummary?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  localApprovalConfirmed?: boolean;

  @IsOptional()
  @IsString()
  evidenceDeliverableId?: string;
}

export class RecordFinalDeploymentDto {
  @IsBoolean()
  readinessChecklistConfirmed: boolean;

  @IsOptional()
  @IsBoolean()
  finalValidationConfirmed?: boolean;

  @IsString()
  deploymentLocation: string;

  @IsOptional()
  @IsString()
  deploymentDate?: string;

  @IsString()
  handoverEntity: string;

  @IsString()
  handoverRecipient: string;

  @IsOptional()
  @IsString()
  implementationOrg?: string;

  @IsBoolean()
  trainingCompleted: boolean;

  @IsString()
  operationalStatus: string;

  @IsOptional()
  @IsString()
  maintenancePlan?: string;

  @IsOptional()
  @IsString()
  evidenceDeliverableId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransitionLifecycleStageDto {
  @IsEnum(ProjectStatus)
  targetStage: ProjectStatus;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}
