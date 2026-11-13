import { KeyImageList } from "./KeyImageList";
import type { KeyImageListProps } from "./KeyImageList";

export function ReportPanel({
  report,
  onReportChange,
  ...keyImages
}: KeyImageListProps & {
  report: string;
  onReportChange: (report: string) => void;
}) {
  return (
    <section className="panel report" aria-labelledby="report-title">
      <div className="section-head">
        <h2 id="report-title">Report</h2>
      </div>
      <label htmlFor="report-text">Report text</label>
      <textarea
        id="report-text"
        className="report-text"
        placeholder="Describe your findings and impression…"
        value={report}
        onChange={(event) => onReportChange(event.target.value)}
      />
      <KeyImageList {...keyImages} />
    </section>
  );
}
