import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNotEmpty,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EoiContributionType,
  EoiTimeline,
  EoiEvidenceType,
} from '../../../common/enums';

export class EoiContributionInputDto {
  @IsEnum(EoiContributionType)
  contribution_type: EoiContributionType;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateEoiDto {
  @IsString()
  @IsOptional()
  motivation?: string;

  @IsString()
  @IsOptional()
  proposed_contribution?: string;

  @IsString()
  @IsOptional()
  proposed_approach?: string;

  @IsString()
  @IsOptional()
  resource_summary?: string;

  @IsEnum(EoiTimeline)
  @IsOptional()
  timeline?: EoiTimeline;

  @IsString()
  @IsOptional()
  timeline_notes?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_name?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_designation?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_email?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_phone?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EoiContributionInputDto)
  contributions?: EoiContributionInputDto[];
}

export class UpdateEoiDto {
  @IsString()
  @IsOptional()
  motivation?: string;

  @IsString()
  @IsOptional()
  proposed_contribution?: string;

  @IsString()
  @IsOptional()
  proposed_approach?: string;

  @IsString()
  @IsOptional()
  resource_summary?: string;

  @IsEnum(EoiTimeline)
  @IsOptional()
  timeline?: EoiTimeline;

  @IsString()
  @IsOptional()
  timeline_notes?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_name?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_designation?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_email?: string;

  @IsString()
  @IsOptional()
  collaboration_lead_phone?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EoiContributionInputDto)
  contributions?: EoiContributionInputDto[];
}

export class WithdrawEoiDto {
  @IsString()
  @IsOptional()
  reason?: string;
}

export class RequestDiscussionDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

export class RejectEoiDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class FormCollaborativeProjectDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  eoi_ids: string[];

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateEoiEvidenceDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(EoiEvidenceType)
  @IsOptional()
  evidence_type?: EoiEvidenceType;
}
