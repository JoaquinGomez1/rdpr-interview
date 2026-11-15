import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { HttpErrorRepository } from './http-error.repository.js';
import { requestIdHeader } from './request-id.middleware.js';

@Injectable()
export class HttpErrorLogger {
  private readonly logger = new Logger(HttpErrorLogger.name);
  private readonly recorded = new WeakSet<Request>();

  constructor(
    @Inject(HttpErrorRepository)
    private readonly repository: HttpErrorRepository,
  ) {}

  async record(request: Request, error: unknown, statusCode: number) {
    const requestId = request.headers[requestIdHeader];
    if (typeof requestId !== 'string' || this.recorded.has(request)) return;
    this.recorded.add(request);

    const response =
      error instanceof HttpException ? error.getResponse() : undefined;
    const message =
      typeof response === 'string'
        ? response
        : error instanceof Error
          ? error.message
          : 'Unknown HTTP error';
    const log = {
      requestId,
      path: request.originalUrl.split('?')[0],
      method: request.method,
      statusCode,
      message,
      occurredAt: new Date(),
    };

    try {
      await this.repository.insert(log);
    } catch (loggingError) {
      this.logger.error({ ...log, loggingError });
    }
  }
}
