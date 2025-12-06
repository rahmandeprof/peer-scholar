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
  @IsOptional()
  courseId?: string;

  @IsString()
  @IsOptional()
  courseCode?: string;

  @IsString()
  @IsOptional()
  targetFaculty?: string;

  @IsString()
  @IsOptional()
  targetDepartment?: string;

  @IsString()
  @IsOptional()
  topic?: string;

  @IsEnum(AccessScope)
  @IsOptional()
  scope?: AccessScope;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsNumber()
  @IsOptional()
  targetYear?: number;

  @IsString()
  @IsOptional()
  fileHash?: string;

  @IsString()
  @IsOptional()
  parentMaterialId?: string;
}
