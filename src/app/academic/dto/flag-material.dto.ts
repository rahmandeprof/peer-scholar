import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { FlagReason } from '../entities/material-flag.entity';

export class FlagMaterialDto {
    @IsEnum(FlagReason)
    reason: FlagReason;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;
}
