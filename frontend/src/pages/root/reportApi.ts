import type { KeyImage, StudyImage } from "./study";

export type Draft = { report: string; keys: KeyImage[] };
type ReportRequest = { report: { message: string }; keys: KeyImage[] };
type ApiReport = { report: { message: string }; keys: KeyImage[] };
export type Study = { draftId: string; images: StudyImage[] };
export type SavedReport = Draft & { images: StudyImage[] };

export class ReportApiError extends Error {
  readonly status: number;
  readonly requestId: string | null;

  constructor(message: string, status: number, requestId: string | null) {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
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
    return await response.json();
  } catch {
    throw new ReportApiError(
      "The reporting service returned an unreadable response. Try again.",
      response.status,
      requestId,
    );
  }
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
