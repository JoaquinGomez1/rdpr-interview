import { UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const publicDir = resolve(
  process.env.FRONTEND_DIR ??
    resolve(import.meta.dirname, '../../frontend/public'),
);

export const uuidPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
const views = [
  'Frontal chest',
  'Lateral chest',
  'Oblique chest',
  'Axial slice',
  'Coronal slice',
];

export async function readStudyImages() {
  return Promise.all(
    views.map(async (name, view) => {
      const src = `/study/view-${view + 1}.png`;
      const file = await readFile(resolve(publicDir, `.${src}`));
      const checksum = createHash('sha256').update(file).digest('hex');
      return { view, name, src, checksum };
    }),
  );
}

export type StudyImage = Awaited<ReturnType<typeof readStudyImages>>[number];
export type KeyImage = { id: string; view: number; caption: string };
export type Report = { report: string; keys: KeyImage[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isText(value: unknown, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maxLength &&
    !/[\uD800-\uDFFF\0]/u.test(value)
  );
}

export function validateReport(body: unknown, images: StudyImage[]): Report {
  if (
    !isObject(body) ||
    !isText(body.report, 16_000) ||
    !Array.isArray(body.keys)
  ) {
    throw new UnprocessableEntityException(
      'Provide report text up to 16,000 characters and a list of key images.',
    );
  }

  const ids = new Set<string>();
  const captionedImages = new Set<string>();
  const keys: KeyImage[] = [];
  for (const [index, key] of (body.keys as unknown[]).entries()) {
    const position = index + 1;
    if (
      !isObject(key) ||
      typeof key.id !== 'string' ||
      !uuidPattern.test(key.id)
    ) {
      throw new UnprocessableEntityException(
        `Key image ${position} needs a valid ID.`,
      );
    }
    const id = key.id.toLowerCase();
    if (ids.has(id))
      throw new UnprocessableEntityException(
        `Key image ${position} repeats an entry ID.`,
      );
    ids.add(id);

    const image = images.find(({ view }) => view === key.view);
    if (!image)
      throw new UnprocessableEntityException(
        `Key image ${position} is outside this study.`,
      );
    if (!isText(key.caption, 160) || /[\r\n]/.test(key.caption)) {
      throw new UnprocessableEntityException(
        `Caption ${position} must be one line of up to 160 characters.`,
      );
    }
    if (key.caption.trim()) {
      const match = `${image.checksum}:${key.caption}`;
      if (captionedImages.has(match)) continue;
      captionedImages.add(match);
    }
    keys.push({ id, view: image.view, caption: key.caption });
  }
  if (keys.length > 15)
    throw new UnprocessableEntityException(
      'A report can contain up to 15 key images.',
    );
  return { report: body.report, keys };
}
