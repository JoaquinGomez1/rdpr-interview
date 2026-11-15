import { useDrag } from "react-dnd";
import { keyImageType, reportImageLoadError, useStudyImage } from "../study";
import type { KeyImage } from "../study";
import { KeyImageCaption } from "./KeyImageCaption";

export function KeyImageCard({
  image,
  index,
  selected,
  readOnly = false,
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
  readOnly?: boolean;
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
  const studyImage = useStudyImage(view);
  const { name: viewName, src } = studyImage;

  return (
    <li
      tabIndex={readOnly ? undefined : 0}
      ref={(node) => {
        if (!readOnly) drag(node);
        cardRef(node);
      }}
      aria-label={`${viewName}, key image ${position}`}
      data-dragging={dragging || undefined}
      data-insertion-edge={insertionEdge}
      onKeyDown={(event) => {
        if (
          readOnly ||
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
        <img
          src={src}
          alt=""
          draggable={false}
          onError={() => reportImageLoadError(studyImage)}
        />
      </button>
      <div className="key-content">
        <strong>
          {position}. {viewName}
        </strong>
        {readOnly ? (
          caption && <p className="key-caption">{caption}</p>
        ) : (
          <KeyImageCaption
            position={position}
            caption={caption}
            onChange={onCaptionChange}
          />
        )}
      </div>
      {!readOnly && (
        <button aria-label={`Remove key image ${position}`} onClick={onRemove}>
          ×
        </button>
      )}
    </li>
  );
}
