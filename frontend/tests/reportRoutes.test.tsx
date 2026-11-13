import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { expect, test, vi } from "vitest";
import App from "../src/App";
import { study } from "./studyFixture";

test("confirms a save, opens the read-only report, and starts a fresh draft", async () => {
  const user = userEvent.setup();
  const id = "04fc9ecf-4953-44e7-8a4a-728afbb1c66a";
  const report = { report: "Saved findings", keys: [{ id, view: 0, caption: "A saved caption" }] };
  const fetchReport = vi.fn(async (url: string, options?: RequestInit) => {
    if (options?.method === "POST") return Response.json({ id, ...report });
    if (url === `/api/study/report/${id}`) return Response.json({ ...report, images: study.images });
    return Response.json(study);
  });
  vi.stubGlobal("fetch", fetchReport);
  const dialogPrototype = HTMLDialogElement.prototype;
  Object.defineProperties(dialogPrototype, {
    showModal: { configurable: true, value(this: HTMLDialogElement) { this.open = true; } },
    close: { configurable: true, value(this: HTMLDialogElement) { this.open = false; } },
  });
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  render(<DndProvider backend={TestBackend}><App /></DndProvider>);

  await user.type(await screen.findByLabelText("Report text"), "Saved findings");
  await user.click(screen.getByRole("button", { name: "Save report" }));
  const confirmation = screen.getByRole("dialog", { name: "Save report?" });
  expect(confirmation).toHaveTextContent("This report will be read-only after you save it.");
  expect(fetchReport.mock.calls.some(([, options]) => options?.method === "POST")).toBe(false);
  await user.click(within(confirmation).getByRole("button", { name: "Save report" }));

  expect(await screen.findByText("A saved caption")).toBeVisible();
  expect(window.location.pathname).toBe(`/${id}`);
  expect(screen.getByLabelText("Report text")).toHaveAttribute("readonly");
  expect(screen.queryByRole("button", { name: /add|remove|edit caption/i })).toBeNull();
  await user.click(screen.getByRole("link", { name: "New report" }));
  expect(await screen.findByLabelText("Report text")).toHaveValue("");
  expect(window.location.pathname).toBe("/");
});
