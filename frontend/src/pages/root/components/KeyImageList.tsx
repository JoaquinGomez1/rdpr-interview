import { useEffect, useRef } from "react";
import { useDragLayer, useDrop } from "react-dnd";
import { keyImageLimit, keyImageType, studyImageType } from "../study";
import type { KeyImage } from "../study";
import { KeyImageCard } from "./KeyImageCard";

type ImageDrag = { index: number } | { id: string };

export type KeyImageListProps = {
  keys: KeyImage[];
  readOnly?: boolean;
  activeKey?: string;
  announcement: string;
  onAddKey: (view: number) => void;
  onOpenKey: (view: number, id: string) => void;
  onMoveKey: (id: string, destination: number) => boolean;
  onChangeCaption: (id: string, caption: string) => void;
  onRemoveKey: (id: string) => void;
};

export function KeyImageList({
  keys,
  readOnly = false,
  activeKey,
  announcement,
  onAddKey,
  onOpenKey,
  onMoveKey,
  onChangeCaption,
  onRemoveKey,
}: KeyImageListProps) {
  const cards = useRef(new Map<string, HTMLLIElement>());
  const list = useRef<HTMLOListElement>(null);
  const focusAfterMove = useRef<string | null>(null);

  useEffect(() => {
    if (focusAfterMove.current) {
      cards.current.get(focusAfterMove.current)?.focus();
    }
    focusAfterMove.current = null;
  }, [keys]);

  function getKeyMove(id: string, clientY: number) {
    const from = keys.findIndex((key) => key.id === id);
    const nextRow = keys.findIndex((key) => {
      const row = cards.current.get(key.id)?.getBoundingClientRect();
      return row !== undefined && clientY < row.top + row.height / 2;
    });
    const insertion = nextRow === -1 ? keys.length : nextRow;
    // The insertion index includes the source row, which is removed before moving.
    const destination = insertion > from ? insertion - 1 : insertion;
    if (from !== -1 && destination !== from) return { insertion, destination };
  }

  const [, dropImages] = useDrop<ImageDrag>({
    accept: [studyImageType, keyImageType],
    canDrop: (item) => "id" in item || keys.length < keyImageLimit,
    drop: (item, monitor) => {
      if ("index" in item) {
        onAddKey(item.index);
        return;
      }

      const pointer = monitor.getClientOffset();
      const move = pointer && getKeyMove(item.id, pointer.y);
      if (move) onMoveKey(item.id, move.destination);
    },
  });

  const insertionIndex = useDragLayer((monitor) => {
    const pointer = monitor.getClientOffset();
    if (
      !pointer ||
      !list.current?.contains(document.elementFromPoint(pointer.x, pointer.y))
    )
      return;
    if (monitor.getItemType() === studyImageType) {
      if (keys.length < keyImageLimit) return keys.length;
      return;
    }
    if (monitor.getItemType() !== keyImageType) return;

    const { id } = monitor.getItem<{ id: string }>();
    return getKeyMove(id, pointer.y)?.insertion;
  });

  return (
    <>
      <div className="section-head key-heading">
        <h3>Key images</h3>
        <span>
          {keys.length} / {keyImageLimit}
        </span>
      </div>
      {!readOnly && (
        <p id="key-help">
          {keys.length >= keyImageLimit
            ? "Limit reached. Remove a key image to add another."
            : "Drag in a study image or use Add key image."}
        </p>
      )}
      {!readOnly && keys.length > 1 && (
        <p id="reorder-help">
          Drag to reorder, or Tab to a key image and press Shift + ← or Shift +
          →.
        </p>
      )}
      <ol
        ref={(node) => {
          list.current = node;
          if (!readOnly) dropImages(node);
        }}
        className="key-list"
        data-drop-active={insertionIndex !== undefined || undefined}
      >
        {keys.map((key, index) => {
          let insertionEdge: "before" | "after" | undefined;
          if (insertionIndex === index) insertionEdge = "before";
          if (insertionIndex === keys.length && index === keys.length - 1)
            insertionEdge = "after";

          return (
            <KeyImageCard
              key={key.id}
              image={key}
              index={index}
              readOnly={readOnly}
              selected={activeKey === key.id}
              insertionEdge={insertionEdge}
              cardRef={(node) => {
                if (node) cards.current.set(key.id, node);
                else cards.current.delete(key.id);
              }}
              onMove={(destination) => {
                if (onMoveKey(key.id, destination))
                  focusAfterMove.current = key.id;
              }}
              onOpen={() => onOpenKey(key.view, key.id)}
              onCaptionChange={(caption) => onChangeCaption(key.id, caption)}
              onRemove={() => onRemoveKey(key.id)}
            />
          );
        })}
      </ol>
      {keys.length === 0 && <p className="empty">No key images yet.</p>}
      <span className="sr-only" role="status">
        {announcement}
      </span>
    </>
  );
}
