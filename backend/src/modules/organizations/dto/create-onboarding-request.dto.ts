import {
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  MinLength,
  MaxLength,
} from 'class-validator';
import { OrganizationType, GeographicReach } from '../../../common/enums';

export class CreateOnboardingRequestDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @IsEnum(OrganizationType)
  organization_type: OrganizationType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  registration_number?: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  district: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsEnum(GeographicReach)
  geographic_reach?: GeographicReach;

  @IsOptional()
  @IsString()
  verification_document_url?: string;
}
