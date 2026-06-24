import type { CSSProperties } from 'react'
import type { Preset } from '../presets/presets'

interface PresetPickerProps {
  presets: Preset[]
  current: Preset
  onSelect: (preset: Preset) => void
}

export function PresetPicker({ presets, current, onSelect }: PresetPickerProps) {
  return (
    <div className="presets" role="radiogroup" aria-label="Vibe">
      {presets.map((preset) => {
        const active = preset.id === current.id
        return (
          <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={active}
            className="preset"
            data-active={active}
            onClick={() => onSelect(preset)}
            style={{ '--swatch': preset.palette.accent } as CSSProperties}
          >
            <span className="preset__name">{preset.name}</span>
            <span className="preset__blurb">{preset.blurb}</span>
          </button>
        )
      })}
    </div>
  )
}
