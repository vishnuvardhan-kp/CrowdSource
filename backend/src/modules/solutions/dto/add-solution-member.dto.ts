import {
  IsString,
  IsUUID,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SolutionTeamRole } from '../../../common/enums';

export class AddSolutionMemberDto {
  @IsOptional()
  @IsUUID('4')
  user_id?: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsEnum(SolutionTeamRole)
  role: SolutionTeamRole;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;

  @IsOptional()
  @IsString()
  degree_program?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  student_year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(80)
  weekly_commitment_hours?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialization_skills?: string[];
}
