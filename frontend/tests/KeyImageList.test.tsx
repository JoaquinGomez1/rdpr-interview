import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndProvider } from "react-dnd";
import { TestBackend, TestBackendImpl } from "react-dnd-test-backend";
import { afterEach, expect, test, vi } from "vitest";
import { KeyImageList } from "../src/pages/root/components/KeyImageList";
import type { KeyImageListProps } from "../src/pages/root/components/KeyImageList";
import { StudyThumbnail } from "../src/pages/root/components/StudyThumbnail";
import { StudyFixture } from "./studyFixture";

const frontal = { id: "frontal", view: 0, caption: "" };
const lateral = { id: "lateral", view: 1, caption: "" };

function listProps(): KeyImageListProps {
  return {
    keys: [frontal, lateral],
    announcement: "",
    onAddKey: vi.fn(),
    onOpenKey: vi.fn(),
    onMoveKey: vi.fn(() => true),
    onChangeCaption: vi.fn(),
    onRemoveKey: vi.fn(),
  };
}

test("shows the key image preview and opens it with Enter", async () => {
  const user = userEvent.setup();
  const props = listProps();
  render(<KeyImageList {...props} activeKey={lateral.id} />, {
    wrapper: ({ children }) => (
      <StudyFixture>
        <DndProvider backend={TestBackend}>{children}</DndProvider>
      </StudyFixture>
    ),
  });

  const preview = screen.getByRole("button", {
    name: "View key image 2, Lateral chest",
  });
  expect(preview).toBePressed();
  expect(within(preview).getByRole("presentation")).toHaveAttribute(
    "src",
    "/study/view-2.png",
  );
  preview.focus();
  await user.keyboard("{Enter}");
  expect(props.onOpenKey).toHaveBeenCalledWith(1, lateral.id);
});

test("requests keyboard reordering and focuses the moved card at its new position", async () => {
  const user = userEvent.setup();
  const props = listProps();
  const { rerender } = render(<KeyImageList {...props} />, {
    wrapper: ({ children }) => (
      <StudyFixture>
        <DndProvider backend={TestBackend}>{children}</DndProvider>
      </StudyFixture>
    ),
  });

  await user.tab();
  expect(
    screen.getByRole("listitem", { name: "Frontal chest, key image 1" }),
  ).toHaveFocus();
  await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
  expect(props.onMoveKey).toHaveBeenCalledOnce();
  expect(props.onMoveKey).toHaveBeenCalledWith(frontal.id, 1);

  rerender(
    <KeyImageList
      {...props}
      keys={[lateral, frontal]}
      announcement="Moved to position 2 of 2."
    />,
  );
  expect(screen.getAllByRole("listitem")[1]).toHaveAccessibleName(
    "Frontal chest, key image 2",
  );
  expect(screen.getAllByRole("listitem")[1]).toHaveFocus();
  expect(screen.getByRole("status")).toHaveTextContent(
    "Moved to position 2 of 2.",
  );
});

afterEach(() => {
  Reflect.deleteProperty(document, "elementFromPoint");
});

test("accepts a study thumbnail dropped into the key image list", () => {
  const { backend, getInstance, handlerId } = createDragBackend();
  const props = listProps();
  render(
    <DndProvider backend={backend}>
      <StudyThumbnail index={3} selected={false} onOpen={vi.fn()} />
      <KeyImageList {...props} keys={[]} />
    </DndProvider>,
    { wrapper: StudyFixture },
  );
  const thumbnail = screen.getByRole("button", { name: "Axial slice" });
  const list = screen.getByRole("list");
  const drag = getInstance();

  act(() => drag.simulateBeginDrag([handlerId(thumbnail)], {}));
  act(() => drag.simulateHover([handlerId(list)], {}));
  expect(props.onAddKey).not.toHaveBeenCalled();
  act(() => {
    drag.simulateDrop();
    drag.simulateEndDrag();
  });
  expect(props.onAddKey).toHaveBeenCalledOnce();
  expect(props.onAddKey).toHaveBeenCalledWith(3);
});

test("shows a drag insertion marker and requests the new order on drop", () => {
  const { backend, getInstance, handlerId } = createDragBackend();
  const props = listProps();
  render(
    <DndProvider backend={backend}>
      <KeyImageList {...props} />
    </DndProvider>,
    { wrapper: StudyFixture },
  );
  const list = screen.getByRole("list");
  const [first, second] = within(list).getAllByRole("listitem");
  const drag = getInstance();
  // jsdom does not perform layout or hit testing.
  vi.spyOn(first, "getBoundingClientRect").mockReturnValue(
    new DOMRect(0, 0, 200, 100),
  );
  Object.defineProperty(document, "elementFromPoint", {
    configurable: true,
    value: () => first,
  });

  act(() => drag.simulateBeginDrag([handlerId(second)], {}));
  act(() =>
    drag.simulateHover([handlerId(list)], { clientOffset: { x: 10, y: 25 } }),
  );
  expect(first).toHaveAttribute("data-insertion-edge", "before");
  expect(props.onMoveKey).not.toHaveBeenCalled();

  act(() => {
    drag.simulateDrop();
    drag.simulateEndDrag();
  });
  expect(props.onMoveKey).toHaveBeenCalledOnce();
  expect(props.onMoveKey).toHaveBeenCalledWith(lateral.id, 0);
  expect(first).not.toHaveAttribute("data-insertion-edge");
});

function createDragBackend() {
  const handlers = new Map<Element, string>();
  function connect(id: string, node: Element) {
    handlers.set(node, id);
    return () => {
      handlers.delete(node);
    };
  }

  let instance: TestBackendImpl;
  const backend: typeof TestBackend = (manager) => {
    instance = Object.assign(new TestBackendImpl(manager, {}), {
      connectDragSource: connect,
      connectDropTarget: connect,
    });
    return instance;
  };

  return {
    backend,
    getInstance: () => instance,
    handlerId(node: Element) {
      const id = handlers.get(node);
      if (!id) throw new Error("Expected a registered drag or drop handler");
      return id;
    },
  };
}
