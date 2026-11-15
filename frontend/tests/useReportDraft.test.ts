import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, test } from "vitest";
import { useReportDraft } from "../src/pages/root/useReportDraft";
import { study } from "./studyFixture";

beforeEach(() => localStorage.clear());

test("restores report text and ordered key images with their captions on remount", () => {
  const { result, unmount } = renderHook(() => useReportDraft(study));
  const draft = {
    report: "Findings from the chest study.",
    keys: [
      { id: "04fc9ecf-4953-44e7-8a4a-728afbb1c66a", view: 1, caption: "Lateral finding" },
      { id: "ec0ad602-2fa1-4fc7-ade3-98b4af5b27e0", view: 0, caption: "Frontal finding" },
    ],
  };

  act(() => result.current.setDraft(draft));
  unmount();

  const { result: restored } = renderHook(() => useReportDraft(study));
  expect(restored.current.draft).toEqual(draft);
  expect(restored.current.storageError).toBe(false);
});

test("repairs legacy key IDs and preserves the valid entries in order", () => {
  const id = "04fc9ecf-4953-44e7-8a4a-728afbb1c66a";
  localStorage.setItem("radpair-report-draft", JSON.stringify({
    report: "Findings from the chest study.",
    keys: [
      { id, view: 1, caption: "Lateral finding" },
      null,
      { id: id.toUpperCase(), view: 0, caption: "Frontal finding" },
      { view: 4, caption: "Coronal finding" },
    ],
  }));

  const { result } = renderHook(() => useReportDraft(study));
  const { keys } = result.current.draft;
  expect(keys.map(({ view, caption }) => [view, caption])).toEqual([
    [1, "Lateral finding"],
    [0, "Frontal finding"],
    [4, "Coronal finding"],
  ]);
  expect(keys[0].id).toBe(id);
  expect(new Set(keys.map((key) => key.id)).size).toBe(3);
  expect(keys.slice(1).every((key) => /^[\da-f-]{36}$/.test(key.id))).toBe(true);
});
