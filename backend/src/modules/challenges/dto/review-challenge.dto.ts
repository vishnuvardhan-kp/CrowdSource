import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ChallengeStatus } from '../../../common/enums';

export class ReviewChallengeDto {
  @IsEnum(ChallengeStatus, {
    message: 'Status must be one of UNDER_REVIEW, VALIDATED, or REJECTED.',
  })
  status: ChallengeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters.' })
  reason?: string;
}
