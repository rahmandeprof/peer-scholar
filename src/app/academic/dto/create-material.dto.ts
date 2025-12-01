import { AccessScope, MaterialType } from '../entities/material.entity';

import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MaterialType)
  type: MaterialType;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsString()
  @IsOptional()
  fileType?: string;

  @IsNumber()
  @IsOptional()
  size?: number;

  @IsString()
  @IsNotEmpty()
  courseId: string;

  @IsEnum(AccessScope)
  @IsOptional()
  scope?: AccessScope;

  @IsArray()
  @IsOptional()
  tags?: string[];
}
