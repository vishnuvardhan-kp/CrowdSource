import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTaxonomyRequestDto {
  @IsString()
  @MaxLength(150)
  proposed_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  proposed_category?: string;

  @IsString()
  reason: string;
}

export class ReviewTaxonomyRequestDto {
  @IsOptional()
  @IsString()
  admin_notes?: string;
}
