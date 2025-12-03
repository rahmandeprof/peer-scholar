import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateAcademicProfileDto {
  @IsString()
  @IsOptional()
  schoolId?: string;

  @IsString()
  @IsOptional()
  facultyId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  yearOfStudy?: number;
}
