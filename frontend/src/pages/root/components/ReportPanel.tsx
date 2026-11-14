import { Link } from "react-router";
import { KeyImageList } from "./KeyImageList";
import type { KeyImageListProps } from "./KeyImageList";
import type { ReportApiError } from "../reportApi";

export function ReportPanel({
  report,
  onReportChange,
  submit,
  saving,
  canSave,
  validationMessage,
  saveError,
  readOnly = false,
  ...keyImages
}: KeyImageListProps & {
  report: string;
  onReportChange: (report: string) => void;
  submit?: () => void;
  saving: boolean;
  canSave: boolean;
  validationMessage?: string;
  saveError?: ReportApiError;
}) {
  return (
    <section className="panel report" aria-labelledby="report-title">
      <div className="section-head">
        <h2 id="report-title">Report</h2>
      </div>
      <div inert={saving}>
        <label htmlFor="report-text">Report text</label>
        <textarea
          id="report-text"
          className="report-text"
          placeholder="Describe your findings and impression…"
          maxLength={16_000}
          value={report}
          readOnly={readOnly}
          onChange={(event) => onReportChange(event.target.value)}
        />
        <KeyImageList {...keyImages} readOnly={readOnly} />
      </div>
      <div className="report-actions">
        {readOnly ? <Link className="accent new-report" to="/">New report</Link> : (
          <div
            className="save-report"
            tabIndex={validationMessage ? 0 : undefined}
            aria-label={validationMessage ? "Save report unavailable" : undefined}
            aria-describedby={validationMessage ? "report-validation" : undefined}
          >
            <button className="accent" disabled={!canSave || saving} onClick={submit}>
              {saving ? "Saving…" : "Save report"}
            </button>
            {validationMessage && (
              <span id="report-validation" role="tooltip">{validationMessage}</span>
            )}
          </div>
        )}
        {saveError && <p role="alert">{saveError.message}</p>}
        {saveError?.requestId && (
          <details>
            <summary>Request ID</summary>
            <code>{saveError.requestId}</code>
          </details>
        )}
      </div>
    </section>
  );
}
