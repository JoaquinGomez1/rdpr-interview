import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';
import { requestIdMiddleware } from './http/request-id.middleware.js';
import { uuidPattern } from './products/study.js';
import { publicDir } from './public-dir.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  app.use(requestIdMiddleware);

  if (process.env.FRONTEND_DIR) {
    app.useStaticAssets(publicDir);
    app.use((request: Request, response: Response, next: NextFunction) => {
      if (
        request.method === 'GET' &&
        uuidPattern.test(request.path.slice(1).replace(/\/$/, ''))
      ) {
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
