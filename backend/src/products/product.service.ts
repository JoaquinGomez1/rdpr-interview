import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ProductRepository } from './product.repository.js';
import { prepareReport, uuidPattern } from './study.js';
import type {
  CreatedReportResponse,
  Report,
  SavedReportResponse,
  StudyResponse,
} from './study.js';

@Injectable()
export class ProductService {
  constructor(
    @Inject(ProductRepository) private readonly repository: ProductRepository,
  ) {}

  private studyImages() {
    return this.repository
      .studyImages()
      .map(({ view, name, src }) => ({ view, name, src }));
  }

  loadStudy(): StudyResponse {
    return { images: this.studyImages() };
  }

  async loadReport(
    id: string,
    clientId: string,
  ): Promise<SavedReportResponse | null> {
    if (!uuidPattern.test(id)) return null;
    const report = await this.repository.load(id, clientId);
    return report && { ...report, images: this.studyImages() };
  }

  async saveReport(
    body: Report,
    clientId: string,
  ): Promise<CreatedReportResponse> {
    const report = prepareReport(body, this.repository.studyImages());
    const id = randomUUID();
    await this.repository.save(id, report, clientId);
    return { ...report, id };
  }

  async canEdit(id: string, clientId?: string) {
    if (!clientId || !uuidPattern.test(id)) return false;
    return this.repository.isOwner(id, clientId);
  }

  async updateReport(
    id: string,
    body: Report,
    clientId?: string,
  ): Promise<CreatedReportResponse> {
    const report = prepareReport(body, this.repository.studyImages());
    if (!clientId || !(await this.repository.update(id, report, clientId))) {
      throw new ForbiddenException(
        'Only the browser that created this report can edit it.',
      );
    }
    return { ...report, id };
  }
}
