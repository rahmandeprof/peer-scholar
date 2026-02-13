import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @MinLength(6)
  @Transform(({ value }) => value?.trim())
  password!: string;

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
