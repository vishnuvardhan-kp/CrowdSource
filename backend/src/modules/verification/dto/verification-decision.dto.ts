import { IsEnum, IsOptional, IsString } from 'class-validator';
import { VerificationStatus } from '../../../common/enums';

export enum TargetEntityType {
  ORGANIZATION = 'ORGANIZATION',
  INSTITUTION_CAPABILITY = 'INSTITUTION_CAPABILITY',
  INDUSTRY_CAPABILITY = 'INDUSTRY_CAPABILITY',
  EVIDENCE = 'EVIDENCE',
}

export class VerificationDecisionDto {
  @IsEnum(TargetEntityType)
  target_type: TargetEntityType;

  @IsOptional()
  @IsString()
  notes?: string;
}
