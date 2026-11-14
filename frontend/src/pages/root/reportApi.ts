import type { KeyImage, StudyImage } from "./study";

export type Draft = { report: string; keys: KeyImage[] };
type ReportRequest = { report: { message: string }; keys: KeyImage[] };
type ApiReport = { report: { message: string }; keys: KeyImage[] };
export type Study = { draftId: string; images: StudyImage[] };
export type SavedReport = Draft & { images: StudyImage[] };

export class ReportApiError extends Error {
  readonly requestId: string | null;

  constructor(message: string, requestId: string | null) {
    super(message);
    this.requestId = requestId;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ReportApiError(
      response.status < 500 && typeof body?.message === "string"
        ? body.message
        : "The reporting service is unavailable. Try again.",
      response.headers.get("X-Request-Id"),
    );
  }
  return response.json();
}

export function loadStudy(signal: AbortSignal) {
  return request<Study>("/api/study", { signal });
}

export function saveReport(draft: Draft) {
  return request<ApiReport & { id: string }>("/api/study/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ report: { message: draft.report }, keys: draft.keys } satisfies ReportRequest),
  }).then(({ report, keys, id }) => ({ report: report.message, keys, id }));
}

export function loadReport(id: string, signal: AbortSignal) {
  return request<ApiReport & { images: StudyImage[] }>(`/api/study/report/${encodeURIComponent(id)}`, { signal })
    .then(({ report, keys, images }) => ({ report: report.message, keys, images }));
}
