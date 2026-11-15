import { Catch, HttpException, Inject } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Request } from 'express';
import { HttpErrorLogger } from './http-error-logger.js';

@Catch()
export class HttpErrorFilter extends BaseExceptionFilter {
  constructor(
    @Inject(HttpErrorLogger) private readonly logger: HttpErrorLogger,
  ) {
    super();
  }

  override async catch(error: unknown, host: ArgumentsHost) {
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : this.isHttpError(error)
          ? error.statusCode
          : 500;

    await this.logger.record(
      host.switchToHttp().getRequest<Request>(),
      error,
      status,
    );

    super.catch(error, host);
  }
}
