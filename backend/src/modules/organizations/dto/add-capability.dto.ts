import { IsUUID, IsOptional, IsString } from 'class-validator';

export class AddCapabilityDto {
  @IsUUID()
  capability_id: string;

  // For HEIs
  @IsOptional()
  @IsUUID()
  department_id?: string;

  @IsOptional()
  @IsUUID()
  laboratory_id?: string;

  // For Industry
  @IsOptional()
  @IsUUID()
  support_type_id?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  evidence_summary?: string;
}
