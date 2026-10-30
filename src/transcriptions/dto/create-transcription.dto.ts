import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTranscriptionDto {
  @ApiProperty({
    example: 'بشنو این نکته که خود را ز غم آزاده کنی\nخون خوری گر طلب روزی ننهاده کنی',
    description: 'Transcription text in original manuscript orthography',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({
    example: 'تایپ مستقیم پژوهشگر بر اساس بررسی خط نستعلیق سرلوح',
    description: 'Notes on orthography, ligatures, or reading difficulty',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateTranscriptionDto {
  @ApiProperty({
    example: 'بشنو این نکته که خود را ز غم آزاده کنی\nخون خوری گر طلب روزی ننهاده کنی',
    description: 'Corrected text. Creates a new immutable revision under researcher attribution.',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiPropertyOptional({
    example: 'اصلاح غلط املایی در بیت دوم مصراع دوم',
    description: 'Reason or scholarly commentary for this human edit revision',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
