import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ProductService } from './product.service.js';
import { readClientId } from './report-client.js';

@Injectable()
export class ReportOwnerGuard implements CanActivate {
  constructor(
    @Inject(ProductService) private readonly products: ProductService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const id = request.params.id;
    if (
      typeof id !== 'string' ||
      !(await this.products.canEdit(id, readClientId(request)))
    ) {
      throw new ForbiddenException(
        'Only the browser that created this report can edit it.',
      );
    }
    return true;
  }
}
