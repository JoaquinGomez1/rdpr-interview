import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
  Res,
  UseGuards,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CreateReportDto } from './create-report.dto.js';
import { ProductService } from './product.service.js';
import { identifyClient, readClientId } from './report-client.js';
import { ReportOwnerGuard } from './report-owner.guard.js';
import { ReportValidationError, type CreatedReportResponse } from './study.js';

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
    identifyClient(request, response);
    return this.products.loadStudy();
  }

  @Get('report/:id')
  @Header('Cache-Control', 'no-store')
  async report(
    @Param('id') id: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const report = await this.products.loadReport(
      id,
      identifyClient(request, response),
    );
    if (!report) throw new NotFoundException('Report not found.');
    return report;
  }

  @Post('report')
  @Header('Cache-Control', 'no-store')
  save(
    @Body() body: CreateReportDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.write(() =>
      this.products.saveReport(body, identifyClient(request, response)),
    );
  }

  @Put('report/:id')
  @UseGuards(ReportOwnerGuard)
  @Header('Cache-Control', 'no-store')
  update(
    @Param('id') id: string,
    @Body() body: CreateReportDto,
    @Req() request: Request,
  ) {
    return this.write(() =>
      this.products.updateReport(id, body, readClientId(request)),
    );
  }

  private async write(action: () => Promise<CreatedReportResponse>) {
    try {
      return await action();
    } catch (error) {
      if (error instanceof ReportValidationError) {
        throw new UnprocessableEntityException(error.message);
      }
      throw error;
    }
  }
}
