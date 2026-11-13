import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import './App.css'

const views = ['Frontal chest', 'Lateral chest', 'Oblique chest', 'Axial slice', 'Coronal slice']
const storageKey = 'radpair-annotation-experiment'
const limit = 15
const source = (view: number) => `${import.meta.env.BASE_URL}study/view-${view + 1}.png`

type Point = { x: number; y: number }
type Tool = 'arrow' | 'circle'
type ShapeMark = { id: string; tool: Tool; start: Point; end: Point; note?: string }
type Mark = ShapeMark | { id: string; tool: 'text'; start: Point; note: string }
type KeyImage = { id: string; view: number; caption: string; marks: Mark[] }
type Draft = { report: string; keys: KeyImage[] }
type StoredDraft = {
  report: string
  keys: (Omit<KeyImage, 'marks'> & { marks?: Mark[] })[]
  marks?: Record<number, Mark[]>
}

function cleanMarks(items: Mark[]): Mark[] {
  return items.flatMap((mark): Mark[] => {
    if (mark.note?.trim()) return [mark]
    if (mark.tool === 'text') return []
    const { note: _note, ...shape } = mark
    return [shape]
  })
}

function withoutEmptyNotes(draft: Draft): Draft {
  return { ...draft, keys: draft.keys.map(key => ({ ...key, marks: cleanMarks(key.marks) })) }
}

function readDraft(): Draft {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      const { report, keys, marks } = JSON.parse(saved) as StoredDraft
      const migratedViews = new Set<number>()
      return {
        report,
        keys: keys.map(key => {
          const legacyMarks = migratedViews.has(key.view) ? [] : (marks?.[key.view] ?? [])
          migratedViews.add(key.view)
          return { ...key, marks: cleanMarks([...(key.marks ?? []), ...legacyMarks]) }
        }),
      }
    }
  } catch {
    // The editor still works when browser storage is unavailable.
  }
  return { report: '', keys: [] }
}

function Shape({ mark, active, onEdit }: { mark: ShapeMark; active: boolean; onEdit?: () => void }) {
  const { start, end, tool } = mark
  const radius = Math.hypot(end.x - start.x, end.y - start.y)
  return (
    <g stroke={active ? '#ffe291' : '#68efcc'} strokeWidth="2.5" fill="none" onDoubleClick={onEdit}>
      {onEdit && (tool === 'arrow'
        ? <line className="marker-hit" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        : <circle className="marker-hit" cx={start.x} cy={start.y} r={radius} />)}
      {tool === 'arrow'
        ? <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd={active ? 'url(#active-tip)' : 'url(#tip)'} />
        : (
          <>
            <circle cx={start.x} cy={start.y} r={radius} />
            {!onEdit && <circle cx={start.x} cy={start.y} r="3" fill="#ffe291" stroke="none" />}
          </>
        )}
    </g>
  )
}

export default function App() {
  const [draft, setDraft] = useState(readDraft)
  const [view, setView] = useState(0)
  const [activeKey, setActiveKey] = useState<string>()
  const [tool, setTool] = useState<Tool>()
  const [selected, setSelected] = useState<string>()
  const [drawing, setDrawing] = useState<ShapeMark>()
  const [announcement, setAnnouncement] = useState('')
  const [storageError, setStorageError] = useState(false)
  const [failedView, setFailedView] = useState<number>()
  const [dragOver, setDragOver] = useState(false)
  const cards = useRef(new Map<string, HTMLLIElement>())
  const focusAfterMove = useRef<string | null>(null)
  const keyEntry = draft.keys.find(key => key.id === activeKey)
  const marks = keyEntry?.marks ?? []
  const existingPositions = draft.keys.flatMap((key, index) => key.view === view ? [index + 1] : [])
  const duplicateHint = existingPositions.length > 0
    ? `Already in the report as key image ${existingPositions.join(', ')}.`
    : ''
  const removalDialog = useRef<HTMLDialogElement>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Mark>()

  useEffect(() => {
    let failed = false
    try {
      localStorage.setItem(storageKey, JSON.stringify(withoutEmptyNotes(draft)))
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
    setTool(undefined)
    setSelected(undefined)
    setDrawing(undefined)
    setFailedView(undefined)
  }

  function updateMarks(update: (current: Mark[]) => Mark[]) {
    if (!activeKey) return
    setDraft(current => ({
      ...current,
      keys: current.keys.map(key => key.id === activeKey ? { ...key, marks: update(key.marks) } : key),
    }))
  }

  function point(event: MouseEvent<SVGSVGElement>, allowOutside = false): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    const scale = (value: number, origin: number, size: number) => {
      const coordinate = (value - origin) / size * 600
      return allowOutside ? coordinate : Math.max(0, Math.min(600, coordinate))
    }
    return { x: scale(event.clientX, rect.left, rect.width), y: scale(event.clientY, rect.top, rect.height) }
  }

  function addKey(index: number) {
    if (!Number.isInteger(index) || index < 0 || index >= views.length || draft.keys.length >= limit) return
    const id = crypto.randomUUID()
    const positions = draft.keys.flatMap((key, position) => key.view === index ? [position + 1] : [])
    setDraft(current => ({ ...current, keys: [...current.keys, { id, view: index, caption: '', marks: [] }] }))
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
              {keyEntry && failedView !== view && <svg viewBox="0 0 600 600" preserveAspectRatio="none" aria-hidden="true" className={tool ? "drawing-enabled" : undefined}
                onDoubleClick={event => {
                  if (event.target !== event.currentTarget) return
                  const id = crypto.randomUUID()
                  const start = point(event)
                  updateMarks(current => [...current, { id, tool: 'text', start, note: '' }])
                  setSelected(id)
                }}
                onPointerDown={event => {
                  if (!tool || event.target !== event.currentTarget || !event.isPrimary || event.button !== 0) return
                  event.currentTarget.setPointerCapture(event.pointerId)
                  const start = point(event)
                  setDrawing({ id: crypto.randomUUID(), tool, start, end: start, note: '' })
                }}
                onPointerMove={event => {
                  if (drawing && event.currentTarget.hasPointerCapture(event.pointerId)) {
                    setDrawing({ ...drawing, end: point(event, drawing.tool === 'circle') })
                  }
                }}
                onPointerUp={event => {
                  if (!drawing || !event.currentTarget.hasPointerCapture(event.pointerId)) return
                  const end = point(event, drawing.tool === 'circle')
                  setDrawing(undefined)
                  if (Math.hypot(end.x - drawing.start.x, end.y - drawing.start.y) < 6) return
                  updateMarks(current => [...current, { ...drawing, end }])
                  setSelected(drawing.id)
                }}
                onPointerCancel={() => setDrawing(undefined)}
                onLostPointerCapture={() => setDrawing(undefined)}>
                <defs>
                  <marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#68efcc" /></marker>
                  <marker id="active-tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#ffe291" /></marker>
                </defs>
                {marks.map(mark => mark.tool !== 'text' && <Shape key={mark.id} mark={mark} active={selected === mark.id} onEdit={() => setSelected(mark.id)} />)}
                {drawing && <Shape mark={drawing} active />}
              </svg>}
              {failedView !== view && marks.map(mark => {
                const { start, tool: shape } = mark
                const hasNote = Boolean(mark.note?.trim())
                if (shape === 'text' && !hasNote && selected !== mark.id) return null
                const x = mark.tool === 'arrow' ? (start.x + mark.end.x) / 2 : start.x
                const y = mark.tool === 'arrow' ? (start.y + mark.end.y) / 2 : start.y
                const radius = mark.tool === 'circle' ? Math.hypot(mark.end.x - start.x, mark.end.y - start.y) : 0
                const side = x <= 300 ? 'left' : 'right'
                const distance = side === 'left' ? x : 600 - x
                const horizontal = Math.min(55, (distance + radius) / 6)
                const markerName = shape === 'text' ? 'text note' : `${shape} marker`
                return (
                  <div key={mark.id} className={selected === mark.id ? 'mark-label editing' : 'mark-label'}
                    style={{ [side]: `calc(${horizontal}% + .35rem)`, [y <= 300 ? 'top' : 'bottom']: `${Math.min(y, 600 - y) / 6}%` }}>
                    {selected === mark.id ? (
                      <textarea autoFocus aria-label={`${shape} note`} value={mark.note ?? ''} rows={1} maxLength={240} placeholder="Add note…"
                        onChange={event => {
                          const note = event.target.value
                          updateMarks(current => current.map(item => item.id === mark.id ? { ...item, note } : item))
                        }}
                        onBlur={() => {
                          if (shape === 'text' && !hasNote) {
                            updateMarks(current => current.filter(item => item.id !== mark.id))
                          }
                          setSelected(current => current === mark.id ? undefined : current)
                        }}
                        onKeyDown={event => {
                          if (event.nativeEvent.isComposing) return
                          if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                            event.preventDefault()
                            event.currentTarget.blur()
                          }
                        }} />
                    ) : (
                      <button className="mark-note" aria-label={`Edit ${shape} note`}
                        title={hasNote ? undefined : 'Add note'}
                        onClick={event => { if (!hasNote || event.detail === 0) setSelected(mark.id) }}
                        onDoubleClick={() => setSelected(mark.id)}>
                        {hasNote ? mark.note : '✎'}
                      </button>
                    )}
                    {(shape !== 'text' || hasNote) && <button className="mark-remove" aria-label={`Remove ${markerName}`}
                      onMouseDown={event => { if (selected === mark.id) event.preventDefault() }}
                      onClick={() => {
                        setPendingRemoval(mark)
                        removalDialog.current?.showModal()
                      }}>×</button>}
                  </div>
                )
              })}
            </div>
            <div className="toolbar">
              {keyEntry ? (
                <>
                  <div className="annotation-tools" role="group" aria-label="Annotation tools">
                    <button aria-pressed={tool === 'arrow'} onClick={() => setTool(tool === 'arrow' ? undefined : 'arrow')}>↗ Arrow</button>
                    <button aria-pressed={tool === 'circle'} onClick={() => setTool(tool === 'circle' ? undefined : 'circle')}>○ Circle</button>
                  </div>
                  <p>{tool === 'circle' ? 'Press at the center and drag outward. ' : tool ? 'Drag to draw. ' : ''}Double-click the image to add text.</p>
                </>
              ) : (
                <p>{existingPositions.length ? 'Open a key image from the report to annotate it.' : 'Add this view as a key image to annotate it.'}</p>
              )}
            </div>
            <dialog className="marker-dialog" ref={removalDialog} aria-labelledby="remove-marker-title"
              onClose={() => setPendingRemoval(undefined)}>
              <form method="dialog">
                <h3 id="remove-marker-title">Remove {pendingRemoval?.tool === 'text' ? 'text note' : `${pendingRemoval?.tool} marker`}?</h3>
                <p>{pendingRemoval?.tool === 'text' ? 'This will remove the note from the image.' : 'This will remove the marker and its note.'}</p>
                <div className="dialog-actions">
                  <button autoFocus>Cancel</button>
                  <button type="button" className="confirm-remove" onClick={() => {
                    if (pendingRemoval) updateMarks(current => current.filter(mark => mark.id !== pendingRemoval.id))
                    removalDialog.current?.close()
                  }}>Remove</button>
                </div>
              </form>
            </dialog>
          </div>
          <div className="thumbs" aria-label="Study images">
            {views.map((name, index) => (
              <button key={name} aria-pressed={view === index} onClick={() => openView(index)} draggable
                onDragStart={event => event.dataTransfer.setData('application/x-study-view', String(index))}>
                <img src={source(index)} alt="" draggable={false} /><span>{name}</span>
              </button>
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
          <ol className={`key-list ${dragOver ? 'drop-active' : ''}`}
            onDragOver={event => {
              if (!event.dataTransfer.types.includes('application/x-study-view')) return
              event.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false) }}
            onDrop={event => {
              event.preventDefault()
              setDragOver(false)
              const value = event.dataTransfer.getData('application/x-study-view')
              if (value) addKey(Number(value))
            }}>
            {draft.keys.map((key, index) => (
              <li key={key.id} tabIndex={0} ref={node => { if (node) cards.current.set(key.id, node); else cards.current.delete(key.id) }}
                aria-label={`${views[key.view]}, key image ${index + 1}`} draggable
                onDragStart={event => event.dataTransfer.setData('application/x-key-image', key.id)}
                onDragOver={event => { if (event.dataTransfer.types.includes('application/x-key-image')) event.preventDefault() }}
                onDrop={event => {
                  const id = event.dataTransfer.getData('application/x-key-image')
                  if (id) { event.preventDefault(); event.stopPropagation(); moveKey(id, index) }
                }}
                onKeyDown={event => {
                  if (event.target !== event.currentTarget || !event.shiftKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
                  event.preventDefault()
                  moveKey(key.id, index + (event.key === 'ArrowLeft' ? -1 : 1), true)
                }}>
                <button className="key-preview" onClick={() => openView(key.view, key.id)}
                  aria-pressed={activeKey === key.id} aria-label={`View key image ${index + 1}, ${views[key.view]}`}><img src={source(key.view)} alt="" draggable={false} /></button>
                <div className="key-content">
                  <strong>{index + 1}. {views[key.view]}</strong>
                  <input aria-label={`Caption for key image ${index + 1}`} placeholder="Add a short caption…" maxLength={160} value={key.caption}
                    onChange={event => setDraft(current => ({ ...current, keys: current.keys.map(item => item.id === key.id ? { ...item, caption: event.target.value } : item) }))} />
                </div>
                <button aria-label={`Remove key image ${index + 1}`} onClick={() => {
                  if (activeKey === key.id) openView(key.view)
                  setDraft(current => ({ ...current, keys: current.keys.filter(item => item.id !== key.id) }))
                }}>×</button>
              </li>
            ))}
          </ol>
          {draft.keys.length === 0 && <p className="empty">No key images yet.</p>}
          <span className="sr-only" role="status">{announcement}</span>
        </section>
      </main>
    </>
  )
}
