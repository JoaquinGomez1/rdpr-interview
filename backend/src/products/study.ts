export const uuidPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export type StudyImage = {
  view: number;
  name: string;
  src: string;
  checksum: string;
};
export type KeyImage = { id: string; view: number; caption: string };
export type Report = { report: { message: string }; keys: KeyImage[] };

export class ReportValidationError extends Error {}

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
    !isObject(body.report) ||
    !isText(body.report.message, 16_000) ||
    body.report.message.trim().length < 10
  ) {
    throw new ReportValidationError(
      'Report text must be 10 to 16,000 characters, excluding leading and trailing whitespace from the minimum.',
    );
  }
  if (!Array.isArray(body.keys) || body.keys.length === 0) {
    throw new ReportValidationError('Add at least one key image.');
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
      throw new ReportValidationError(
        `Key image ${position} needs a valid ID.`,
      );
    }
    const id = key.id.toLowerCase();
    if (ids.has(id))
      throw new ReportValidationError(
        `Key image ${position} repeats an entry ID.`,
      );
    ids.add(id);

    const image = images.find(({ view }) => view === key.view);
    if (!image)
      throw new ReportValidationError(
        `Key image ${position} is outside this study.`,
      );
    if (
      !isText(key.caption, 160) ||
      !key.caption.trim() ||
      /[\r\n]/.test(key.caption)
    ) {
      throw new ReportValidationError(
        `Caption ${position} is required and must be one line of up to 160 characters.`,
      );
    }
    const match = `${image.checksum}:${key.caption}`;
    if (captionedImages.has(match)) continue;
    captionedImages.add(match);
    keys.push({ id, view: image.view, caption: key.caption });
  }
  if (keys.length > 15)
    throw new ReportValidationError(
      'A report can contain up to 15 key images.',
    );
  return { report: { message: body.report.message }, keys };
}
