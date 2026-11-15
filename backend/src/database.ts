import { Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class Database extends Pool implements OnApplicationShutdown {
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is required.');
    super({ connectionString, connectionTimeoutMillis: 5_000 });
  }

  async onApplicationShutdown() {
    await this.end();
  }
}
