import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { CreateUserDto } from '@/app/users/dto/create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    @IsBoolean()
    @IsOptional()
    isVerified?: boolean;

    @IsString()
    @IsOptional()
    @MinLength(3)
    @MaxLength(50)
    username?: string;

    @IsString()
    @IsOptional()
    @IsIn(['username', 'fullname'])
    displayNamePreference?: 'username' | 'fullname';

    @IsBoolean()
    @IsOptional()
    showOnLeaderboard?: boolean;
}

