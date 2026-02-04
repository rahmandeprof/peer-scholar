import { FlagReason } from '../entities/material-flag.entity';

import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class FlagMaterialDto {
  @IsEnum(FlagReason)
  reason: FlagReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
