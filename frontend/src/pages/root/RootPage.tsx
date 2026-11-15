import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { showErrorToast } from "../../components/errorToast";
import { ReportPanel } from "./components/ReportPanel";
import { StudyPanel } from "./components/StudyPanel";
import { keyImageLimit, keyImagePositions, StudyImages } from "./study";
import type { ImageSelection } from "./study";
import { useReportDraft } from "./useReportDraft";
import { loadReport, loadStudy, ReportApiError, saveReport } from "./reportApi";
import type { Draft, SavedReport, Study } from "./reportApi";
import type { StudyImage } from "./study";
import "./RootPage.css";

export default function RootPage({ reportId }: { reportId?: string }) {
  const [result, setResult] = useState<Study | SavedReport>();
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const toastId = `load-report:${reportId ?? "study"}:${attempt}`;
    const loading = reportId
      ? loadReport(reportId, controller.signal)
      : loadStudy(controller.signal);
    loading.then(setResult, (error) => {
      if (!controller.signal.aborted) {
        setLoadFailed(true);
        showErrorToast(
          error instanceof ReportApiError
            ? error
            : { message: "The reporting service could not be reached. Try again." },
          toastId,
        );
      }
    });
    return () => {
      controller.abort();
      toast.dismiss(toastId);
    };
  }, [attempt, reportId]);

  if (result && result.images.length) {
    return (
      <StudyImages.Provider value={result.images}>
        {"draftId" in result ? <StudyEditor study={result} /> :
          <ReportWorkspace draft={result} images={result.images} />}
      </StudyImages.Provider>
    );
  }

  return (
    <main className="masthead">
      <div>
        <h1>Study reporting</h1>
        {loadFailed ? (
          <button
            onClick={() => {
              setLoadFailed(false);
              setAttempt((current) => current + 1);
            }}
          >
            Retry
          </button>
        ) : (
          <p role="status">
            {result
              ? "No study images available."
              : reportId
                ? "Loading report…"
                : "Loading study…"}
          </p>
        )}
        {reportId && <Link to="/">New report</Link>}
      </div>
    </main>
  );
}

function StudyEditor({ study }: { study: Study }) {
  const editor = useReportDraft(study);
  return <ReportWorkspace draft={editor.draft} images={study.images} editor={editor} />;
}

function ReportWorkspace({ draft, images, editor }: {
  draft: Draft;
  images: StudyImage[];
  editor?: ReturnType<typeof useReportDraft>;
}) {
  const navigate = useNavigate();
  const dialog = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<ImageSelection>({ view: images[0].view });
  const [announcement, setAnnouncement] = useState("");
  const [saving, setSaving] = useState(false);
  const { keys, report } = draft;

  async function submit(validDraft: Draft) {
    if (!editor || saving) return;
    setSaving(true);
    try {
      const saved = await saveReport(validDraft);
      toast.dismiss("save-report");
      editor.clearDraft();
      navigate(`/${saved.id}`, { replace: true });
    } catch (error) {
      showErrorToast(
        error instanceof ReportApiError
          ? error
          : { message: "The report could not be submitted. Try again." },
        "save-report",
      );
    } finally {
      setSaving(false);
    }
  }

  function openView(view: number, keyId?: string) {
    setSelection({ view, keyId });
  }

  function addKey(view: number) {
    const image = images.find((image) => image.view === view);
    if (!editor || saving || !image || keys.length >= keyImageLimit) return;

    const id = crypto.randomUUID();
    const positions = keyImagePositions(keys, view);
    editor.setDraft((current) => ({
      ...current,
      keys: [...current.keys, { id, view, caption: "" }],
    }));
    openView(view, id);
    setAnnouncement(
      positions.length
        ? `${image.name} added again. Already in the report as key image ${positions.join(", ")}.`
        : `${image.name} added to key images.`,
    );
  }

  function moveKey(id: string, destination: number) {
    const from = keys.findIndex((key) => key.id === id);
    if (
      !editor || saving ||
      from < 0 ||
      destination < 0 ||
      destination >= keys.length ||
      from === destination
    )
      return false;

    const reordered = [...keys];
    const [entry] = reordered.splice(from, 1);
    reordered.splice(destination, 0, entry);
    editor.setDraft((current) => ({ ...current, keys: reordered }));
    setAnnouncement(`Moved to position ${destination + 1} of ${keys.length}.`);
    return true;
  }

  function changeCaption(id: string, caption: string) {
    editor?.setDraft((current) => ({
      ...current,
      keys: current.keys.map((key) => (key.id === id ? { ...key, caption } : key)),
    }));
  }

  function removeKey(id: string) {
    if (selection.keyId === id) openView(selection.view);
    editor?.setDraft((current) => ({
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
          {editor ? (editor.dirty ? editor.storageError ? "Draft could not be saved locally" : "Draft saved on this device" : "") : "Saved report · Read-only"}
        </span>
      </header>
      <main className="workspace" data-read-only={!editor || undefined}>
        <StudyPanel
          selection={selection}
          keys={keys}
          onOpenView={openView}
          onAddKey={addKey}
          saving={saving}
          readOnly={!editor}
        />
        <ReportPanel
          report={report}
          onReportChange={(report) =>
            editor?.setDraft((current) => ({ ...current, report }))
          }
          keys={keys}
          activeKey={selection.keyId}
          announcement={announcement}
          onAddKey={addKey}
          onOpenKey={openView}
          onMoveKey={moveKey}
          onChangeCaption={changeCaption}
          onRemoveKey={removeKey}
          submit={editor?.handleSubmit(() => dialog.current?.showModal())}
          saving={saving}
          canSave={editor?.isValid ?? false}
          validationMessage={editor?.validationMessage}
          readOnly={!editor}
        />
      </main>
      {editor && (
        <dialog className="panel save-dialog" ref={dialog} aria-labelledby="save-title" aria-describedby="save-description">
          <h2 id="save-title">Save report?</h2>
          <p id="save-description">This report will be read-only after you save it.</p>
          <form method="dialog" className="dialog-actions">
            <button autoFocus>Cancel</button>
            <button type="button" className="accent" onClick={() => {
              dialog.current?.close();
              void editor.handleSubmit(submit)();
            }}>Save report</button>
          </form>
        </dialog>
      )}
    </>
  );
}
