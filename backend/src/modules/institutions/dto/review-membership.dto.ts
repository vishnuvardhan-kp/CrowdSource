import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
} from 'class-validator';

export class ReviewMembershipDto {
  @IsIn(['APPROVE', 'REJECT', 'REQUEST_INFO'], {
    message: 'action must be APPROVE, REJECT, or REQUEST_INFO.',
  })
  @IsNotEmpty({ message: 'action is required.' })
  action: 'APPROVE' | 'REJECT' | 'REQUEST_INFO';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejection_reason?: string;

  @IsOptional()
  @IsDateString()
  valid_until?: string;
}
