import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class UpdateAcademicProfileDto {
  @IsString()
  @IsNotEmpty()
  schoolId: string;

  @IsString()
  @IsNotEmpty()
  facultyId: string;

  @IsString()
  @IsNotEmpty()
  departmentId: string;

  @IsInt()
  @Min(1)
  yearOfStudy: number;
}
