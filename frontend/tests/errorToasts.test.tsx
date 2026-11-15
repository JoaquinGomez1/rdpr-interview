import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { expect, test, vi } from "vitest";
import App from "../src/App";
import { study } from "./studyFixture";

test("hides API error diagnostics until expanded and lets the user retry", async () => {
  const user = userEvent.setup();
  const requestId = "study-request-123";
  const fetchStudy = vi.fn()
    .mockResolvedValueOnce(Response.json(
      { message: "Study could not be found." },
      { status: 404, headers: { "X-Request-Id": requestId } },
    ))
    .mockResolvedValueOnce(Response.json(study));
  vi.stubGlobal("fetch", fetchStudy);
  window.history.replaceState(null, "", "/");
  localStorage.clear();
  render(
    <DndProvider backend={TestBackend}>
      <App />
    </DndProvider>,
  );

  const message = await screen.findByText("Study could not be found.");
  const notification = within(message.closest("li")!);
  expect(message).toBeVisible();
  expect(notification.getByText("404")).not.toBeVisible();
  expect(notification.getByText(requestId)).not.toBeVisible();

  fireEvent.click(notification.getByText("Error details"));
  expect(notification.getByText("404")).toBeVisible();
  expect(notification.getByText(requestId)).toBeVisible();
  fireEvent.click(notification.getByText("Error details"));
  expect(notification.getByText(requestId)).not.toBeVisible();

  await user.click(screen.getByRole("button", { name: "Retry" }));
  expect(await screen.findByLabelText("Report text")).toBeEnabled();
  expect(fetchStudy).toHaveBeenCalledTimes(2);
});
