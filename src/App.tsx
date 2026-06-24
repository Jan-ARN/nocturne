import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AudioEngine, type TrackInfo } from './audio/AudioEngine'
import { Soundscape } from './visual/Soundscape'
import { GENRES, LAYERS, type GenreId, type Layer } from './audio/genres'
import { pitchClassOf } from './audio/scales'
import { PlayButton } from './components/PlayButton'
import { GenreTabs } from './components/GenreTabs'
import { PresetPicker } from './components/PresetPicker'
import { NowPlaying } from './components/NowPlaying'
import { Macros } from './components/Macros'
import { Shape } from './components/Shape'
import { DEFAULT_PRESET, PRESETS, presetsByGenre, type Preset } from './presets/presets'

// While Auto is on, reshuffle to fresh material on this cadence so a long session
// keeps moving without a click.
const AUTO_EVOLVE_MS = 95_000

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

function noMutes(): Record<Layer, boolean> {
  return Object.fromEntries(LAYERS.map((l) => [l, false])) as Record<Layer, boolean>
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const sceneRef = useRef<Soundscape | null>(null)

  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [auto, setAuto] = useState(false)

  const [volume, setVolume] = useState(0.7)
  const [density, setDensity] = useState(DEFAULT_PRESET.density)
  const [space, setSpace] = useState(DEFAULT_PRESET.space)
  const [tempo, setTempo] = useState(DEFAULT_PRESET.bpm)
  const [swing, setSwing] = useState(GENRES[DEFAULT_PRESET.genre].swing)
  const [keyPitch, setKeyPitch] = useState(pitchClassOf(DEFAULT_PRESET.root))
  const [muted, setMuted] = useState<Record<Layer, boolean>>(noMutes)
  const [section, setSection] = useState('')
  const [trackInfo, setTrackInfo] = useState<TrackInfo | null>(null)

  const presetsForGenre = presetsByGenre(preset.genre)

  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    engine.setVolume(volume)
    engine.setDensity(density)
    engine.setSpace(space)

    const canvas = canvasRef.current
    if (canvas) {
      const scene = new Soundscape(canvas, preset.palette, prefersReducedMotion())
      scene.applyGenre(GENRES[preset.genre].visual)
      scene.setSampler(() => engine.getEnergy())
      sceneRef.current = scene
      engine.onNote((event) => scene.pulse(event))
    }
    const unsubSection = engine.onSection(setSection)

    return () => {
      unsubSection()
      sceneRef.current?.dispose()
      engine.dispose()
      engineRef.current = null
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const syncTrackInfo = () => {
    const info = engineRef.current?.getTrackInfo()
    if (info) setTrackInfo(info)
  }

  const handleToggle = async () => {
    const engine = engineRef.current
    if (!engine || busy) return

    if (playing) {
      engine.stop()
      sceneRef.current?.stop()
      setPlaying(false)
      return
    }

    setBusy(true)
    try {
      await engine.start(preset)
      sceneRef.current?.start()
      setPlaying(true)
      syncTrackInfo()
    } finally {
      setBusy(false)
    }
  }

  const loadPreset = (next: Preset) => {
    setPreset(next)
    setDensity(next.density)
    setSpace(next.space)
    setTempo(next.bpm)
    setSwing(GENRES[next.genre].swing)
    setKeyPitch(pitchClassOf(next.root))

    const engine = engineRef.current
    engine?.setPreset(next) // re-keys, re-tempos, re-instruments the groove
    engine?.setDensity(next.density)
    engine?.setSpace(next.space)

    sceneRef.current?.setPalette(next.palette)
    sceneRef.current?.applyGenre(GENRES[next.genre].visual)
    if (playing) syncTrackInfo()
  }

  const handleGenre = (genre: GenreId) => {
    if (genre === preset.genre) return
    const first = presetsByGenre(genre)[0]
    if (first) loadPreset(first)
  }

  // Shuffle: a fresh take of the current genre — new instruments, scale, key, tempo.
  const doShuffle = () => {
    const rolled = engineRef.current?.skip()
    if (rolled) {
      setTempo(rolled.bpm)
      setKeyPitch(rolled.pitchClass)
    }
    syncTrackInfo()
  }
  const handleShuffle = () => {
    if (playing) doShuffle()
  }

  // Surprise: jump to a random preset from any genre.
  const handleSurprise = () => {
    const pool = PRESETS.filter((p) => p.id !== preset.id)
    loadPreset(pool[Math.floor(Math.random() * pool.length)])
  }

  // Auto-evolve loop.
  useEffect(() => {
    if (!auto || !playing) return
    const id = window.setInterval(() => doShuffle(), AUTO_EVOLVE_MS)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, playing])

  const handleVolume = (v: number) => {
    setVolume(v)
    engineRef.current?.setVolume(v)
  }
  const handleDensity = (v: number) => {
    setDensity(v)
    engineRef.current?.setDensity(v)
  }
  const handleSpace = (v: number) => {
    setSpace(v)
    engineRef.current?.setSpace(v)
  }
  const handleTempo = (v: number) => {
    setTempo(v)
    engineRef.current?.setTempo(v)
  }
  const handleSwing = (v: number) => {
    setSwing(v)
    engineRef.current?.setSwing(v)
  }
  const handleKey = (pc: number) => {
    setKeyPitch(pc)
    engineRef.current?.setKey(pc)
  }
  const handleToggleLayer = (layer: Layer) => {
    const next = !muted[layer]
    setMuted({ ...muted, [layer]: next })
    engineRef.current?.setMute(layer, next)
  }

  // Keyboard: space = play/stop, S = shuffle, X = surprise, ←/→ = vibe, ↑/↓ = genre.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const typing = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
      if (e.code === 'Space' && !typing) {
        e.preventDefault()
        void handleToggle()
        return
      }
      if (typing) return
      const list = presetsForGenre
      const idx = list.findIndex((p) => p.id === preset.id)
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        loadPreset(list[(idx + 1) % list.length])
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        loadPreset(list[(idx - 1 + list.length) % list.length])
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault()
        const ids = Object.keys(GENRES) as GenreId[]
        const gi = ids.indexOf(preset.genre)
        const delta = e.key === 'ArrowDown' ? 1 : -1
        handleGenre(ids[(gi + delta + ids.length) % ids.length])
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        handleShuffle()
      } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault()
        handleSurprise()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, playing, busy])

  return (
    <main
      className="app"
      data-playing={playing}
      style={{ '--accent': preset.palette.accent } as CSSProperties}
    >
      <canvas ref={canvasRef} className="scene" aria-hidden="true" />

      <div className="ui">
        <header className="masthead">
          <h1 className="title">Nocturne</h1>
          <p className="tagline">Endless music, generated as you listen.</p>
        </header>

        <PlayButton playing={playing} busy={busy} onToggle={handleToggle} />

        <div className="transport">
          <button
            type="button"
            className="transport__btn"
            onClick={handleShuffle}
            disabled={!playing}
            title="Fresh take of this genre — new instruments, key, tempo (S)"
          >
            ⟳ Shuffle
          </button>
          <button
            type="button"
            className="transport__btn"
            onClick={handleSurprise}
            title="Jump to a random genre & vibe (X)"
          >
            ✦ Surprise
          </button>
          <button
            type="button"
            className="transport__btn"
            data-active={auto}
            onClick={() => setAuto((a) => !a)}
            aria-pressed={auto}
            title="Auto-evolve: drift to fresh material hands-free"
          >
            ∞ Auto
          </button>
        </div>

        <NowPlaying info={playing ? trackInfo : null} section={section} />

        <div className="controls">
          <GenreTabs current={preset.genre} onSelect={handleGenre} />
          <PresetPicker presets={presetsForGenre} current={preset} onSelect={loadPreset} />
          <Macros
            volume={volume}
            density={density}
            space={space}
            onVolume={handleVolume}
            onDensity={handleDensity}
            onSpace={handleSpace}
          />
          <Shape
            tempo={tempo}
            swing={swing}
            keyPitch={keyPitch}
            muted={muted}
            onTempo={handleTempo}
            onSwing={handleSwing}
            onKey={handleKey}
            onToggleLayer={handleToggleLayer}
          />
        </div>

        <footer className="hint">
          {playing
            ? 'S shuffle · X surprise · ← → vibe · ↑ ↓ genre'
            : 'Press play. Headphones help.'}
        </footer>
      </div>
    </main>
  )
}
