import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Report API', () => {
  let app: INestApplication<App>;
  const path = '/api/study/report';

  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL)
      throw new Error('Set TEST_DATABASE_URL to a test PostgreSQL database.');
    vi.stubEnv('DATABASE_URL', process.env.TEST_DATABASE_URL);
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
  });

  it('loads the study and restores the same draft ID for a returning browser', async () => {
    const browser = request.agent(app.getHttpServer());
    const { body, headers } = await browser.get('/api/study').expect(200);
    expect(body.images).toHaveLength(5);
    expect(headers['set-cookie'][0]).toContain('HttpOnly');
    await browser.get('/api/study').expect(200, body);
  });

  it('saves ordered key images and lets another browser open the read-only report', async () => {
    const browser = request.agent(app.getHttpServer());
    const first = { id: randomUUID(), view: 3, caption: 'Axial finding' };
    const second = { id: randomUUID(), view: 0, caption: 'Frontal finding' };
    const duplicate = { ...first, id: randomUUID() };
    const report = 'Study findings';
    const { body: saved } = await browser
      .post(path)
      .send({ report, keys: [first, duplicate, second] })
      .expect(201);
    expect(saved.keys).toEqual([first, second]);
    const { body: loaded } = await request(app.getHttpServer())
      .get(`${path}/${saved.id}`)
      .expect(200);
    expect(loaded.report).toBe(report);
    expect(loaded.keys).toEqual([first, second]);
    expect(loaded.images).toHaveLength(5);
    const { body: next } = await browser
      .post(path)
      .send({ report, keys: [] })
      .expect(201);
    expect(next.id).not.toBe(saved.id);
    await browser
      .put(`${path}/${saved.id}`)
      .send({ report: 'Edited', keys: [] })
      .expect(404);
    await browser.get(`${path}/${saved.id}`).expect(200, loaded);
  });

  it('returns clear errors for unknown reports, unknown images and invalid captions', async () => {
    const api = request(app.getHttpServer());
    await api.get(`${path}/invalid`).expect(404);
    await api.get(`${path}/${randomUUID()}`).expect(404);
    const key = { id: randomUUID(), view: 0, caption: '' };
    const unknown = await api
      .post(path)
      .send({ report: '', keys: [{ ...key, view: 99 }] })
      .expect(422);
    expect(unknown.body.message).toContain('outside this study');
    const invalid = await api
      .post(path)
      .send({ report: '', keys: [{ ...key, caption: 'a'.repeat(161) }] })
      .expect(422);
    expect(invalid.body.message).toContain('Caption 1');
  });
});
