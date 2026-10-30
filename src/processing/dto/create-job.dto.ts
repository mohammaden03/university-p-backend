import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';
import { Language } from '@prisma/client';

export class RecognizePageDto {
  @ApiPropertyOptional({
    enum: Language,
    description: 'Language of the manuscript page (defaults to manuscript language)',
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({
    example: 'qajar-nastaliq-v2',
    description: 'Specific deep-learning model name to use for recognition',
  })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiPropertyOptional({
    example: 'req_8f1e-3a9b-4c2d',
    description: 'Unique client-supplied idempotency key to prevent duplicate recognition runs',
  })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional({
    example: {
      binarizationMethod: 'sauvola',
      deskew: true,
      lineSegmentationMethod: 'craft',
      beamWidth: 5,
    },
    description: 'Preprocessing, segmentation, and recognition hyperparameters',
  })
  @IsObject()
  @IsOptional()
  processingOptions?: Record<string, any>;
}
