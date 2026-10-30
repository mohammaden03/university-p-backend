import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class AssignManuscriptSplitsDto {
  @ApiPropertyOptional({
    default: 0.7,
    minimum: 0.1,
    maximum: 0.9,
    description: 'Proportion of manuscripts allocated to the TRAIN split',
  })
  @IsNumber()
  @Min(0.1)
  @Max(0.9)
  @IsOptional()
  trainRatio: number = 0.7;

  @ApiPropertyOptional({
    default: 0.15,
    minimum: 0.05,
    maximum: 0.5,
    description: 'Proportion of manuscripts allocated to the VALIDATION split',
  })
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  @IsOptional()
  valRatio: number = 0.15;

  @ApiPropertyOptional({
    default: 0.15,
    minimum: 0.05,
    maximum: 0.5,
    description: 'Proportion of manuscripts allocated to the TEST split',
  })
  @IsNumber()
  @Min(0.05)
  @Max(0.5)
  @IsOptional()
  testRatio: number = 0.15;

  @ApiPropertyOptional({
    default: false,
    description: 'Require explicit override to permit pages from the same manuscript into different splits',
  })
  @IsBoolean()
  @IsOptional()
  allowCrossManuscriptLeakage?: boolean = false;
}
