import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { Database } from '../database.js';
import type { Report, StudyImage } from './study.js';
import { seedStudyImages } from './study.seed.js';

@Injectable()
export class ProductRepository implements OnModuleInit {
  private images: StudyImage[] = [];

  constructor(@Inject(Database) private readonly db: Database) {}

  async onModuleInit() {
    await this.db.query(`
      SELECT pg_advisory_xact_lock(718135291);
      CREATE TABLE IF NOT EXISTS study_images (
        view integer PRIMARY KEY,
        name text NOT NULL,
        src text NOT NULL,
        checksum text NOT NULL
      );
      CREATE TABLE IF NOT EXISTS reports (
        id uuid PRIMARY KEY,
        report text NOT NULL
      );
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema = current_schema() AND table_name = 'reports' AND column_name = 'browser_id') THEN
          ALTER TABLE reports RENAME COLUMN browser_id TO id;
          ALTER TABLE report_key_images RENAME COLUMN browser_id TO report_id;
        END IF;
      END $$;
      ALTER TABLE reports ADD COLUMN IF NOT EXISTS owner_client_id uuid;
      CREATE TABLE IF NOT EXISTS report_key_images (
        report_id uuid NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
        id uuid NOT NULL,
        view integer NOT NULL REFERENCES study_images(view),
        caption varchar(160) NOT NULL,
        position integer NOT NULL CHECK (position BETWEEN 1 AND 15),
        PRIMARY KEY (report_id, position),
        UNIQUE (report_id, id)
      );
    `);
    this.images = await seedStudyImages(this.db);
  }

  studyImages() {
    return this.images;
  }

  async load(reportId: string, clientId: string) {
    const { rows } = await this.db.query<Report & { canEdit: boolean }>(
      `
      SELECT jsonb_build_object('message', report) AS report, COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'view', view, 'caption', caption) ORDER BY position)
        FROM report_key_images WHERE report_id = $1
      ), '[]'::jsonb) AS keys,
      COALESCE(owner_client_id = $2, false) AS "canEdit"
      FROM reports WHERE id = $1
    `,
      [reportId, clientId],
    );
    return rows[0] ?? null;
  }

  async isOwner(reportId: string, clientId: string) {
    const { rowCount } = await this.db.query(
      'SELECT 1 FROM reports WHERE id = $1 AND owner_client_id = $2',
      [reportId, clientId],
    );
    return rowCount === 1;
  }

  async save(reportId: string, report: Report, clientId: string) {
    await this.writeTransaction(async (client) => {
      await client.query(
        'INSERT INTO reports (id, report, owner_client_id) VALUES ($1, $2, $3)',
        [reportId, report.report.message, clientId],
      );
      await this.insertKeys(client, reportId, report.keys);
    });
  }

  async update(reportId: string, report: Report, clientId: string) {
    return this.writeTransaction(async (client) => {
      const { rowCount } = await client.query(
        'UPDATE reports SET report = $2 WHERE id = $1 AND owner_client_id = $3',
        [reportId, report.report.message, clientId],
      );
      if (rowCount !== 1) return false;
      await client.query('DELETE FROM report_key_images WHERE report_id = $1', [
        reportId,
      ]);
      await this.insertKeys(client, reportId, report.keys);
      return true;
    });
  }

  private async writeTransaction<T>(write: (client: PoolClient) => Promise<T>) {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      const result = await write(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  private async insertKeys(
    client: PoolClient,
    reportId: string,
    keys: Report['keys'],
  ) {
    await client.query(
      `
        INSERT INTO report_key_images (report_id, id, view, caption, position)
        SELECT $1, id, view, caption, position
        FROM jsonb_to_recordset($2::jsonb) AS key_image(id uuid, view integer, caption text, position integer)
      `,
      [
        reportId,
        JSON.stringify(
          keys.map((key, index) => ({ ...key, position: index + 1 })),
        ),
      ],
    );
  }
}
