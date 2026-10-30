import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((response) => {
        // If response is null or undefined
        if (response === null || response === undefined) {
          return { data: null as any };
        }

        // If response is already an envelope with { data, meta }
        if (
          typeof response === 'object' &&
          'data' in response &&
          ('meta' in response || Object.keys(response).length === 1)
        ) {
          return response;
        }

        // If response is a StreamableFile or Buffer or raw string for file downloads
        const httpCtx = context.switchToHttp();
        const res = httpCtx.getResponse();
        if (res.getHeader('content-type')?.toString().includes('image/')) {
          return response;
        }

        return {
          data: response,
        };
      }),
    );
  }
}
