import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTimerSettingsDto {
    @IsOptional()
    @IsInt()
    @Min(60) // Minimum 1 minute
    @Max(7200) // Maximum 2 hours
    studyDuration?: number;

    @IsOptional()
    @IsInt()
    @Min(60) // Minimum 1 minute
    @Max(3600) // Maximum 1 hour
    testDuration?: number;

    @IsOptional()
    @IsInt()
    @Min(60) // Minimum 1 minute
    @Max(1800) // Maximum 30 minutes
    restDuration?: number;
}
