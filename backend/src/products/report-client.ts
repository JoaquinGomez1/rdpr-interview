import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { uuidPattern } from './study.js';

const cookieName = 'radpair-client-id';

export function readClientId(request: Request) {
  const cookie = request.headers.cookie
    ?.split(';')
    .find((part) => part.trimStart().startsWith(`${cookieName}=`));
  const id = cookie?.trim().slice(cookieName.length + 1);
  return id && uuidPattern.test(id) ? id.toLowerCase() : undefined;
}

export function identifyClient(request: Request, response: Response) {
  const existing = readClientId(request);
  if (existing) return existing;

  const id = randomUUID();
  response.cookie(cookieName, id, {
    httpOnly: true,
    sameSite: 'strict',
    secure:
      process.env.NODE_ENV === 'production' &&
      process.env.COOKIE_SECURE !== 'false',
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: '/',
  });
  return id;
}
