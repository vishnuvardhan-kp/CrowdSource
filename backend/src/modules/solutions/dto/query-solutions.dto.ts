import {
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProposedSolutionStatus,
  SolutionCollaborationType,
} from '../../../common/enums';

export class QuerySolutionsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  subdomain?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsUUID('4')
  challenge_id?: string;

  @IsOptional()
  @IsUUID('4')
  cluster_id?: string;

  @IsOptional()
  @IsUUID('4')
  organization_id?: string;

  @IsOptional()
  @IsEnum(ProposedSolutionStatus)
  status?: ProposedSolutionStatus;

  @IsOptional()
  @IsEnum(SolutionCollaborationType)
  collaboration_type?: SolutionCollaborationType;

  @IsOptional()
  @IsString()
  capability?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
