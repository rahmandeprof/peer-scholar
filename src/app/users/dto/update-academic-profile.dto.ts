import { IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class UpdateAcademicProfileDto {
  // New FK-based fields (UUIDs)
  @IsUUID()
  @IsOptional()
  schoolId?: string;

  @IsUUID()
  @IsOptional()
  facultyId?: string;

  @IsUUID()
  @IsOptional()
  departmentId?: string;

  // Legacy string fields (names) - for backward compatibility
  @IsString()
  @IsOptional()
  school?: string;

  @IsString()
  @IsOptional()
  faculty?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  yearOfStudy?: number;
}
