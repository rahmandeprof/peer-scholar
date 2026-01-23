import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class SaveQuizResultDto {
  @IsUUID()
  materialId: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  totalQuestions: number;
}
