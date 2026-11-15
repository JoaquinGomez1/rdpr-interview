import { Inject, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { ProductRepository } from './product.repository.js';
import { uuidPattern, validateReport } from './study.js';

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

  loadStudy(browserId: string) {
    const draftId = createHash('sha256')
      .update(`draft:${browserId}`)
      .digest('hex');
    return { draftId, images: this.studyImages() };
  }

  async loadReport(id: string) {
    if (!uuidPattern.test(id)) return null;
    const report = await this.repository.load(id);
    return report && { ...report, images: this.studyImages() };
  }

  async saveReport(body: unknown) {
    const report = validateReport(body, this.repository.studyImages());
    const id = randomUUID();
    await this.repository.save(id, report);
    return { ...report, id };
  }
}
