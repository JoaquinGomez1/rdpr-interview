import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ProductService } from './product.service.js';
import { ReportValidationError, uuidPattern } from './study.js';

const cookieName = 'radpair-browser';

function browserId(request: Request, response: Response) {
  const existing = request.headers.cookie
    ?.split(/;\s*/)
    .find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (existing && uuidPattern.test(existing)) return existing.toLowerCase();

  const id = randomUUID();
  response.cookie(cookieName, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      process.env.SECURE_COOKIES !== 'false' &&
      process.env.NODE_ENV === 'production',
    path: '/api/study',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });
  return id;
}

@Controller('study')
export class ProductController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  load(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const id = browserId(request, response);
    return this.products.loadStudy(id);
  }

  @Get('report/:id')
  @Header('Cache-Control', 'no-store')
  async report(@Param('id') id: string) {
    const report = await this.products.loadReport(id);
    if (!report) throw new NotFoundException('Report not found.');
    return report;
  }

  @Post('report')
  @Header('Cache-Control', 'no-store')
  async save(@Body() body: unknown) {
    try {
      return await this.products.saveReport(body);
    } catch (error) {
      if (error instanceof ReportValidationError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
