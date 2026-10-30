import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import { JwtPayload } from '../common/interfaces/api-response.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwtService: JwtService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  public async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    // Enforce default RESEARCHER role for public registration
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        fullName: dto.fullName.trim(),
        passwordHash,
        role: Role.RESEARCHER,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  public async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update lastLoginAt
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sanitizedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
    };

    const tokens = await this.generateTokens(sanitizedUser);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      user: sanitizedUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  public async refreshTokens(rawRefreshToken: string) {
    const tokenHash = this.hashToken(rawRefreshToken);

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (tokenRecord.revokedAt) {
      // Possible token reuse detected: revoke all user tokens for security
      this.logger.warn(`Revoked refresh token reuse attempted for user ${tokenRecord.userId}`);
      await this.prisma.refreshToken.updateMany({
        where: { userId: tokenRecord.userId },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token was already revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    // Revoke current token (rotation)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const sanitizedUser = {
      id: tokenRecord.user.id,
      email: tokenRecord.user.email,
      fullName: tokenRecord.user.fullName,
      role: tokenRecord.user.role,
      isActive: tokenRecord.user.isActive,
    };

    // Issue new pair
    const newTokens = await this.generateTokens(sanitizedUser);
    await this.storeRefreshToken(tokenRecord.user.id, newTokens.refreshToken);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
    };
  }

  public async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, userId },
        data: { revokedAt: new Date() },
      });
    } else {
      // Revoke all active tokens for this user
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  public async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    fullName: string;
    role: Role;
  }) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessExpires = this.configService.get<string>(
      'jwt.accessExpiresIn',
      '15m',
    );
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessExpires as any,
    });

    // Cryptographically secure refresh token
    const refreshToken = crypto.randomUUID() + '.' + crypto.randomBytes(32).toString('hex');

    return {
      accessToken,
      refreshToken,
    };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }
}
