import { IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ValidateIf((o) => !o.email && !o.phone && !o.identifier)
  @IsNotEmpty({ message: 'Either email, phone, or identifier is required' })
  readonly _identifierCheck?: string;
}
