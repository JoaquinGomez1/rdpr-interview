import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { Database } from '../src/database.js';
import { requestIdMiddleware } from '../src/http/request-id.middleware.js';

describe('Report API', () => {
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

  beforeEach(() => {
    vi.resetAllMocks();
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

  it('lets the creating browser edit and writes the new key image positions', async () => {
    const server = app.getHttpServer();
    const browser = request.agent(server);
    const secondImage = {
      id: randomUUID(),
      view: 1,
      caption: 'Second finding',
    };
    const keys = [{ ...image, caption: 'First finding' }, secondImage];
    const query = vi.fn().mockResolvedValue({ rowCount: 1 });
    database.connect.mockResolvedValue({ query, release: vi.fn() });

    const study = await browser.get('/api/study').expect(200);
    const cookie = study.headers['set-cookie'][0];
    const owner = /^radpair-client-id=([\da-f-]+);/.exec(cookie)?.[1];
    expect(owner).toHaveLength(36);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');

    const created = await browser
      .post('/api/study/report')
      .send({ report, keys })
      .expect(201);
    const id: string = created.body.id;
    const path = `/api/study/report/${id}`;
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO reports'),
      [id, report.message, owner],
    );
    expect(created.headers['set-cookie']).toBeUndefined();

    const reordered = [keys[1], keys[0]];
    await request(server)
      .put(path)
      .send({ report, keys: reordered })
      .expect(403);
    database.query.mockResolvedValueOnce({ rowCount: 0 });
    await request(server)
      .put(path)
      .set('Cookie', `radpair-client-id=${randomUUID()}`)
      .send({ report, keys: reordered })
      .expect(403);
    expect(database.connect).toHaveBeenCalledTimes(1);

    query.mockClear();
    database.query.mockResolvedValueOnce({ rowCount: 1 });
    const edited = await browser
      .put(path)
      .send({ report, keys: reordered })
      .expect(200);
    expect(edited.body).toEqual({ id, report, keys: reordered });
    expect(query.mock.calls).toEqual([
      ['BEGIN'],
      [expect.stringContaining('UPDATE reports'), [id, report.message, owner]],
      [expect.stringContaining('DELETE FROM report_key_images'), [id]],
      [
        expect.stringContaining('INSERT INTO report_key_images'),
        [
          id,
          JSON.stringify([
            { ...reordered[0], position: 1 },
            { ...reordered[1], position: 2 },
          ]),
        ],
      ],
      ['COMMIT'],
    ]);
  });
});
