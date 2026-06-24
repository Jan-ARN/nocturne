interface Slider {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}

interface MacrosProps {
  volume: number
  density: number
  space: number
  onVolume: (value: number) => void
  onDensity: (value: number) => void
  onSpace: (value: number) => void
}

function MacroSlider({ id, label, value, onChange }: Slider) {
  return (
    <label className="macro" htmlFor={id}>
      <span className="macro__label">{label}</span>
      <input
        id={id}
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={`${Math.round(value * 100)}%`}
      />
    </label>
  )
}

export function Macros({
  volume,
  density,
  space,
  onVolume,
  onDensity,
  onSpace,
}: MacrosProps) {
  return (
    <div className="macros">
      <MacroSlider id="volume" label="Volume" value={volume} onChange={onVolume} />
      <MacroSlider id="density" label="Density" value={density} onChange={onDensity} />
      <MacroSlider id="space" label="Space" value={space} onChange={onSpace} />
    </div>
  )
}
