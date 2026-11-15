import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const logger = new Logger('HTTP');

export function requestIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const id = randomUUID();
  request.headers[REQUEST_ID_HEADER] = id;
  response.setHeader(REQUEST_ID_HEADER, id);
  const path = request.path;
  if (path === '/api' || path.startsWith('/api/')) {
    response.once('finish', () => {
      logger.log(`${id} ${request.method} ${path} ${response.statusCode}`);
    });
  }
  next();
}
