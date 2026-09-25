import {
  IsString,
  IsUUID,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SolutionVisibility } from '../../../common/enums';

export class CreateProposedSolutionDto {
  @IsUUID('4')
  challenge_id: string;

  @IsOptional()
  @IsUUID('4')
  cluster_id?: string;

  @IsString()
  @MinLength(5)
  title: string;

  @IsOptional()
  @IsString()
  executive_summary?: string;

  @IsOptional()
  @IsString()
  problem_understanding?: string;

  @IsOptional()
  @IsString()
  proposed_approach?: string;

  @IsOptional()
  @IsString()
  technical_approach?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  required_capabilities?: string[];

  @IsOptional()
  @IsString()
  expected_outcomes?: string;

  @IsOptional()
  @IsString()
  expected_social_impact?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimated_budget?: number;

  @IsOptional()
  @IsString()
  estimated_timeline?: string;

  @IsOptional()
  @IsString()
  required_resources?: string;

  @IsOptional()
  @IsString()
  prototype_requirements?: string;

  @IsOptional()
  @IsString()
  deployment_requirements?: string;

  @IsOptional()
  @IsString()
  innovation_potential?: string;

  @IsOptional()
  @IsString()
  ip_potential?: string;

  @IsOptional()
  @IsEnum(SolutionVisibility)
  visibility?: SolutionVisibility = SolutionVisibility.PUBLIC;
}
