import {
  IsUUID,
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { RepresentativeRelationship } from '../../../common/enums';

export class CreateMembershipDto {
  @IsUUID('4', { message: 'institution_id must be a valid UUID.' })
  @IsNotEmpty({ message: 'institution_id is required.' })
  institution_id: string;

  @IsEnum(RepresentativeRelationship, {
    message:
      'relationship must be EMPLOYEE, ELECTED_REPRESENTATIVE, AUTHORIZED_OFFICER, or AUTHORIZED_STAFF.',
  })
  @IsNotEmpty({ message: 'relationship is required.' })
  relationship: RepresentativeRelationship;

  @IsString()
  @IsNotEmpty({ message: 'designation is required.' })
  @MaxLength(150)
  designation: string;

  @IsOptional()
  @IsEmail({}, { message: 'official_email must be a valid email address.' })
  @MaxLength(255)
  official_email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  official_phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  department_name?: string;

  @IsOptional()
  metadata?: Record<string, any>;
}
