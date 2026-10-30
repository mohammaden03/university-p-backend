import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@manuscript-htr.edu',
    description: 'Registered account email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'AdminSecurePassword123!',
    description: 'User account password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    example: 'c9f80a31-b3b4-4b53-8d07-2a4b3d8f1e67.token_signature_string',
    description: 'Refresh token provided during login or previous token rotation',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
