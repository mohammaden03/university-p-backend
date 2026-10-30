import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: any = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const errorObj = res as Record<string, any>;
        message = errorObj.message || errorObj.error || exception.message;
        code = errorObj.error ? String(errorObj.error).toUpperCase().replace(/\s+/g, '_') : this.getErrorCodeFromStatus(status);
        details = errorObj.details || (Array.isArray(errorObj.message) ? errorObj.message : undefined);
        if (Array.isArray(errorObj.message)) {
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (typeof exception === 'object' && exception !== null && 'code' in exception) {
      // Prisma or DB error handling
      const prismaError = exception as { code: string; meta?: any; message?: string };
      if (prismaError.code === 'P2002') {
        status = HttpStatus.CONFLICT;
        code = 'DUPLICATE_RESOURCE';
        const target = prismaError.meta?.target || 'field';
        message = `A unique constraint failed on ${Array.isArray(target) ? target.join(', ') : target}`;
        details = prismaError.meta;
      } else if (prismaError.code === 'P2025') {
        status = HttpStatus.NOT_FOUND;
        code = 'RESOURCE_NOT_FOUND';
        message = 'Requested record not found';
      } else if (prismaError.code === 'P2003') {
        status = HttpStatus.BAD_REQUEST;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Foreign key constraint failed on associated entity';
      } else {
        this.logger.error(`Database error [${prismaError.code}]: ${prismaError.message}`);
        message = 'Database operation failed';
        code = 'DATABASE_ERROR';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
      message = exception.message;
    }

    const errorPayload: ApiErrorResponse = {
      statusCode: status,
      code,
      message,
      ...(details !== undefined && { details }),
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
    };

    response.status(status).json(errorPayload);
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'TOO_MANY_REQUESTS';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SERVICE_UNAVAILABLE';
      default:
        return 'INTERNAL_SERVER_ERROR';
    }
  }
}
