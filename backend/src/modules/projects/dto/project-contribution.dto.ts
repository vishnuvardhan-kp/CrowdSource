import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import {
  ProjectContributionType,
  ContributionStatus,
  ContributionVisibility,
} from '../../../common/enums';

export class CreateProjectContributionDto {
  @IsEnum(ProjectContributionType)
  contributionType: ProjectContributionType;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(ContributionVisibility)
  visibility?: ContributionVisibility;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsObject()
  transferDetails?: Record<string, any>;

  @IsOptional()
  isRequired?: boolean;
}

export class UpdateProjectContributionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ContributionVisibility)
  visibility?: ContributionVisibility;

  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  evidenceUrl?: string;

  @IsOptional()
  @IsObject()
  transferDetails?: Record<string, any>;
}

export class VerifyContributionDto {
  @IsEnum(ContributionStatus)
  decision: ContributionStatus;

  @IsString()
  @MinLength(3)
  verificationNotes: string;
}
