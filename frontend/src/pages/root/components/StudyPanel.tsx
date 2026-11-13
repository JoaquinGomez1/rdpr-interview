import { keyImageLimit, keyImagePositions, views } from "../study";
import type { ImageSelection, KeyImage } from "../study";
import { StudyThumbnail } from "./StudyThumbnail";
import { StudyViewer } from "./StudyViewer";

export function StudyPanel({
  selection,
  keys,
  onOpenView,
  onAddKey,
}: {
  selection: ImageSelection;
  keys: KeyImage[];
  onOpenView: (view: number) => void;
  onAddKey: (view: number) => void;
}) {
  const { view, keyId } = selection;
  const keyPosition = keys.findIndex((key) => key.id === keyId) + 1;
  const existingPositions = keyImagePositions(keys, view);

  return (
    <section className="study panel" aria-labelledby="study-title">
      <div className="section-head">
        <div>
          <h2 id="study-title">Chest study</h2>
          <p>{views.length} synthetic views</p>
        </div>
      </div>
      <StudyViewer selection={selection} keyPosition={keyPosition} />
      <div className="thumbs" aria-label="Study images">
        {views.map((name, index) => (
          <StudyThumbnail
            key={name}
            index={index}
            selected={view === index}
            onOpen={() => onOpenView(index)}
          />
        ))}
      </div>
      <div className="study-actions">
        <div className="add-key">
          <button
            className="accent"
            disabled={keys.length >= keyImageLimit}
            aria-describedby={existingPositions.length ? "duplicate-key-hint" : undefined}
            onClick={() => onAddKey(view)}
          >
            + Add key image
          </button>
          {existingPositions.length > 0 && (
            <span id="duplicate-key-hint" role="tooltip">
              Already in the report as key image {existingPositions.join(", ")}.
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
