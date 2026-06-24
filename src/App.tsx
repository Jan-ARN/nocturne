import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { AudioEngine } from './audio/AudioEngine'
import { Soundscape } from './visual/Soundscape'
import { PlayButton } from './components/PlayButton'
import { PresetPicker } from './components/PresetPicker'
import { Macros } from './components/Macros'
import { DEFAULT_PRESET, type Preset } from './presets/presets'

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<AudioEngine | null>(null)
  const sceneRef = useRef<Soundscape | null>(null)

  const [preset, setPreset] = useState<Preset>(DEFAULT_PRESET)
  const [playing, setPlaying] = useState(false)
  const [busy, setBusy] = useState(false)
  const [volume, setVolume] = useState(0.7)
  const [density, setDensity] = useState(DEFAULT_PRESET.density)
  const [space, setSpace] = useState(DEFAULT_PRESET.space)

  // Create the engine + visual once, and wire note events to the canvas pulse.
  useEffect(() => {
    const engine = new AudioEngine()
    engineRef.current = engine
    engine.setVolume(volume)
    engine.setDensity(density)
    engine.setSpace(space)

    const canvas = canvasRef.current
    if (canvas) {
      const scene = new Soundscape(canvas, preset.palette, prefersReducedMotion())
      sceneRef.current = scene
      engine.onNote((event) => scene.pulse(event))
    }

    return () => {
      sceneRef.current?.dispose()
      engine.dispose()
      engineRef.current = null
      sceneRef.current = null
    }
    // Intentionally run once on mount; live updates go through the handlers below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    } finally {
      setBusy(false)
    }
  }

  const handlePreset = (next: Preset) => {
    setPreset(next)
    setDensity(next.density)
    setSpace(next.space)
    const engine = engineRef.current
    engine?.setPreset(next)
    engine?.setDensity(next.density)
    engine?.setSpace(next.space)
    sceneRef.current?.setPalette(next.palette)
  }

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
          <p className="tagline">Endless calm, generated as you listen.</p>
        </header>

        <PlayButton playing={playing} busy={busy} onToggle={handleToggle} />

        <div className="controls">
          <PresetPicker current={preset} onSelect={handlePreset} />
          <Macros
            volume={volume}
            density={density}
            space={space}
            onVolume={handleVolume}
            onDensity={handleDensity}
            onSpace={handleSpace}
          />
        </div>

        <footer className="hint">
          {playing ? 'Now playing — it never repeats.' : 'Press play. Headphones help.'}
        </footer>
      </div>
    </main>
  )
}
