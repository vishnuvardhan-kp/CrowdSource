import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  MinLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SolutionCollaborationType } from '../../../common/enums';

export class CreateCollaborationOfferDto {
  @IsEnum(SolutionCollaborationType)
  collaboration_type: SolutionCollaborationType;

  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  financial_contribution?: number;

  @IsOptional()
  @IsString()
  resources_offered?: string;

  @IsOptional()
  @IsString()
  estimated_timeline?: string;
}
