import { IsString, IsOptional, IsUUID, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { EvidenceType } from '../../../common/enums';

export class CreateOrganizationEvidenceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(EvidenceType)
  evidence_type?: EvidenceType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  mime_type?: string;

  // Provenance / Linkage to specific capability claim (optional)
  @IsOptional()
  @IsUUID()
  institution_capability_id?: string;

  @IsOptional()
  @IsUUID()
  industry_capability_id?: string;

  @IsOptional()
  @IsUUID()
  capability_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  is_public?: boolean;
}


