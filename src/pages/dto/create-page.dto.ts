import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePageDto {
  @ApiProperty({
    example: 1,
    description: 'Positive page sequence number within the manuscript book',
  })
  @Type(() => Number)
  @IsInt({ message: 'Page number must be an integer' })
  @Min(1, { message: 'Page number must be a positive integer greater than or equal to 1' })
  @IsNotEmpty()
  pageNumber!: number;

  @ApiPropertyOptional({
    description: 'Optional pixel width override if known',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({
    description: 'Optional pixel height override if known',
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  height?: number;
}

export class UpdatePageDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'Update page sequence number',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pageNumber?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  height?: number;
}
