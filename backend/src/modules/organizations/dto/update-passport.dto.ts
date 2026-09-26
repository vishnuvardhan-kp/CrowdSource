import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DepartmentItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class LaboratoryItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  lab_type?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResearchAreaItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdatePassportDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  geographic_reach?: any;

  // HEI Specific
  @IsOptional()
  @IsString()
  institution_code?: string;

  @IsOptional()
  @IsString()
  institution_category?: string;

  @IsOptional()
  @IsNumber()
  established_year?: number;

  @IsOptional()
  @IsString()
  campus_area?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DepartmentItemDto)
  departments?: DepartmentItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LaboratoryItemDto)
  laboratories?: LaboratoryItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResearchAreaItemDto)
  research_areas?: ResearchAreaItemDto[];

  // Industry Specific
  @IsOptional()
  @IsString()
  company_registration_number?: string;

  @IsOptional()
  @IsString()
  industry_type?: string;

  @IsOptional()
  @IsString()
  headquarters?: string;
}
