import { IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Current password must be a string' })
  @IsNotEmpty({ message: 'Current password is required' })
  currentPassword!: string;

  @IsString({ message: 'New password must be a string' })
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'New password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+={}\[\]:;"'<>,.?/\\|~`-]).+$/, {
    message:
      'New password must include at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  newPassword!: string;

  @IsOptional()
  @IsString()
  tempToken?: string;
}
