import { KEY_NAMES } from '../audio/scales'
import { LAYERS, type Layer } from '../audio/genres'

const LAYER_LABELS: Record<Layer, string> = {
  drums: 'Drums',
  chords: 'Chords',
  bass: 'Bass',
  lead: 'Lead',
}

interface ShapeProps {
  tempo: number
  swing: number
  keyPitch: number
  muted: Record<Layer, boolean>
  onTempo: (bpm: number) => void
  onSwing: (value: number) => void
  onKey: (pitchClass: number) => void
  onToggleLayer: (layer: Layer) => void
}

export function Shape({
  tempo,
  swing,
  keyPitch,
  muted,
  onTempo,
  onSwing,
  onKey,
  onToggleLayer,
}: ShapeProps) {
  return (
    <div className="shape">
      <label className="macro" htmlFor="tempo">
        <span className="macro__label">Tempo</span>
        <input
          id="tempo"
          type="range"
          min={48}
          max={180}
          step={1}
          value={tempo}
          onChange={(e) => onTempo(Number(e.target.value))}
          aria-valuetext={`${tempo} BPM`}
        />
        <span className="macro__value">{tempo}</span>
      </label>

      <label className="macro" htmlFor="swing">
        <span className="macro__label">Swing</span>
        <input
          id="swing"
          type="range"
          min={0}
          max={0.6}
          step={0.01}
          value={swing}
          onChange={(e) => onSwing(Number(e.target.value))}
          aria-valuetext={`${Math.round(swing * 100)}%`}
        />
        <span className="macro__value">{Math.round(swing * 100)}</span>
      </label>

      <label className="macro" htmlFor="key">
        <span className="macro__label">Key</span>
        <select
          id="key"
          className="key-select"
          value={keyPitch}
          onChange={(e) => onKey(Number(e.target.value))}
        >
          {KEY_NAMES.map((name, pc) => (
            <option key={name} value={pc}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="layers" role="group" aria-label="Layers">
        {LAYERS.map((layer) => (
          <button
            key={layer}
            type="button"
            className="layer"
            data-muted={muted[layer]}
            aria-pressed={!muted[layer]}
            onClick={() => onToggleLayer(layer)}
          >
            {LAYER_LABELS[layer]}
          </button>
        ))}
      </div>
    </div>
  )
}
