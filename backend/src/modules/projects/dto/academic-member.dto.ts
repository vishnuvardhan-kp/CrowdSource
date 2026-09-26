import { IsUUID, IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';
import { AcademicMemberRole, AcademicMemberStatus } from '../../../common/enums';

export class CreateAcademicMemberDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  organizationId: string;

  @IsEnum(AcademicMemberRole)
  role: AcademicMemberRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialization?: string;
}

export class UpdateAcademicMemberDto {
  @IsOptional()
  @IsEnum(AcademicMemberRole)
  role?: AcademicMemberRole;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  specialization?: string;

  @IsOptional()
  @IsEnum(AcademicMemberStatus)
  status?: AcademicMemberStatus;
}
