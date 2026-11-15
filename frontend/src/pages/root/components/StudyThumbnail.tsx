import { useDrag } from "react-dnd";
import { reportImageLoadError, studyImageType, useStudyImage } from "../study";

export function StudyThumbnail({
  index,
  selected,
  onOpen,
  readOnly = false,
}: {
  index: number;
  selected: boolean;
  onOpen: () => void;
  readOnly?: boolean;
}) {
  const image = useStudyImage(index);
  const [dragging, drag] = useDrag({
    type: studyImageType,
    item: { index },
    collect: (monitor) => monitor.isDragging(),
  });

  return (
    <button
      ref={(node) => {
        if (!readOnly) drag(node);
      }}
      data-dragging={dragging || undefined}
      aria-pressed={selected}
      onClick={onOpen}
    >
      <img
        src={image.src}
        alt=""
        draggable={false}
        onError={() => reportImageLoadError(image)}
      />
      <span>{image.name}</span>
    </button>
  );
}
