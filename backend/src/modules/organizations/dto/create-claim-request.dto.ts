import { IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateClaimRequestDto {
  @IsUUID('4', { message: 'A valid organization UUID is required' })
  @IsNotEmpty()
  organization_id: string;

  @IsString()
  @IsNotEmpty({ message: 'Claim justification reason is required' })
  @MinLength(10, { message: 'Reason must be at least 10 characters long' })
  reason: string;
}
