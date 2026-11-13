import { useEffect, useState } from "react";
import type { KeyImage } from "./study";

type Draft = { report: string; keys: KeyImage[] };

const storageKey = "radpair-report-draft";
const legacyStorageKey = "radpair-annotation-experiment";

function readDraft(): Draft {
  try {
    const saved =
      localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey);
    if (saved) {
      const { report, keys } = JSON.parse(saved) as Draft;
      return {
        report,
        keys: keys.map(({ id, view, caption }) => ({ id, view, caption })),
      };
    }
  } catch {
    // The editor still works when browser storage is unavailable.
  }
  return { report: "", keys: [] };
}

export function useReportDraft() {
  const [draft, setDraft] = useState(readDraft);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let failed = false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
      localStorage.removeItem(legacyStorageKey);
    } catch {
      failed = true;
    }
    // Report the result of writing to browser storage.
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageError(failed);
  }, [draft]);

  return { draft, setDraft, storageError };
}
