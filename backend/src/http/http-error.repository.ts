import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import { Database } from '../database.js';

@Injectable()
export class HttpErrorRepository implements OnModuleInit {
  constructor(@Inject(Database) private readonly db: Database) {}

  async onModuleInit() {
    await this.db.query(`
      SELECT pg_advisory_xact_lock(718135291);
      CREATE TABLE IF NOT EXISTS http_error_logs (
        request_id uuid PRIMARY KEY,
        path text NOT NULL,
        method text NOT NULL,
        status_code integer NOT NULL,
        message text NOT NULL,
        occurred_at timestamptz NOT NULL
      );
    `);
  }

  async insert(log: {
    requestId: string;
    path: string;
    method: string;
    statusCode: number;
    message: string;
    occurredAt: Date;
  }) {
    await this.db.query(
      `INSERT INTO http_error_logs (request_id, path, method, status_code, message, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        log.requestId,
        log.path,
        log.method,
        log.statusCode,
        log.message,
        log.occurredAt,
      ],
    );
  }
}
