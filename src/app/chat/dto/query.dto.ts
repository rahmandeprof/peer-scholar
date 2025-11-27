import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryDto {
  @IsString()
  question!: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  topK?: number = 4;
}
