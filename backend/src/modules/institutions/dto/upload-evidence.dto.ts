import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
} from 'class-validator';
import { InstitutionEvidenceType } from '../../../common/enums';

export class UploadEvidenceDto {
  @IsEnum(InstitutionEvidenceType, {
    message:
      'evidence_type must be APPOINTMENT_LETTER, OFFICIAL_ID_CARD, AUTHORIZATION_RESOLUTION, GOVERNMENT_ORDER, or OTHER.',
  })
  @IsNotEmpty({ message: 'evidence_type is required.' })
  evidence_type: InstitutionEvidenceType;

  @IsString()
  @IsNotEmpty({ message: 'document_url is required.' })
  document_url: string;

  @IsString()
  @IsNotEmpty({ message: 'document_name is required.' })
  @MaxLength(255)
  document_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  mime_type?: string;

  @IsOptional()
  @IsNumber()
  file_size?: number;
}
