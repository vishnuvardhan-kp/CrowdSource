import { IsString, IsNotEmpty } from 'class-validator';

export class TranslateChallengeDto {
  @IsString()
  @IsNotEmpty({ message: 'Target language code is required.' })
  target_language: string;
}
