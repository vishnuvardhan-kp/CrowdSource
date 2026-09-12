import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { CitizenSeverity } from '../../../common/enums';

export class CreateChallengeDto {
  @IsString()
  @IsNotEmpty({ message: 'Problem title is required.' })
  @MinLength(5, { message: 'Title must be at least 5 characters long.' })
  @MaxLength(300, { message: 'Title cannot exceed 300 characters.' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Problem description is required.' })
  @MinLength(10, { message: 'Description must be at least 10 characters long.' })
  @MaxLength(5000, { message: 'Description cannot exceed 5000 characters.' })
  description: string;

  @IsOptional()
  @IsUUID('4', { message: 'district_id must be a valid UUID.' })
  district_id?: string;

  @IsOptional()
  @IsUUID('4', { message: 'block_id must be a valid UUID.' })
  block_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  village_locality?: string;

  @IsOptional()
  @IsEnum(CitizenSeverity, { message: 'citizen_severity must be NOT_SURE, MODERATE, or SERIOUS.' })
  citizen_severity?: CitizenSeverity;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  affected_population?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  original_language?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  original_text?: string;
}

