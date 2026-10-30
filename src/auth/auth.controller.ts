import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register researcher account',
    description: 'Registers a new researcher user with standard privileges. Admin roles cannot be acquired via public registration.',
  })
  @SwaggerResponse({ status: 201, description: 'User successfully registered' })
  @SwaggerResponse({ status: 409, description: 'Email address already in use' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and issue JWT tokens',
    description: 'Validates user credentials and issues an access token and revocable refresh token.',
  })
  @SwaggerResponse({ status: 200, description: 'Login successful' })
  @SwaggerResponse({ status: 401, description: 'Invalid credentials or inactive account' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token and issue new access token',
    description: 'Exchanges a valid refresh token for a new access token and rotated refresh token.',
  })
  @SwaggerResponse({ status: 200, description: 'Token refreshed successfully' })
  @SwaggerResponse({ status: 401, description: 'Invalid, expired, or revoked refresh token' })
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke active refresh tokens',
    description: 'Revokes user refresh token sessions on the server.',
  })
  @SwaggerResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() body?: { refreshToken?: string },
  ) {
    return this.authService.logout(userId, body?.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT')
  @Get('me')
  @ApiOperation({
    summary: 'Get current authenticated user profile',
    description: 'Retrieves metadata for the authenticated user, excluding password hash.',
  })
  @SwaggerResponse({ status: 200, description: 'User profile retrieved' })
  @SwaggerResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId);
  }
}
