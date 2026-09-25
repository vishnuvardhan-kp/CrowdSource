import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import {
  InnovationOutcomeType,
  InnovationOutcomeStatus,
  ProjectIpAssessmentStatus,
} from '../../../common/enums';

export class CreateInnovationOutcomeDto {
  @IsEnum(InnovationOutcomeType)
  outcome_type: InnovationOutcomeType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsEnum(InnovationOutcomeStatus)
  @IsOptional()
  status?: InnovationOutcomeStatus;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateInnovationOutcomeDto {
  @IsEnum(InnovationOutcomeType)
  @IsOptional()
  outcome_type?: InnovationOutcomeType;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsString()
  @IsOptional()
  organization_id?: string;

  @IsEnum(InnovationOutcomeStatus)
  @IsOptional()
  status?: InnovationOutcomeStatus;

  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyInnovationOutcomeDto {
  @IsEnum(InnovationOutcomeStatus)
  status: InnovationOutcomeStatus;

  @IsString()
  @IsOptional()
  verification_notes?: string;

  @IsString()
  @IsOptional()
  reference_number?: string;
}

export class RecordIpAssessmentDto {
  @IsEnum(ProjectIpAssessmentStatus)
  ip_status: ProjectIpAssessmentStatus;

  @IsString()
  @IsOptional()
  assessment_date?: string;

  @IsString()
  @IsNotEmpty()
  assessor_name: string;

  @IsString()
  @IsOptional()
  assessor_role?: string;

  @IsString()
  @IsOptional()
  assessor_organization_id?: string;

  @IsString()
  @IsOptional()
  protection_type?: string;

  @IsString()
  @IsOptional()
  reference_number?: string;

  @IsString()
  @IsNotEmpty()
  assessment_notes: string;

  @IsBoolean()
  @IsOptional()
  is_confidential?: boolean;

  @IsString()
  @IsOptional()
  commercialization_path?: string;

  @IsString()
  @IsOptional()
  evidence_deliverable_id?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
