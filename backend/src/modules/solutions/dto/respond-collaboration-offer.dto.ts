import { IsString, IsIn, IsOptional } from 'class-validator';

export class RespondCollaborationOfferDto {
  @IsOptional()
  @IsIn([
    'ACCEPT',
    'DECLINE',
    'DISCUSS',
    'CLARIFY',
    'ACCEPTED',
    'DECLINED',
    'UNDER_DISCUSSION',
    'CLARIFICATION_REQUESTED',
  ])
  action?:
    | 'ACCEPT'
    | 'DECLINE'
    | 'DISCUSS'
    | 'CLARIFY'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'UNDER_DISCUSSION'
    | 'CLARIFICATION_REQUESTED';

  @IsOptional()
  @IsIn([
    'ACCEPT',
    'DECLINE',
    'DISCUSS',
    'CLARIFY',
    'ACCEPTED',
    'DECLINED',
    'UNDER_DISCUSSION',
    'CLARIFICATION_REQUESTED',
  ])
  status?:
    | 'ACCEPT'
    | 'DECLINE'
    | 'DISCUSS'
    | 'CLARIFY'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'UNDER_DISCUSSION'
    | 'CLARIFICATION_REQUESTED';

  @IsOptional()
  @IsString()
  response_notes?: string;

  @IsOptional()
  @IsString()
  discussion_notes?: string;
}
