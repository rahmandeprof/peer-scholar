import { IsArray, IsOptional, IsString } from 'class-validator';

export class UploadDto {
  @IsOptional()
  @IsString()
  public description?: string;

  @IsOptional()
  @IsArray()
  public tags?: string[];
}
