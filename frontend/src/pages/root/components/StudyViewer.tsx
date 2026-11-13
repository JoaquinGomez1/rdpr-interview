import { useState } from "react";
import { useStudyImage } from "../study";
import type { ImageSelection } from "../study";

export function StudyViewer({
  selection,
  keyPosition,
}: {
  selection: ImageSelection;
  keyPosition: number;
}) {
  const [failedSelection, setFailedSelection] = useState<ImageSelection>();
  const { view } = selection;
  const image = useStudyImage(view);

  return (
    <div className="viewer">
      <div className="view-title">
        <strong>{image.name}</strong>
        {keyPosition > 0 && <span> · Key image {keyPosition}</span>}
      </div>
      <div className="image-frame">
        {failedSelection === selection && (
          <p className="image-error" role="alert">
            This view could not load.
          </p>
        )}
        <img
          key={view}
          src={image.src}
          alt={`AI-generated mock radiology image, ${image.name.toLowerCase()}`}
          onError={() => setFailedSelection(selection)}
        />
      </div>
    </div>
  );
}
