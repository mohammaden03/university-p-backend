import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'researcher@manuscript-htr.edu',
    description: 'Valid institutional or researcher email address',
  })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'Farhad Mirza Qajar',
    description: 'Full name of the researcher or archivist',
  })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({
    example: 'SecureResearcherPassword123!',
    description: 'Password with minimum 8 characters',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password!: string;
}
