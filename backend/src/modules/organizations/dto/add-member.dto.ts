import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { UserRole, OrganizationRole } from '../../../common/enums';

export class AddOrganizationMemberDto {
  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole = UserRole.FACULTY;

  @IsOptional()
  @IsEnum(OrganizationRole)
  organization_role?: OrganizationRole = OrganizationRole.MEMBER;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  designation?: string;
}
