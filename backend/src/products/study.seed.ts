import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { publicDir } from '../public-dir.js';
import type { StudyImage } from './study.js';

const views = [
  'Frontal chest',
  'Lateral chest',
  'Oblique chest',
  'Axial slice',
  'Coronal slice',
];

async function readStudyImages(): Promise<StudyImage[]> {
  return Promise.all(
    views.map(async (name, view) => {
      const src = `/study/view-${view + 1}.png`;
      const file = await readFile(resolve(publicDir, `.${src}`));
      const checksum = createHash('sha256').update(file).digest('hex');
      return { view, name, src, checksum };
    }),
  );
}

export async function seedStudyImages(db: Pool) {
  const images = await readStudyImages();
  await db.query(
    `
    INSERT INTO study_images (view, name, src, checksum)
    SELECT view, name, src, checksum
    FROM jsonb_to_recordset($1::jsonb) AS image(view integer, name text, src text, checksum text)
    ON CONFLICT (view) DO UPDATE
    SET name = EXCLUDED.name, src = EXCLUDED.src, checksum = EXCLUDED.checksum
  `,
    [JSON.stringify(images)],
  );
  return images;
}
