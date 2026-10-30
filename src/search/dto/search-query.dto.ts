import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { Language, TranscriptionSource } from '@prisma/client';

export class SearchQueryDto {
  @ApiProperty({
    example: 'غم آزاده',
    description: 'Search query in Persian or Arabic. Supports letter variants, diacritic-agnostic matching, and numbers.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Search query "q" must not be empty' })
  q!: string;

  @ApiPropertyOptional({
    enum: Language,
    description: 'Filter by manuscript language',
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language;

  @ApiPropertyOptional({
    description: 'Filter by manuscript author or scribe',
  })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter by manuscript title',
  })
  @IsString()
  @IsOptional()
  manuscriptTitle?: string;

  @ApiPropertyOptional({
    description: 'Filter by calligraphic script (e.g. نستعلیق, نسخ)',
  })
  @IsString()
  @IsOptional()
  scriptType?: string;

  @ApiPropertyOptional({
    description: 'Filter by historical period',
  })
  @IsString()
  @IsOptional()
  historicalPeriod?: string;

  @ApiPropertyOptional({
    description: 'Filter by library or holding repository',
  })
  @IsString()
  @IsOptional()
  repositoryName?: string;

  @ApiPropertyOptional({
    enum: TranscriptionSource,
    description: 'Filter by transcription source (AI or HUMAN)',
  })
  @IsEnum(TranscriptionSource)
  @IsOptional()
  source?: TranscriptionSource;

  @ApiPropertyOptional({
    default: true,
    description: 'Whether to include unreviewed AI transcriptions in search results',
  })
  @Transform(({ value }) => value === 'true' || value === true || value === 1 || value === '1')
  @IsOptional()
  includeUnreviewedAi?: boolean = true;

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
