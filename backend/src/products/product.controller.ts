import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  NotFoundException,
  Param,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateReportDto } from './create-report.dto.js';
import { ProductService } from './product.service.js';
import { ReportValidationError } from './study.js';

@Controller('study')
export class ProductController {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  load() {
    return this.products.loadStudy();
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
  async save(@Body() body: CreateReportDto) {
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
