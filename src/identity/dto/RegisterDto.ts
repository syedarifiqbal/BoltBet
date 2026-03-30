import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  password: string;
}
