import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { readStudyImages, validateReport } from './study.js';
import type { Report, StudyImage } from './study.js';

@Injectable()
export class AppService implements OnModuleInit, OnModuleDestroy {
  private readonly db = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5_000,
  });
  private images: StudyImage[] = [];

  async onModuleInit() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
    this.images = await readStudyImages();
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
    await this.db.query(
      `
      INSERT INTO study_images (view, name, src, checksum)
      SELECT view, name, src, checksum
      FROM jsonb_to_recordset($1::jsonb) AS image(view integer, name text, src text, checksum text)
      ON CONFLICT (view) DO UPDATE
      SET name = EXCLUDED.name, src = EXCLUDED.src, checksum = EXCLUDED.checksum
    `,
      [JSON.stringify(this.images)],
    );
  }

  async onModuleDestroy() {
    await this.db.end();
  }

  studyImages() {
    return this.images.map(({ view, name, src }) => ({ view, name, src }));
  }

  async load(reportId: string) {
    const { rows } = await this.db.query<Report>(
      `
      SELECT report, COALESCE((
        SELECT jsonb_agg(jsonb_build_object('id', id, 'view', view, 'caption', caption) ORDER BY position)
        FROM report_key_images WHERE report_id = $1
      ), '[]'::jsonb) AS keys
      FROM reports WHERE id = $1
    `,
      [reportId],
    );
    return rows[0] ?? null;
  }

  async save(reportId: string, body: unknown): Promise<Report> {
    const report = validateReport(body, this.images);
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `
        INSERT INTO reports (id, report) VALUES ($1, $2)
      `,
        [reportId, report.report],
      );
      await client.query(
        `
        INSERT INTO report_key_images (report_id, id, view, caption, position)
        SELECT $1, id, view, caption, position
        FROM jsonb_to_recordset($2::jsonb) AS key_image(id uuid, view integer, caption text, position integer)
      `,
        [
          reportId,
          JSON.stringify(
            report.keys.map((key, index) => ({ ...key, position: index + 1 })),
          ),
        ],
      );
      await client.query('COMMIT');
      return report;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
