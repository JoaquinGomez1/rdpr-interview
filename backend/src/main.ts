import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { publicDir, uuidPattern } from './study.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  const logger = new Logger('HTTP');
  app.use('/api', (request: Request, response: Response, next: NextFunction) => {
    const id = randomUUID();
    response.setHeader('X-Request-Id', id);
    response.on('finish', () => {
      logger.log(`${id} ${request.method} ${request.path} ${response.statusCode}`);
    });
    next();
  });
  if (process.env.FRONTEND_DIR) {
    app.useStaticAssets(publicDir);
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (request.method === 'GET' && uuidPattern.test(request.path.slice(1).replace(/\/$/, ''))) {
        response.sendFile(resolve(publicDir, 'index.html'));
        return;
      }
      next();
    });
  } else {
    app.useStaticAssets(resolve(publicDir, 'study'), { prefix: '/study' });
  }
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();
