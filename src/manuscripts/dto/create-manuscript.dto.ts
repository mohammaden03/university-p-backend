import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Language } from '@prisma/client';

export class CreateManuscriptDto {
  @ApiProperty({
    example: 'دیوان حافظ شیرازی (نسخه خطی قاجاری)',
    description: 'Title of the manuscript book',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @ApiPropertyOptional({
    example: 'خواجه شمس‌الدین محمد حافظ شیرازی',
    description: 'Author or scribe of the manuscript',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  author?: string;

  @ApiPropertyOptional({
    enum: Language,
    default: Language.PERSIAN,
    description: 'Language of the manuscript text',
  })
  @IsEnum(Language)
  @IsOptional()
  language?: Language = Language.PERSIAN;

  @ApiPropertyOptional({
    example: 'نسخه نفیس خط نستعلیق ممتاز با سرلوح مذهب و تذهیب دوره قاجار',
    description: 'Detailed bibliographic description of the manuscript',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'کتابخانه و موزه ملی ملک',
    description: 'Holding repository or library name',
  })
  @IsString()
  @IsOptional()
  repositoryName?: string;

  @ApiPropertyOptional({
    example: 'MS-MAL-4821',
    description: 'Catalog or shelfmark identifier',
  })
  @IsString()
  @IsOptional()
  catalogIdentifier?: string;

  @ApiPropertyOptional({
    example: 'اوایل قرن سیزدهم هجری قمری (دوره قاجار)',
    description: 'Historical period or dating of the manuscript',
  })
  @IsString()
  @IsOptional()
  historicalPeriod?: string;

  @ApiPropertyOptional({
    example: 'نستعلیق',
    description: 'Calligraphic script style (e.g. Nasta\'liq, Naskh, Thuluth, Shikasteh, Kufic)',
  })
  @IsString()
  @IsOptional()
  scriptType?: string;

  @ApiPropertyOptional({
    example: 'فهرست نسخه‌های خطی کتابخانه ملک، جلد ۴، صفحه ۱۲۸',
    description: 'Bibliographic source reference or citation',
  })
  @IsString()
  @IsOptional()
  sourceReference?: string;
}
