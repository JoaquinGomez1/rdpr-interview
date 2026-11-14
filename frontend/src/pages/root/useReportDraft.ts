import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ResolverResult } from "react-hook-form";
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
        .map(({ id, view, caption }) => ({ id, view, caption: typeof caption === "string" ? caption : "" })),
    };
  } catch {
    return null;
  }
}

const emptyDraft: Draft = { report: "", keys: [] };

function resolveDraft(draft: Draft): ResolverResult<Draft> {
  const messages: string[] = [];
  if (draft.report.trim().length < 10) {
    messages.push("Enter at least 10 characters of report text.");
  } else if (draft.report.length > 16_000 || /[\uD800-\uDFFF\0]/u.test(draft.report)) {
    messages.push("Enter valid report text of up to 16,000 characters.");
  }
  if (!draft.keys.length) messages.push("Add at least one key image.");
  draft.keys.forEach(({ caption }, index) => {
    if (!caption.trim()) {
      messages.push(`Add a caption for key image ${index + 1}.`);
    } else if (caption.length > 160 || /[\r\n\uD800-\uDFFF\0]/u.test(caption)) {
      messages.push(`Caption ${index + 1} must be one line of up to 160 characters.`);
    }
  });
  return messages.length
    ? { values: {}, errors: { root: { validation: { type: "validate", message: messages.join(" ") } } } }
    : { values: draft, errors: {} };
}

export function useReportDraft(study: Study) {
  const storageKey = `radpair-report-draft:${study.draftId}`;
  const [initialDraft] = useState(() => readDraft(storageKey, study) ?? emptyDraft);
  const { watch, getValues, setValue, trigger, handleSubmit, formState: { errors, isValid, isDirty } } =
    useForm<Draft>({ defaultValues: initialDraft, resolver: resolveDraft });
  const report = watch("report");
  const keys = watch("keys");
  const [storageError, setStorageError] = useState(false);
  const dirty = isDirty || initialDraft !== emptyDraft;

  useEffect(() => {
    void trigger();
  }, [trigger]);

  function setDraft(update: Draft | ((current: Draft) => Draft)) {
    const current = getValues();
    const next = typeof update === "function" ? update(current) : update;
    if (next.report !== current.report) setValue("report", next.report, { shouldDirty: true });
    if (next.keys !== current.keys) setValue("keys", next.keys, { shouldDirty: true });
    void trigger();
  }

  useEffect(() => {
    let failed = false;
    try {
      if (dirty) {
        localStorage.setItem(storageKey, JSON.stringify({ report, keys }));
        for (const key of legacyKeys) localStorage.removeItem(key);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {
      failed = true;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageError(failed);
  }, [dirty, report, keys, storageKey]);

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
      for (const key of legacyKeys) localStorage.removeItem(key);
    } catch {
      // The report has already been saved to the server.
    }
  }

  return {
    draft: { report, keys }, setDraft, storageError, dirty, clearDraft, handleSubmit,
    isValid, validationMessage: errors.root?.validation?.message,
  };
}
