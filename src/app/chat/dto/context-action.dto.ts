import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

export enum ContextActionType {
  SIMPLIFY = 'simplify',
  MNEMONIC = 'mnemonic',
  KEYWORDS = 'keywords',
  QUIZ = 'quiz',
}

export class ContextActionDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsEnum(ContextActionType)
  action: ContextActionType;
}
