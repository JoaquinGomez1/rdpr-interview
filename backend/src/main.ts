import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'node:path';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  if (process.env.FRONTEND_DIR) {
    app.useStaticAssets(resolve(process.env.FRONTEND_DIR));
  }
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
await bootstrap();
