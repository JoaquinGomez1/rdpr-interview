import { useDrag } from "react-dnd";
import { imageSource, studyImageType, views } from "../study";

export function StudyThumbnail({
  index,
  selected,
  onOpen,
}: {
  index: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const [dragging, drag] = useDrag({
    type: studyImageType,
    item: { index },
    collect: (monitor) => monitor.isDragging(),
  });

  return (
    <button
      ref={(node) => {
        drag(node);
      }}
      data-dragging={dragging || undefined}
      aria-pressed={selected}
      onClick={onOpen}
    >
      <img src={imageSource(index)} alt="" draggable={false} />
      <span>{views[index]}</span>
    </button>
  );
}
