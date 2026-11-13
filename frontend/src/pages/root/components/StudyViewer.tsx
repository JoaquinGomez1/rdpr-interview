import { useState } from "react";
import { imageSource, views } from "../study";
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

  return (
    <div className="viewer">
      <div className="view-title">
        <strong>{views[view]}</strong>
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
          src={imageSource(view)}
          alt={`AI-generated mock radiology image, ${views[view].toLowerCase()}`}
          onError={() => setFailedSelection(selection)}
        />
      </div>
    </div>
  );
}
