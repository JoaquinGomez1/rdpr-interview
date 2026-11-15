import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Database } from '../src/database.js';
import { requestIdMiddleware } from '../src/http/request-id.middleware.js';

describe('POST /api/study/report', () => {
  let app: INestApplication;
  const database = { query: vi.fn(), connect: vi.fn() };
  const report = { message: 'Example study finding' };
  const image = { id: randomUUID(), view: 0 };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Database)
      .useValue(database)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.use(requestIdMiddleware);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it.each([
    {
      name: 'missing report text',
      payload: { keys: [{ ...image, caption: 'Finding' }] },
      message: /Report text must be 10 to 16,000 characters/,
    },
    {
      name: 'no key images',
      payload: { report, keys: [] },
      message: /Add at least one key image/,
    },
    {
      name: 'a key image without a caption',
      payload: { report, keys: [image] },
      message: /Caption 1 is required/,
    },
  ])('rejects $name', async ({ payload, message }) => {
    const response = await request(app.getHttpServer())
      .post('/api/study/report')
      .send(payload)
      .expect(422);

    expect(response.body.message).toMatch(message);
    expect(database.connect).not.toHaveBeenCalled();
  });
});
