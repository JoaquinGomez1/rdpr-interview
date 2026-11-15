import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Database } from './database.js';
import { HttpErrorLogger } from './http/http-error-logger.js';
import { HttpErrorFilter } from './http/http-error.filter.js';
import { HttpErrorInterceptor } from './http/http-error.interceptor.js';
import { HttpErrorRepository } from './http/http-error.repository.js';
import { requestValidationOptions } from './http/request-validation.js';
import { ProductController } from './products/product.controller.js';
import { ProductRepository } from './products/product.repository.js';
import { ProductService } from './products/product.service.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [ProductController],
  providers: [
    Database,
    ProductRepository,
    ProductService,
    HttpErrorRepository,
    HttpErrorLogger,
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe(requestValidationOptions),
    },
    { provide: APP_INTERCEPTOR, useClass: HttpErrorInterceptor },
    { provide: APP_FILTER, useClass: HttpErrorFilter },
  ],
})
export class AppModule {}
