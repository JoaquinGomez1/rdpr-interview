import { useEffect, useRef, useState } from 'react'
import { useDrag, useDrop } from "react-dnd";
import type { ReactNode } from 'react'
import './App.css'

const views = ['Frontal chest', 'Lateral chest', 'Oblique chest', 'Axial slice', 'Coronal slice']
const storageKey = 'radpair-report-draft'
const legacyStorageKey = 'radpair-annotation-experiment'
const limit = 15
const source = (view: number) => `${import.meta.env.BASE_URL}study/view-${view + 1}.png`

type KeyImage = { id: string; view: number; caption: string }
type Draft = { report: string; keys: KeyImage[] }

function readDraft(): Draft {
  try {
    const saved =
      localStorage.getItem(storageKey) ?? localStorage.getItem(legacyStorageKey)
    if (saved) {
      const { report, keys } = JSON.parse(saved) as Draft
      return {
        report,
        keys: keys.map(({ id, view, caption }) => ({ id, view, caption })),
      }
    }
  } catch {
    // The editor still works when browser storage is unavailable.
  }
  return { report: '', keys: [] }
}

const studyImageType = "study-image";
const keyImageType = "key-image";

function StudyThumbnail({ index, selected, onOpen }: {
  index: number;
  selected: boolean;
  onOpen: () => void;
}) {
  const [, drag] = useDrag({ type: studyImageType, item: { index } });
  return (
    <button ref={(node) => { drag(node); }} aria-pressed={selected} onClick={onOpen}>
      <img src={source(index)} alt="" draggable={false} />
      <span>{views[index]}</span>
    </button>
  );
}

function KeyImageCard({ id, index, label, cardRef, onMove, children }: {
  id: string;
  index: number;
  label: string;
  cardRef: (node: HTMLLIElement | null) => void;
  onMove: (id: string, destination: number, focus?: boolean) => void;
  children: ReactNode;
}) {
  const [, drag] = useDrag({ type: keyImageType, item: { id } });
  const [, drop] = useDrop<{ id: string }>({
    accept: keyImageType,
    drop: (item) => { onMove(item.id, index); },
  });
  return (
    <li
      tabIndex={0}
      ref={(node) => { drag(drop(node)); cardRef(node); }}
      aria-label={label}
      onKeyDown={(event) => {
        if (
          event.target !== event.currentTarget ||
          !event.shiftKey ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        ) return;
        event.preventDefault();
        onMove(id, index + (event.key === "ArrowLeft" ? -1 : 1), true);
      }}
    >
      {children}
    </li>
  );
}

export default function App() {
  const [draft, setDraft] = useState(readDraft)
  const [view, setView] = useState(0)
  const [activeKey, setActiveKey] = useState<string>()
  const [editingCaption, setEditingCaption] = useState<string>()
  const [announcement, setAnnouncement] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [failedView, setFailedView] = useState<number>()
  const cards = useRef(new Map<string, HTMLLIElement>())
  const focusAfterMove = useRef<string | null>(null)
  const keyEntry = draft.keys.find(key => key.id === activeKey)
  const existingPositions = draft.keys.flatMap((key, index) => key.view === view ? [index + 1] : [])
  const duplicateHint = existingPositions.length > 0
    ? `Already in the report as key image ${existingPositions.join(', ')}.`
    : ''

  useEffect(() => {
    let failed = false
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft))
      localStorage.removeItem(legacyStorageKey)
    } catch {
      failed = true
    }
    // Report the result of writing to browser storage.
    // oxlint-disable-next-line react/set-state-in-effect
    setStorageError(failed)
  }, [draft])

  useEffect(() => {
    if (focusAfterMove.current) cards.current.get(focusAfterMove.current)?.focus()
    focusAfterMove.current = null
  }, [draft.keys])

  function openView(index: number, keyId?: string) {
    setView(index)
    setActiveKey(keyId)
    setFailedView(undefined)
  }

  function addKey(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= views.length || draft.keys.length >= limit) return
    const id = crypto.randomUUID()
    const positions = draft.keys.flatMap((key, position) => key.view === index ? [position + 1] : [])
    setDraft(current => ({ ...current, keys: [...current.keys, { id, view: index, caption: '' }] }))
    openView(index, id)
    setAnnouncement(positions.length
      ? `${views[index]} added again. Already in the report as key image ${positions.join(', ')}.`
      : `${views[index]} added to key images.`)
  }

  function moveKey(id: string, destination: number, focus = false) {
    const from = draft.keys.findIndex(key => key.id === id)
    if (from < 0 || destination < 0 || destination >= draft.keys.length || from === destination) return
    const keys = [...draft.keys]
    const [entry] = keys.splice(from, 1)
    keys.splice(destination, 0, entry)
    if (focus) focusAfterMove.current = id
    setDraft(current => ({ ...current, keys }))
    setAnnouncement(`Moved to position ${destination + 1} of ${keys.length}.`)
  }

  const [{ dragOver }, dropStudyImage] = useDrop<{ index: number }, void, { dragOver: boolean }>({
    accept: studyImageType,
    canDrop: () => draft.keys.length < limit,
    drop: ({ index }) => { addKey(index); },
    collect: (monitor) => ({ dragOver: monitor.isOver() && monitor.canDrop() }),
  });

  return (
    <>
      <header className="masthead">
        <div><span className="brand">RADPAIR</span><h1>Study reporting</h1></div>
        <span className="status" role="status">{storageError ? 'Draft could not be saved locally' : 'Draft saved on this device'}</span>
      </header>

      <main className="workspace">
        <section className="study panel" aria-labelledby="study-title">
          <div className="section-head">
            <div><h2 id="study-title">Chest study</h2><p>5 synthetic views</p></div>
          </div>
          <div className="viewer">
            <div className="view-title"><strong>{views[view]}</strong>
              {keyEntry && <span> · Key image {draft.keys.indexOf(keyEntry) + 1}</span>}
            </div>
            <div className="image-frame">
              {failedView === view && <p className="image-error" role="alert">This view could not load.</p>}
              <img key={view} src={source(view)} alt={`AI-generated mock radiology image, ${views[view].toLowerCase()}`} onError={() => setFailedView(view)} />
            </div>
          </div>
          <div className="thumbs" aria-label="Study images">
            {views.map((name, index) => (
              <StudyThumbnail key={name} index={index} selected={view === index} onOpen={() => openView(index)} />
            ))}
          </div>
          <div className="study-actions">
            <div className="add-key">
              <button className="accent" disabled={draft.keys.length >= limit}
                aria-describedby={duplicateHint ? 'duplicate-key-hint' : undefined}
                onClick={() => addKey(view)}>+ Add key image</button>
              {duplicateHint && <span id="duplicate-key-hint" role="tooltip">{duplicateHint}</span>}
            </div>
          </div>
        </section>

        <section className="panel report" aria-labelledby="report-title">
          <div className="section-head"><h2 id="report-title">Report</h2></div>
          <label htmlFor="report-text">Report text</label>
          <textarea id="report-text" className="report-text" placeholder="Describe your findings and impression…" value={draft.report}
            onChange={event => setDraft(current => ({ ...current, report: event.target.value }))} />
          <div className="section-head key-heading"><h3>Key images</h3><span>{draft.keys.length} / {limit}</span></div>
          <p id="key-help">{draft.keys.length >= limit ? 'Limit reached. Remove a key image to add another.' : 'Drag in a study image or use Add key image.'}</p>
          {draft.keys.length > 1 && <p id="reorder-help">Drag to reorder, or Tab to a key image and press Shift + ← or Shift + →.</p>}
          <ol ref={(node) => { dropStudyImage(node); }}
            className={`key-list ${dragOver ? "drop-active" : ""}`}>
            {draft.keys.map((key, index) => (
              <KeyImageCard
                key={key.id}
                id={key.id}
                index={index}
                label={`${views[key.view]}, key image ${index + 1}`}
                onMove={moveKey}
                cardRef={(node) => {
                  if (node) cards.current.set(key.id, node);
                  else cards.current.delete(key.id);
                }}
              >
                <button className="key-preview" onClick={() => openView(key.view, key.id)}
                  aria-pressed={activeKey === key.id} aria-label={`View key image ${index + 1}, ${views[key.view]}`}><img src={source(key.view)} alt="" draggable={false} /></button>
                <div className="key-content">
                  <strong>{index + 1}. {views[key.view]}</strong>
                  {editingCaption === key.id ? (
                    <input autoFocus aria-label={`Caption for key image ${index + 1}`} placeholder="Add a short caption…" maxLength={160} value={key.caption}
                      onChange={event => setDraft(current => ({ ...current, keys: current.keys.map(item => item.id === key.id ? { ...item, caption: event.target.value } : item) }))}
                      onBlur={() => setEditingCaption(current => current === key.id ? undefined : current)} />
                  ) : (
                    <p className="key-caption" role="button" tabIndex={0} aria-label={`Edit caption for key image ${index + 1}`}
                      onClick={() => setEditingCaption(key.id)}
                      onKeyDown={event => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setEditingCaption(key.id)
                        }
                      }}>
                      {key.caption || 'Add a short caption…'}
                    </p>
                  )}
                </div>
                <button aria-label={`Remove key image ${index + 1}`} onClick={() => {
                  if (activeKey === key.id) openView(key.view)
                  setDraft(current => ({ ...current, keys: current.keys.filter(item => item.id !== key.id) }))
                }}>×</button>
              </KeyImageCard>
            ))}
          </ol>
          {draft.keys.length === 0 && <p className="empty">No key images yet.</p>}
          <span className="sr-only" role="status">{announcement}</span>
        </section>
      </main>
    </>
  )
}
