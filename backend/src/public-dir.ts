import { resolve } from 'node:path';

export const publicDir = resolve(
  process.env.FRONTEND_DIR ??
    resolve(import.meta.dirname, '../../frontend/public'),
);
