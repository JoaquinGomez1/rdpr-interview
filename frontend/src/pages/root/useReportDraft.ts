import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { ResolverResult } from "react-hook-form";
import { showErrorToast } from "../../components/errorToast";
import type { Draft, Study } from "./reportApi";
import { isUuid, isView } from "./reportContract";
import { keyImageLimit } from "./study";

const legacyKeys = ["radpair-report-draft", "radpair-annotation-experiment"];

function readDraft(storageKey: string, study: Study): Draft | null {
  const saved =
    localStorage.getItem(storageKey) ??
    legacyKeys.map((key) => localStorage.getItem(key)).find(Boolean);
  if (!saved) return null;
  const parsed: unknown = JSON.parse(saved);
  if (
    !parsed || typeof parsed !== "object" ||
    !("report" in parsed) || typeof parsed.report !== "string" ||
    !("keys" in parsed) || !Array.isArray(parsed.keys)
  ) {
    throw new Error("Invalid stored draft");
  }
  const views = new Set(study.images.map(({ view }) => view));
  const ids = new Set<string>();
  const keys: Draft["keys"] = [];
  for (const entry of parsed.keys as unknown[]) {
    if (
      !entry || typeof entry !== "object" || !("view" in entry) ||
      !isView(entry.view) || !views.has(entry.view)
    ) continue;
    const storedId = "id" in entry && isUuid(entry.id) ? entry.id.toLowerCase() : null;
    const id = storedId && !ids.has(storedId) ? storedId : crypto.randomUUID();
    ids.add(id);
    keys.push({
      id,
      view: entry.view,
      caption: "caption" in entry && typeof entry.caption === "string" ? entry.caption : "",
    });
  }
  return { report: parsed.report, keys };
}

const emptyDraft: Draft = { report: "", keys: [] };

function resolveDraft(draft: Draft): ResolverResult<Draft> {
  const messages: string[] = [];
  if (draft.report.trim().length < 10) {
    messages.push("Enter at least 10 characters of report text.");
  } else if (
    draft.report.length > 16_000 ||
    /[\uD800-\uDFFF\0]/u.test(draft.report)
  ) {
    messages.push("Enter valid report text of up to 16,000 characters.");
  }
  if (!draft.keys.length) messages.push("Add at least one key image.");
  if (draft.keys.length > keyImageLimit) {
    messages.push(`Remove key images to reach the limit of ${keyImageLimit}.`);
  }
  draft.keys.forEach(({ caption }, index) => {
    if (!caption.trim()) {
      messages.push(`Add a caption for key image ${index + 1}.`);
    } else if (caption.length > 160 || /[\r\n\uD800-\uDFFF\0]/u.test(caption)) {
      messages.push(
        `Caption ${index + 1} must be one line of up to 160 characters.`,
      );
    }
  });
  return messages.length
    ? {
        values: {},
        errors: {
          root: {
            validation: { type: "validate", message: messages.join(" ") },
          },
        },
      }
    : { values: draft, errors: {} };
}

export function useReportDraft(study: Study) {
  const storageKey = `radpair-report-draft:${study.draftId}`;
  const [{ initialDraft, restoreFailed }] = useState(() => {
    try {
      return {
        initialDraft: readDraft(storageKey, study) ?? emptyDraft,
        restoreFailed: false,
      };
    } catch {
      return { initialDraft: emptyDraft, restoreFailed: true };
    }
  });
  const {
    watch,
    getValues,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isValid, isDirty },
  } = useForm<Draft>({ defaultValues: initialDraft, resolver: resolveDraft });
  const report = watch("report");
  const keys = watch("keys");
  const [storageError, setStorageError] = useState(false);
  const dirty = isDirty || initialDraft !== emptyDraft;

  useEffect(() => {
    void trigger();
  }, [trigger]);

  useEffect(() => {
    if (restoreFailed) {
      showErrorToast(
        { message: "The draft could not be restored from this device." },
        "restore-draft",
      );
    }
  }, [restoreFailed]);

  function setDraft(update: Draft | ((current: Draft) => Draft)) {
    const current = getValues();
    const next = typeof update === "function" ? update(current) : update;
    if (next.report !== current.report)
      setValue("report", next.report, { shouldDirty: true });
    if (next.keys !== current.keys)
      setValue("keys", next.keys, { shouldDirty: true });
    void trigger();
  }

  useEffect(() => {
    let failed = false;
    try {
      if (dirty) {
        localStorage.setItem(storageKey, JSON.stringify({ report, keys }));
        for (const key of legacyKeys) localStorage.removeItem(key);
      } else if (!restoreFailed) {
        localStorage.removeItem(storageKey);
      }
    } catch {
      failed = true;
    }
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageError(failed);
  }, [dirty, report, keys, restoreFailed, storageKey]);

  useEffect(() => {
    if (storageError) {
      showErrorToast(
        { message: "The draft could not be saved on this device." },
        "store-draft",
      );
    }
  }, [storageError]);

  function clearDraft() {
    try {
      localStorage.removeItem(storageKey);
      for (const key of legacyKeys) localStorage.removeItem(key);
    } catch {
      showErrorToast(
        { message: "The report was saved, but the local draft could not be cleared." },
        "clear-draft",
      );
    }
  }

  return {
    draft: { report, keys },
    setDraft,
    storageError,
    dirty,
    clearDraft,
    handleSubmit,
    isValid,
    validationMessage: errors.root?.validation?.message,
  };
}
