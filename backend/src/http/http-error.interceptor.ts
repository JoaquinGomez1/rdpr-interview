import { HttpException, Inject, Injectable } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { catchError } from 'rxjs';
import { HttpErrorLogger } from './http-error-logger.js';

@Injectable()
export class HttpErrorInterceptor implements NestInterceptor {
  constructor(
    @Inject(HttpErrorLogger) private readonly logger: HttpErrorLogger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    if (context.getType() !== 'http') return next.handle();
    const request = context.switchToHttp().getRequest<Request>();
    return next.handle().pipe(
      catchError(async (error: unknown) => {
        const status = error instanceof HttpException ? error.getStatus() : 500;
        await this.logger.record(request, error, status);
        throw error;
      }),
    );
  }
}
