export const uuidPattern = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;
export type PublicStudyImage = {
  view: number;
  name: string;
  src: string;
};
export type StudyImage = PublicStudyImage & { checksum: string };
export type KeyImage = { id: string; view: number; caption: string };
export type Report = { report: { message: string }; keys: KeyImage[] };
export type StudyResponse = { draftId: string; images: PublicStudyImage[] };
export type CreatedReportResponse = Report & { id: string };
export type SavedReportResponse = Report & { images: PublicStudyImage[] };

export class ReportValidationError extends Error {}

export function prepareReport(body: Report, images: StudyImage[]): Report {
  const captionedImages = new Set<string>();
  const keys: KeyImage[] = [];
  for (const [index, key] of body.keys.entries()) {
    const position = index + 1;
    const image = images.find(({ view }) => view === key.view);
    if (!image)
      throw new ReportValidationError(
        `Key image ${position} is outside this study.`,
      );
    const match = `${image.checksum}:${key.caption}`;
    if (captionedImages.has(match)) continue;
    captionedImages.add(match);
    keys.push({
      id: key.id.toLowerCase(),
      view: image.view,
      caption: key.caption,
    });
  }
  if (keys.length > 15)
    throw new ReportValidationError(
      'A report can contain up to 15 key images.',
    );
  return { report: { message: body.report.message }, keys };
}
