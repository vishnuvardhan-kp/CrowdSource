import {
  IsOptional,
  IsEnum,
  IsString,
  IsUUID,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { InstitutionType, InstitutionSubtype } from '../../../common/enums';

export class SearchInstitutionsDto {
  @IsOptional()
  @IsEnum(InstitutionType)
  type?: InstitutionType;

  @IsOptional()
  @IsEnum(InstitutionSubtype)
  subtype?: InstitutionSubtype;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsUUID('4')
  district_id?: string;

  @IsOptional()
  @IsUUID('4')
  block_id?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  lgd_code?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
