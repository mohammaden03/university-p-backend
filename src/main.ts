import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

export async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const corsOrigins = configService.get<string>('cors.origins', '*');

  // CORS configuration
  app.enableCors({
    origin: corsOrigins === '*' ? true : corsOrigins.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Global API Prefix under /api/v1 (exempting health check)
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/(.*)'],
  });

  // Global pipes, filters, and interceptors
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger OpenAPI Documentation Setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Persian & Arabic Manuscript HTR/OCR Platform API')
    .setDescription(
      'REST API backend for "Design and Development of an Intelligent HTR/OCR System for Recognition, Reading, and Advanced Search in Persian and Arabic Manuscripts with Islamic Calligraphy".\n\n' +
        'Includes manuscript bibliographic cataloging, high-resolution page storage, Python FastAPI HTR service integration, ' +
        'immutable transcription revision tracking, Persian/Arabic full-text search with Unicode normalization, and machine learning dataset curation.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Input your JWT access token obtained from /api/v1/auth/login or /api/v1/auth/register',
      },
      'JWT',
    )
    .addTag('Authentication', 'User registration, login, token rotation, and current session')
    .addTag('Manuscripts', 'Bibliographic metadata, calligraphy styles, and archival preservation')
    .addTag('Manuscript Pages', 'Page image uploads, MIME signature verification, and secure streaming')
    .addTag('HTR & OCR Processing', 'AI inference orchestration, jobs state machine, and status queries')
    .addTag('Transcriptions & Revision History', 'Human correction history, AI preservation, and current revision switching')
    .addTag('Advanced Search', 'Persian/Arabic normalized lexical search, diacritic-agnostic queries, and snippet extraction')
    .addTag('Dataset Management & ML Export', 'Ground-truth annotations, leak-free manuscript partitioning, and JSONL export')
    .addTag('System Health', 'Readiness checks for database, local storage, and Python AI service')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Persian & Arabic Manuscript HTR API Docs',
  });

  await app.listen(port);
  logger.log(`==================================================================`);
  logger.log(`🚀 Persian & Arabic Manuscript HTR/OCR Backend is running!`);
  logger.log(`📡 Base API URL:      http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Docs:      http://localhost:${port}/api/docs`);
  logger.log(`🩺 Health Check:      http://localhost:${port}/health`);
  logger.log(`==================================================================`);

  return app;
}

// Auto-run if executed directly
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal bootstrap error:', err);
  });
}
