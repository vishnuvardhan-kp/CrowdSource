import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProblemClusterStatus, ChallengePriority } from '../../../common/enums';

export class QueryProblemClustersDto {
  @IsOptional()
  @IsEnum(ProblemClusterStatus)
  status?: ProblemClusterStatus;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(ChallengePriority)
  priority?: ChallengePriority;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  search?: string;

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

export class ReviewPotentialMatchDto {
  @IsEnum(['ACCEPT', 'REJECT'])
  action: 'ACCEPT' | 'REJECT';

  @IsOptional()
  @IsString()
  reason?: string;
}

export class RejectProblemClusterDto {
  @IsString()
  reason: string;
}
