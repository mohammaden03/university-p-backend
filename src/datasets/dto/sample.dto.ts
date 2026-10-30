import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DatasetSampleStatus, DatasetSplit } from '@prisma/client';

export class CreateDatasetSampleDto {
  @ApiProperty({
    example: 'd9b1a512-4217-4e63-bfb1-9bb445b23d11',
    description: 'UUID of the manuscript page',
  })
  @IsUUID()
  @IsNotEmpty()
  pageId!: string;

  @ApiPropertyOptional({
    example: 'e1c2a3b4-5678-90ab-cdef-1234567890ab',
    description: 'UUID of the specific transcription revision to link as ground-truth (defaults to current transcription)',
  })
  @IsUUID()
  @IsOptional()
  transcriptionId?: string;

  @ApiPropertyOptional({
    enum: DatasetSplit,
    default: DatasetSplit.UNASSIGNED,
    description: 'Dataset split partition',
  })
  @IsEnum(DatasetSplit)
  @IsOptional()
  split?: DatasetSplit = DatasetSplit.UNASSIGNED;

  @ApiPropertyOptional({
    example: 'نمونه برگزیده خط نستعلیق ممتاز برای ارزیابی خطوط فشرده',
    description: 'Scholarly dataset annotation notes',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateDatasetSampleDto {
  @ApiPropertyOptional({ enum: DatasetSampleStatus })
  @IsEnum(DatasetSampleStatus)
  @IsOptional()
  status?: DatasetSampleStatus;

  @ApiPropertyOptional({ enum: DatasetSplit })
  @IsEnum(DatasetSplit)
  @IsOptional()
  split?: DatasetSplit;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}

export class QueryDatasetSampleDto {
  @ApiPropertyOptional({ enum: DatasetSampleStatus })
  @IsEnum(DatasetSampleStatus)
  @IsOptional()
  status?: DatasetSampleStatus;

  @ApiPropertyOptional({ enum: DatasetSplit })
  @IsEnum(DatasetSplit)
  @IsOptional()
  split?: DatasetSplit;

  @ApiPropertyOptional({ description: 'Filter by manuscript UUID' })
  @IsUUID()
  @IsOptional()
  manuscriptId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit: number = 20;
}
