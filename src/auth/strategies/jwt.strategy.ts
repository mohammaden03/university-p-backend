import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/api-response.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService?.get<string>('jwt.secret') ||
        process.env.JWT_SECRET ||
        'super-secret-jwt-signing-key-for-persian-arabic-htr-platform-min-32-chars',
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Verify user exists and is active in database if connection is up
    if (this.prisma.isConnected) {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User account no longer exists');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account has been deactivated');
      }

      return user;
    }

    // Standalone fallback if DB is temporarily disconnected
    return {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName,
      role: payload.role,
      isActive: true,
    };
  }
}
