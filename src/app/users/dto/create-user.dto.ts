import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  lastName!: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Transform(({ value }) => value?.trim())
  password!: string;

  @IsString()
  @IsOptional()
  googleId?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  schoolId?: string;

  // Legacy string field for school name
  @IsString()
  @IsOptional()
  school?: string;

  @IsString()
  @IsOptional()
  faculty?: string;

  @IsString()
  @IsOptional()
  facultyId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsOptional()
  yearOfStudy?: number;

  // Referral code (referrer's user ID)
  @IsString()
  @IsOptional()
  referralCode?: string;
}
