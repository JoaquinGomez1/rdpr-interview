import { useDrag } from "react-dnd";
import { imageSource, keyImageType, views } from "../study";
import type { KeyImage } from "../study";
import { KeyImageCaption } from "./KeyImageCaption";

export function KeyImageCard({
  image,
  index,
  selected,
  insertionEdge,
  cardRef,
  onMove,
  onOpen,
  onCaptionChange,
  onRemove,
}: {
  image: KeyImage;
  index: number;
  selected: boolean;
  insertionEdge?: "before" | "after";
  cardRef: (node: HTMLLIElement | null) => void;
  onMove: (destination: number) => void;
  onOpen: () => void;
  onCaptionChange: (caption: string) => void;
  onRemove: () => void;
}) {
  const { id, view, caption } = image;
  const [dragging, drag] = useDrag({
    type: keyImageType,
    item: { id },
    collect: (monitor) => monitor.isDragging(),
  });
  const position = index + 1;
  const viewName = views[view];

  return (
    <li
      tabIndex={0}
      ref={(node) => {
        drag(node);
        cardRef(node);
      }}
      aria-label={`${viewName}, key image ${position}`}
      data-dragging={dragging || undefined}
      data-insertion-edge={insertionEdge}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          !event.shiftKey ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        onMove(index + (event.key === "ArrowLeft" ? -1 : 1));
      }}
    >
      <button
        className="key-preview"
        onClick={onOpen}
        aria-pressed={selected}
        aria-label={`View key image ${position}, ${viewName}`}
      >
        <img src={imageSource(view)} alt="" draggable={false} />
      </button>
      <div className="key-content">
        <strong>{position}. {viewName}</strong>
        <KeyImageCaption
          position={position}
          caption={caption}
          onChange={onCaptionChange}
        />
      </div>
      <button aria-label={`Remove key image ${position}`} onClick={onRemove}>
        ×
      </button>
    </li>
  );
}
