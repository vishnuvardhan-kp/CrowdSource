import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ImpactMetricCategory,
  ImpactEvidenceType,
} from '../../../common/enums';

export class CreateImpactAssessmentDto {
  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsNotEmpty()
  problem_addressed: string;

  @IsString()
  @IsNotEmpty()
  solution_implemented: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  beneficiaries_reached?: number;

  @IsOptional()
  @IsString()
  geographic_coverage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  implementation_cost?: number;

  @IsOptional()
  @IsString()
  sustainability_notes?: string;
}

export class UpdateImpactAssessmentDto {
  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  problem_addressed?: string;

  @IsOptional()
  @IsString()
  solution_implemented?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  beneficiaries_reached?: number;

  @IsOptional()
  @IsString()
  geographic_coverage?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  implementation_cost?: number;

  @IsOptional()
  @IsString()
  sustainability_notes?: string;
}

export class CreateImpactMetricDto {
  @IsEnum(ImpactMetricCategory)
  metric_category: ImpactMetricCategory;

  @IsString()
  @IsNotEmpty()
  metric_name: string;

  @IsOptional()
  @IsString()
  baseline_value?: string;

  @IsOptional()
  @IsString()
  target_value?: string;

  @IsString()
  @IsNotEmpty()
  actual_value: string;

  @IsString()
  @IsNotEmpty()
  unit: string;

  @IsString()
  @IsNotEmpty()
  measurement_method: string;
}

export class UpdateImpactMetricDto {
  @IsOptional()
  @IsEnum(ImpactMetricCategory)
  metric_category?: ImpactMetricCategory;

  @IsOptional()
  @IsString()
  metric_name?: string;

  @IsOptional()
  @IsString()
  baseline_value?: string;

  @IsOptional()
  @IsString()
  target_value?: string;

  @IsOptional()
  @IsString()
  actual_value?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  measurement_method?: string;
}

export class CreateImpactEvidenceDto {
  @IsEnum(ImpactEvidenceType)
  document_type: ImpactEvidenceType;

  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateImpactFeedbackDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  feedback: string;

  @IsOptional()
  @IsBoolean()
  benefit_confirmed?: boolean;
}

export class ImpactReviewActionDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RequireRevisionDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class RejectImpactDto {
  @IsString()
  @IsNotEmpty()
  notes: string;
}

export class RevokeImpactDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
