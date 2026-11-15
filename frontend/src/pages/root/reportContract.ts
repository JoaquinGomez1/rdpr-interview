import type { KeyImage, StudyImage } from "./study";

export type ReportPayload = { report: { message: string }; keys: KeyImage[] };
export type Study = { images: StudyImage[] };
type CreatedReport = ReportPayload & { id: string };
type LoadedReport = ReportPayload & { images: StudyImage[]; canEdit: boolean };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value);
}

export function isView(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isImage(value: unknown): value is StudyImage {
  return isObject(value) && isView(value.view) &&
    typeof value.name === "string" && typeof value.src === "string";
}

function isCatalog(value: unknown): value is StudyImage[] {
  return Array.isArray(value) && value.every(isImage) &&
    new Set(value.map(({ view }) => view)).size === value.length;
}

function isKey(value: unknown): value is KeyImage {
  return isObject(value) && isUuid(value.id) && isView(value.view) &&
    typeof value.caption === "string";
}

function isReport(value: unknown): value is ReportPayload {
  return isObject(value) && isObject(value.report) &&
    typeof value.report.message === "string" &&
    Array.isArray(value.keys) && value.keys.every(isKey) &&
    new Set(value.keys.map(({ id }) => id.toLowerCase())).size === value.keys.length;
}

export function isStudy(value: unknown): value is Study {
  return isObject(value) && isCatalog(value.images);
}

export function isCreatedReport(value: unknown): value is CreatedReport {
  return isObject(value) && isUuid(value.id) && isReport(value);
}

export function isLoadedReport(value: unknown): value is LoadedReport {
  if (!isObject(value) || typeof value.canEdit !== "boolean" || !isCatalog(value.images)) return false;
  const views = new Set(value.images.map(({ view }) => view));
  return isReport(value) && value.keys.every(({ view }) => views.has(view));
}
