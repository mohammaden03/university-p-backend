import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, Reflector } from '@nestjs/core';
import configuration from './config/configuration';

import { PrismaModule } from './prisma/prisma.module';
import { FilesModule } from './files/files.module';
import { AiClientModule } from './ai-client/ai-client.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ManuscriptsModule } from './manuscripts/manuscripts.module';
import { PagesModule } from './pages/pages.module';
import { ProcessingModule } from './processing/processing.module';
import { TranscriptionsModule } from './transcriptions/transcriptions.module';
import { SearchModule } from './search/search.module';
import { DatasetsModule } from './datasets/datasets.module';
import { HealthModule } from './health/health.module';

import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('throttle.ttl', 60) * 1000,
          limit: config.get<number>('throttle.limit', 100),
        },
      ],
    }),
    PrismaModule,
    FilesModule,
    AiClientModule,
    AuthModule,
    UsersModule,
    ManuscriptsModule,
    PagesModule,
    ProcessingModule,
    TranscriptionsModule,
    SearchModule,
    DatasetsModule,
    HealthModule,
  ],
  providers: [
    Reflector,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
