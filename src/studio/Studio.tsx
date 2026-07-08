import { useEffect, useMemo, useRef, useState } from 'react'
import { buildScalePool, KEY_NAMES, SCALE_LABELS, type ScaleName } from '../audio/scales'
import { BASE_MIDI, DRUM_SOUNDS, noteName, POOL_OCTAVES, SYNTH_ARCHETYPES } from './sounds'
import { StudioEngine } from './StudioEngine'
import { useStudio } from './useStudio'
import { STEPS, type StudioGenre, type Track } from './types'
import './studio.css'

const SCALE_NAMES = Object.keys(SCALE_LABELS) as ScaleName[]

interface StudioProps {
  onClose: () => void
}

/** The full-screen beat station. Mounted only while open, so its engine is scoped to it. */
export function Studio({ onClose }: StudioProps) {
  const studio = useStudio()
  const { current } = studio

  const engineRef = useRef<StudioEngine | null>(null)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(-1)
  const [volume, setVolume] = useState(0.8)
  const [mutes, setMutes] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const engine = new StudioEngine()
    engineRef.current = engine
    engine.setVolume(volume)
    const unsub = engine.onStep(setStep)
    return () => {
      unsub()
      engine.dispose()
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the engine's live snapshot in step with every edit.
  useEffect(() => {
    if (current) engineRef.current?.sync(current)
  }, [current])

  // Esc closes the station.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const togglePlay = async () => {
    const engine = engineRef.current
    if (!engine || busy || !current) return
    if (playing) {
      engine.stop()
      setPlaying(false)
      setStep(-1)
      return
    }
    setBusy(true)
    try {
      engine.sync(current)
      await engine.start()
      setPlaying(true)
    } finally {
      setBusy(false)
    }
  }

  const handleVolume = (v: number) => {
    setVolume(v)
    engineRef.current?.setVolume(v)
  }

  const toggleMute = (trackId: string) => {
    const next = !mutes[trackId]
    setMutes((m) => ({ ...m, [trackId]: next }))
    engineRef.current?.setMute(trackId, next)
  }

  const addDrum = (sound: Parameters<typeof studio.addDrumTrack>[0]) => {
    const track = studio.addDrumTrack(sound)
    engineRef.current?.preview(track)
  }
  const addSynth = (archetype: Parameters<typeof studio.addSynthTrack>[0]) => {
    const track = studio.addSynthTrack(archetype)
    engineRef.current?.preview(track)
  }

  // Note names selectable on a synth lane, derived from the genre's key & scale.
  const notePool = useMemo(() => {
    if (!current) return []
    const pool = buildScalePool(BASE_MIDI + current.root, current.scale, POOL_OCTAVES)
    return pool.map((midi, i) => ({ degree: i, label: noteName(midi) }))
  }, [current?.root, current?.scale])

  if (!current) return null

  return (
    <div className="studio" role="dialog" aria-modal="true" aria-label="Motherload beat station">
      <div className="studio__panel">
        <header className="studio__head">
          <div className="studio__brand">
            <span className="studio__kicker">Motherload</span>
            <h2 className="studio__title">Beat Station</h2>
          </div>
          <button type="button" className="studio__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <GenreBar studio={studio} />

        <div className="studio__transport">
          <button
            type="button"
            className="studio__play"
            data-state={busy ? 'busy' : playing ? 'playing' : 'idle'}
            onClick={togglePlay}
          >
            {playing ? '■ Stop' : '▶ Play'}
          </button>

          <label className="studio__field">
            <span>Tempo</span>
            <input
              type="range" min={60} max={180} step={1}
              value={current.bpm}
              onChange={(e) => studio.setBpm(Number(e.target.value))}
            />
            <em>{current.bpm}</em>
          </label>

          <label className="studio__field">
            <span>Swing</span>
            <input
              type="range" min={0} max={0.5} step={0.02}
              value={current.swing}
              onChange={(e) => studio.setSwing(Number(e.target.value))}
            />
            <em>{Math.round(current.swing * 100)}</em>
          </label>

          <label className="studio__field">
            <span>Key</span>
            <select value={current.root} onChange={(e) => studio.setRoot(Number(e.target.value))}>
              {KEY_NAMES.map((name, pc) => (
                <option key={pc} value={pc}>{name}</option>
              ))}
            </select>
          </label>

          <label className="studio__field">
            <span>Scale</span>
            <select value={current.scale} onChange={(e) => studio.setScale(e.target.value as ScaleName)}>
              {SCALE_NAMES.map((name) => (
                <option key={name} value={name}>{SCALE_LABELS[name]}</option>
              ))}
            </select>
          </label>

          <label className="studio__field">
            <span>Volume</span>
            <input
              type="range" min={0} max={1} step={0.01}
              value={volume}
              onChange={(e) => handleVolume(Number(e.target.value))}
            />
          </label>
        </div>

        <Grid
          genre={current}
          step={step}
          mutes={mutes}
          notePool={notePool}
          onToggleStep={studio.toggleStep}
          onClearTrack={studio.clearTrack}
          onRemoveTrack={studio.removeTrack}
          onToggleMute={toggleMute}
          onSetDegree={studio.setDegree}
        />

        <div className="studio__palette">
          <span className="studio__palette-label">Add lane</span>
          <div className="studio__palette-row">
            {DRUM_SOUNDS.map((d) => (
              <button key={d.sound} type="button" className="studio__chip" onClick={() => addDrum(d.sound)}>
                + {d.label}
              </button>
            ))}
            {SYNTH_ARCHETYPES.map((s) => (
              <button key={s.archetype} type="button" className="studio__chip studio__chip--synth" onClick={() => addSynth(s.archetype)}>
                + {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Genre bar ───────────────────────────────────────────────────────────────

function GenreBar({ studio }: { studio: ReturnType<typeof useStudio> }) {
  const { genres, current, selectGenre, createGenre, deleteGenre, setName } = studio
  return (
    <div className="studio__genres">
      <div className="studio__genre-tabs">
        {genres.map((g) => (
          <button
            key={g.id}
            type="button"
            className="studio__genre-tab"
            data-active={g.id === current?.id}
            onClick={() => selectGenre(g.id)}
          >
            {g.name}
          </button>
        ))}
        <button type="button" className="studio__genre-new" onClick={createGenre} title="New genre">
          + New
        </button>
      </div>
      {current && (
        <div className="studio__genre-edit">
          <input
            className="studio__name"
            value={current.name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Genre name"
          />
          <button
            type="button"
            className="studio__delete"
            onClick={() => deleteGenre(current.id)}
            disabled={genres.length <= 1}
            title={genres.length <= 1 ? 'Keep at least one genre' : 'Delete this genre'}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}

// ── Grid ──────────────────────────────────────────────────────────────────

interface GridProps {
  genre: StudioGenre
  step: number
  mutes: Record<string, boolean>
  notePool: { degree: number; label: string }[]
  onToggleStep: (trackId: string, step: number) => void
  onClearTrack: (trackId: string) => void
  onRemoveTrack: (trackId: string) => void
  onToggleMute: (trackId: string) => void
  onSetDegree: (trackId: string, degree: number) => void
}

function Grid({
  genre, step, mutes, notePool,
  onToggleStep, onClearTrack, onRemoveTrack, onToggleMute, onSetDegree,
}: GridProps) {
  return (
    <div className="studio__grid">
      {genre.tracks.map((track) => (
        <Row
          key={track.id}
          track={track}
          row={genre.pattern[track.id] ?? []}
          step={step}
          muted={!!mutes[track.id]}
          notePool={notePool}
          onToggleStep={onToggleStep}
          onClearTrack={onClearTrack}
          onRemoveTrack={onRemoveTrack}
          onToggleMute={onToggleMute}
          onSetDegree={onSetDegree}
        />
      ))}
      {genre.tracks.length === 0 && (
        <p className="studio__empty">No lanes yet — add one below to start building.</p>
      )}
    </div>
  )
}

interface RowProps extends Omit<GridProps, 'genre' | 'mutes'> {
  track: Track
  row: boolean[]
  muted: boolean
}

function Row({
  track, row, step, muted, notePool,
  onToggleStep, onClearTrack, onRemoveTrack, onToggleMute, onSetDegree,
}: RowProps) {
  return (
    <div className="studio__row" data-muted={muted}>
      <div className="studio__lane">
        <button
          type="button"
          className="studio__mute"
          data-muted={muted}
          onClick={() => onToggleMute(track.id)}
          title={muted ? 'Unmute' : 'Mute'}
        >
          {track.label}
        </button>
        {track.kind === 'synth' && (
          <select
            className="studio__note"
            value={track.degree}
            onChange={(e) => onSetDegree(track.id, Number(e.target.value))}
            aria-label={`${track.label} note`}
          >
            {notePool.map((n) => (
              <option key={n.degree} value={n.degree}>{n.label}</option>
            ))}
          </select>
        )}
        <button type="button" className="studio__icon" onClick={() => onClearTrack(track.id)} title="Clear lane">⌫</button>
        <button type="button" className="studio__icon" onClick={() => onRemoveTrack(track.id)} title="Remove lane">✕</button>
      </div>
      <div className="studio__steps">
        {Array.from({ length: STEPS }, (_, i) => (
          <button
            key={i}
            type="button"
            className="studio__cell"
            data-on={!!row[i]}
            data-beat={i % 4 === 0}
            data-playhead={i === step}
            onClick={() => onToggleStep(track.id, i)}
            aria-label={`${track.label} step ${i + 1}`}
            aria-pressed={!!row[i]}
          />
        ))}
      </div>
    </div>
  )
}
