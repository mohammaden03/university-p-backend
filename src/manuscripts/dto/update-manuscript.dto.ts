import { PartialType } from '@nestjs/swagger';
import { CreateManuscriptDto } from './create-manuscript.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Language } from '@prisma/client';

export class UpdateManuscriptDto extends PartialType(CreateManuscriptDto) {}

export class QueryManuscriptDto {
  @ApiPropertyOptional({ description: 'Search term for title, author, or description' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: Language, description: 'Filter by manuscript language' })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({ description: 'Filter by calligraphic script (e.g. نستعلیق, نسخ)' })
  @IsString()
  @IsOptional()
  scriptType?: string;

  @ApiPropertyOptional({ description: 'Filter by historical period' })
  @IsString()
  @IsOptional()
  historicalPeriod?: string;

  @ApiPropertyOptional({ description: 'Filter by repository name' })
  @IsString()
  @IsOptional()
  repositoryName?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 10;
}
