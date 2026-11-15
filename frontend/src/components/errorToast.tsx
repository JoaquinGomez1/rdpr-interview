import { toast } from "sonner";

type ErrorDetails = {
  message: string;
  status?: number | null;
  requestId?: string | null;
};

export function showErrorToast({ message, status, requestId }: ErrorDetails, id: string) {
  return toast.error(message, {
    id,
    duration: Infinity,
    description: (
      <details className="error-details" key={requestId}>
        <summary>Error details</summary>
        <dl>
          <dt>HTTP status</dt>
          <dd>{status ?? "Unavailable"}</dd>
          <dt>Request ID</dt>
          <dd><code>{requestId ?? "Unavailable"}</code></dd>
        </dl>
      </details>
    ),
  });
}
