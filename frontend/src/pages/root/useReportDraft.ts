import { useEffect, useState } from "react";
import type { Draft, Study } from "./reportApi";

const legacyKeys = ["radpair-report-draft", "radpair-annotation-experiment"];

function readDraft(storageKey: string, study: Study): Draft | null {
  try {
    const saved = localStorage.getItem(storageKey) ??
      legacyKeys.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!saved) return null;
    const { report, keys } = JSON.parse(saved) as Draft;
    if (typeof report !== "string" || !Array.isArray(keys)) return null;
    return {
      report,
      keys: keys.filter(({ view }) => study.images.some((image) => image.view === view))
        .map(({ id, view, caption }) => ({ id, view, caption })),
    };
  } catch {
    return null;
  }
}

const emptyDraft: Draft = { report: "", keys: [] };

export function useReportDraft(study: Study) {
  const storageKey = `radpair-report-draft:${study.draftId}`;
  const [draft, setDraft] = useState(() => readDraft(storageKey, study) ?? emptyDraft);
  const [storageError, setStorageError] = useState(false);
  const dirty = draft !== emptyDraft;

  useEffect(() => {
    let failed = false;
    try {
      if (dirty) {
        localStorage.setItem(storageKey, JSON.stringify(draft));
        for (const key of legacyKeys) localStorage.removeItem(key);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      failed = true;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageError(failed);
  }, [dirty, draft, storageKey]);

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
      for (const key of legacyKeys) localStorage.removeItem(key);
    } catch {
      // The report has already been saved to the server.
    }
  }

  return { draft, setDraft, storageError, dirty, clearDraft };
}
