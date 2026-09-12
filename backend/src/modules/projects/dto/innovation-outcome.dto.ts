import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
} from 'class-validator';
import {
  InnovationOutcomeType,
  InnovationOutcomeStatus,
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
