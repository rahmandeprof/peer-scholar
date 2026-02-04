import { LinkType } from '../entities/helpful-link.entity';

import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class CreateHelpfulLinkDto {
  @IsUrl()
  url: string;

  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(LinkType)
  linkType?: LinkType;

  @IsString()
  materialId: string;
}

export class UpdateHelpfulLinkDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(LinkType)
  linkType?: LinkType;
}
