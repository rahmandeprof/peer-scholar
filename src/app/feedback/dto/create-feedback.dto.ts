import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;
}
