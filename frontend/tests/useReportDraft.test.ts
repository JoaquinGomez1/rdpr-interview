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
      { id: "lateral", view: 1, caption: "Lateral finding" },
      { id: "frontal", view: 0, caption: "Frontal finding" },
    ],
  };

  act(() => result.current.setDraft(draft));
  unmount();

  const { result: restored } = renderHook(() => useReportDraft(study));
  expect(restored.current.draft).toEqual(draft);
  expect(restored.current.storageError).toBe(false);
});
