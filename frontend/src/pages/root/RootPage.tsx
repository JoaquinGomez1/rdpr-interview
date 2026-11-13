import { useState } from "react";
import { ReportPanel } from "./components/ReportPanel";
import { StudyPanel } from "./components/StudyPanel";
import { keyImageLimit, keyImagePositions, views } from "./study";
import type { ImageSelection } from "./study";
import { useReportDraft } from "./useReportDraft";
import "./RootPage.css";

export default function RootPage() {
  const { draft, setDraft, storageError } = useReportDraft();
  const [selection, setSelection] = useState<ImageSelection>({ view: 0 });
  const [announcement, setAnnouncement] = useState("");
  const { keys, report } = draft;

  function openView(view: number, keyId?: string) {
    setSelection({ view, keyId });
  }

  function addKey(view: number) {
    if (
      !Number.isInteger(view) ||
      view < 0 ||
      view >= views.length ||
      keys.length >= keyImageLimit
    )
      return;

    const id = crypto.randomUUID();
    const positions = keyImagePositions(keys, view);
    setDraft((current) => ({
      ...current,
      keys: [...current.keys, { id, view, caption: "" }],
    }));
    openView(view, id);
    setAnnouncement(
      positions.length
        ? `${views[view]} added again. Already in the report as key image ${positions.join(", ")}.`
        : `${views[view]} added to key images.`,
    );
  }

  function moveKey(id: string, destination: number) {
    const from = keys.findIndex((key) => key.id === id);
    if (
      from < 0 ||
      destination < 0 ||
      destination >= keys.length ||
      from === destination
    )
      return false;

    const reordered = [...keys];
    const [entry] = reordered.splice(from, 1);
    reordered.splice(destination, 0, entry);
    setDraft((current) => ({ ...current, keys: reordered }));
    setAnnouncement(`Moved to position ${destination + 1} of ${keys.length}.`);
    return true;
  }

  function changeCaption(id: string, caption: string) {
    setDraft((current) => ({
      ...current,
      keys: current.keys.map((key) => (key.id === id ? { ...key, caption } : key)),
    }));
  }

  function removeKey(id: string) {
    if (selection.keyId === id) openView(selection.view);
    setDraft((current) => ({
      ...current,
      keys: current.keys.filter((key) => key.id !== id),
    }));
  }

  return (
    <>
      <header className="masthead">
        <div>
          <span className="brand">RADPAIR</span>
          <h1>Study reporting</h1>
        </div>
        <span className="status" role="status">
          {storageError
            ? "Draft could not be saved locally"
            : "Draft saved on this device"}
        </span>
      </header>
      <main className="workspace">
        <StudyPanel
          selection={selection}
          keys={keys}
          onOpenView={openView}
          onAddKey={addKey}
        />
        <ReportPanel
          report={report}
          onReportChange={(report) =>
            setDraft((current) => ({ ...current, report }))
          }
          keys={keys}
          activeKey={selection.keyId}
          announcement={announcement}
          onAddKey={addKey}
          onOpenKey={openView}
          onMoveKey={moveKey}
          onChangeCaption={changeCaption}
          onRemoveKey={removeKey}
        />
      </main>
    </>
  );
}
