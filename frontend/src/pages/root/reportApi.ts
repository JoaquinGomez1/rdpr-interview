import type { KeyImage, StudyImage } from "./study";
import { isCreatedReport, isLoadedReport, isStudy } from "./reportContract";
import type { ReportPayload, Study } from "./reportContract";

export type { Study };

export type Draft = { report: string; keys: KeyImage[] };
export type SavedReport = Draft & { images: StudyImage[]; canEdit: boolean };

export class ReportApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, status: number, requestId: string | null) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

async function request<T>(
  url: string,
  isPayload: (value: unknown) => value is T,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(url, options);
  const requestId = response.headers.get("X-Request-Id");
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.filter((item: unknown) => typeof item === "string").join(" ")
      : body?.message;
    throw new ReportApiError(
      response.status < 500 && typeof message === "string" && message
        ? message
        : "The reporting service is unavailable. Try again.",
      response.status,
      requestId,
    );
  }
  try {
    const payload: unknown = await response.json();
    if (isPayload(payload)) return payload;
  } catch {
    // Invalid JSON and invalid payloads use the same response error.
  }
  throw new ReportApiError(
    "The reporting service returned an unreadable response. Try again.",
    response.status,
    requestId,
  );
}

export function loadStudy(signal: AbortSignal) {
  return request("/api/study", isStudy, { signal });
}

export function saveReport(draft: Draft, id?: string) {
  const path = id ? `/api/study/report/${encodeURIComponent(id)}` : "/api/study/report";
  return request(path, isCreatedReport, {
    method: id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report: { message: draft.report },
      keys: draft.keys,
    } satisfies ReportPayload),
  }).then(({ report, keys, id }) => ({ report: report.message, keys, id }));
}

export function loadReport(id: string, signal: AbortSignal) {
  return request(
    `/api/study/report/${encodeURIComponent(id)}`,
    isLoadedReport,
    { signal },
  ).then(({ report, keys, images, canEdit }) => ({
    report: report.message,
    keys,
    images,
    canEdit,
  }));
}
