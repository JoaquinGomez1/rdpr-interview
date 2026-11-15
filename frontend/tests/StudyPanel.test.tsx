import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { TestBackend } from "react-dnd-test-backend";
import { expect, test, vi } from "vitest";
import { Toaster } from "../src/components/ui/sonner";
import { StudyPanel } from "../src/pages/root/components/StudyPanel";
import { StudyFixture } from "./studyFixture";

test("requests the selected study view and displays its larger image", async () => {
  const user = userEvent.setup();
  const onOpenView = vi.fn();
  const props = { keys: [], onOpenView, onAddKey: vi.fn() };
  const { rerender } = render(<StudyPanel {...props} selection={{ view: 0 }} />, {
    wrapper: ({ children }) => <StudyFixture><DndProvider backend={TestBackend}>{children}</DndProvider></StudyFixture>,
  });

  const axialThumbnail = screen.getByRole("button", { name: "Axial slice" });
  await user.click(axialThumbnail);
  expect(onOpenView).toHaveBeenCalledOnce();
  expect(onOpenView).toHaveBeenCalledWith(3);

  rerender(<StudyPanel {...props} selection={{ view: 3 }} />);
  expect(axialThumbnail).toBePressed();
  expect(screen.getByRole("button", { name: "Frontal chest" })).not.toBePressed();
  expect(screen.getByRole("img", { name: /axial slice/i })).toHaveAttribute(
    "src", "/study/view-4.png",
  );
});

test("requests adding the current study view as a key image", async () => {
  const user = userEvent.setup();
  const onAddKey = vi.fn();
  render(
    <DndProvider backend={TestBackend}>
      <StudyPanel selection={{ view: 4 }} keys={[]} onOpenView={vi.fn()} onAddKey={onAddKey} />
    </DndProvider>, { wrapper: StudyFixture },
  );

  await user.click(screen.getByRole("button", { name: /add key image/i }));
  expect(onAddKey).toHaveBeenCalledOnce();
  expect(onAddKey).toHaveBeenCalledWith(4);
});

test("shows an error toast when the selected image fails to load", async () => {
  render(
    <DndProvider backend={TestBackend}>
      <StudyPanel
        selection={{ view: 0 }}
        keys={[]}
        onOpenView={vi.fn()}
        onAddKey={vi.fn()}
      />
      <Toaster />
    </DndProvider>,
    { wrapper: StudyFixture },
  );

  fireEvent.error(screen.getByRole("img", { name: /frontal chest/i }));
  expect(await screen.findByText("Frontal chest could not load.")).toBeVisible();
  expect(screen.getByText("Image unavailable")).toBeVisible();
  fireEvent.click(screen.getByText("Error details"));
  expect(screen.getByText("HTTP status")).toBeVisible();
  expect(screen.getAllByText("Unavailable")).toHaveLength(2);
});
