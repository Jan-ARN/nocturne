// Instrument synthesis. Timbral range comes from using different synthesis
// engines, not just different waveforms: FM for electric pianos, bells and
// metallic plucks, AM for hollow/vocal tones, and subtractive mono for bass.
// A PatchSpec describes one sound; the archetypes below are recipes with a bit of
// built-in randomness; the factories turn a spec into a live Tone node. A genre
// lists the archetypes it can draw from, and each track draws fresh ones.

import * as Tone from 'tone'

export type Engine = 'synth' | 'fm' | 'am' | 'mono'

export interface Envelope {
  attack: number
  decay: number
  sustain: number
  release: number
}

export interface PatchSpec {
  engine: Engine
  waveform: OscillatorType
  envelope: Envelope
  detune?: number
  /** FM/AM: ratio between carrier and modulator. */
  harmonicity?: number
  /** FM: depth of modulation — low = warm, high = bell/metallic. */
  modulationIndex?: number
  modulation?: OscillatorType
  volume: number
  /** Mono-bass lowpass shaping. */
  filterBase?: number
  filterOctaves?: number
  filterQ?: number
  /** Lead echo. */
  delay?: { time: Tone.Unit.Time; feedback: number; wet: number }
  /** Human-readable instrument name, shown in the now-playing panel. */
  label: string
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)
const choose = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]

export type Archetype =
  // pitched / poly (chords, leads)
  | 'rhodes' | 'bell' | 'glass' | 'marimba' | 'pluck' | 'harp'
  | 'sawpad' | 'airpad' | 'organ' | 'choir'
  // bass
  | 'sub' | 'round' | 'reece' | 'acid' | 'fmbass'

// Each recipe centers a sound and jitters it, so a Rhodes is always recognizably
// a Rhodes but never the exact same patch twice.
const RECIPES: Record<Archetype, () => PatchSpec> = {
  rhodes: () => ({
    engine: 'fm', waveform: 'sine', harmonicity: choose([1, 2, 3]), modulationIndex: rand(1.5, 3.5), modulation: 'sine',
    envelope: { attack: rand(0.005, 0.02), decay: rand(0.5, 1.1), sustain: rand(0.2, 0.4), release: rand(1.0, 1.8) },
    volume: -13, label: 'Rhodes',
  }),
  bell: () => ({
    engine: 'fm', waveform: 'sine', harmonicity: rand(3, 5.5), modulationIndex: rand(8, 15), modulation: 'sine',
    envelope: { attack: 0.002, decay: rand(0.4, 0.9), sustain: rand(0, 0.15), release: rand(0.8, 1.6) },
    volume: -15, label: 'Bell',
  }),
  glass: () => ({
    engine: 'fm', waveform: 'sine', harmonicity: rand(2, 3.5), modulationIndex: rand(5, 9), modulation: 'triangle',
    envelope: { attack: rand(0.002, 0.01), decay: rand(0.4, 0.8), sustain: rand(0.1, 0.3), release: rand(0.8, 1.5) },
    volume: -16, label: 'Glass',
  }),
  marimba: () => ({
    engine: 'fm', waveform: 'sine', harmonicity: rand(1, 2), modulationIndex: rand(2, 5), modulation: 'sine',
    envelope: { attack: 0.002, decay: rand(0.25, 0.5), sustain: 0, release: rand(0.3, 0.7) },
    volume: -12, label: 'Marimba',
  }),
  pluck: () => ({
    engine: 'synth', waveform: choose(['triangle', 'square', 'sawtooth'] as OscillatorType[]),
    envelope: { attack: 0.004, decay: rand(0.15, 0.35), sustain: rand(0, 0.15), release: rand(0.2, 0.5) },
    volume: -13, label: 'Pluck',
  }),
  harp: () => ({
    engine: 'synth', waveform: 'triangle',
    envelope: { attack: 0.004, decay: rand(0.4, 0.8), sustain: rand(0.05, 0.2), release: rand(0.8, 1.4) },
    volume: -13, label: 'Harp',
  }),
  sawpad: () => ({
    engine: 'synth', waveform: 'sawtooth', detune: choose([0, 6, 9, 12]),
    envelope: { attack: rand(0.25, 0.6), decay: rand(0.4, 0.8), sustain: rand(0.6, 0.82), release: rand(1.8, 2.8) },
    volume: -18, label: 'Saw Pad',
  }),
  airpad: () => ({
    engine: 'synth', waveform: choose(['triangle', 'sine'] as OscillatorType[]), detune: choose([0, 5, 8]),
    envelope: { attack: rand(0.3, 0.7), decay: rand(0.4, 0.9), sustain: rand(0.6, 0.8), release: rand(2.0, 3.0) },
    volume: -15, label: 'Air Pad',
  }),
  organ: () => ({
    engine: 'synth', waveform: 'square',
    envelope: { attack: rand(0.01, 0.06), decay: rand(0.3, 0.6), sustain: rand(0.5, 0.7), release: rand(0.8, 1.6) },
    volume: -20, label: 'Organ',
  }),
  choir: () => ({
    engine: 'am', waveform: 'sine', harmonicity: rand(1.5, 3), modulation: 'sine',
    envelope: { attack: rand(0.3, 0.6), decay: rand(0.4, 0.8), sustain: rand(0.6, 0.8), release: rand(1.8, 2.6) },
    volume: -15, label: 'Choir',
  }),
  sub: () => ({
    engine: 'mono', waveform: 'sine',
    envelope: { attack: 0.02, decay: rand(0.2, 0.4), sustain: rand(0.7, 0.9), release: rand(0.3, 0.6) },
    filterBase: rand(90, 160), filterOctaves: rand(1.6, 2.4), filterQ: 0.6, volume: -5, label: 'Sub',
  }),
  round: () => ({
    engine: 'mono', waveform: 'triangle',
    envelope: { attack: 0.02, decay: rand(0.2, 0.4), sustain: rand(0.6, 0.8), release: rand(0.3, 0.6) },
    filterBase: rand(140, 240), filterOctaves: rand(1.8, 2.6), filterQ: 0.8, volume: -6, label: 'Round Bass',
  }),
  reece: () => ({
    engine: 'fm', waveform: 'sawtooth', harmonicity: choose([0.5, 1]), modulationIndex: rand(3, 7), modulation: 'sawtooth',
    envelope: { attack: 0.01, decay: rand(0.2, 0.4), sustain: rand(0.6, 0.85), release: rand(0.3, 0.6) },
    volume: -9, label: 'Reece',
  }),
  acid: () => ({
    engine: 'mono', waveform: 'sawtooth',
    envelope: { attack: 0.01, decay: rand(0.15, 0.3), sustain: rand(0.3, 0.6), release: rand(0.2, 0.4) },
    filterBase: rand(120, 220), filterOctaves: rand(2.6, 3.6), filterQ: rand(3, 7), volume: -8, label: 'Acid',
  }),
  fmbass: () => ({
    engine: 'fm', waveform: 'sine', harmonicity: choose([1, 2]), modulationIndex: rand(2, 5), modulation: 'sine',
    envelope: { attack: 0.01, decay: rand(0.2, 0.4), sustain: rand(0.6, 0.85), release: rand(0.3, 0.6) },
    volume: -8, label: 'FM Bass',
  }),
}

/** Instantiate a fresh patch from an archetype name. */
export function makePatch(arch: Archetype): PatchSpec {
  return RECIPES[arch]()
}

// ── Tone factories ──────────────────────────────────────────────────────────

const CLASS = { synth: Tone.Synth, fm: Tone.FMSynth, am: Tone.AMSynth, mono: Tone.MonoSynth } as const

// Each engine takes a different option shape; the keys that don't belong to plain
// SynthOptions (FM/AM modulation, the mono filter) force a single cast here. We
// build into one object and loosen it once, so callers don't have to cast.
function toneOptions(spec: PatchSpec): Partial<Tone.SynthOptions> {
  const env = spec.envelope
  const opts: Record<string, unknown> = {
    oscillator: { type: spec.waveform },
    envelope: env,
    detune: spec.detune ?? 0,
    volume: spec.volume,
  }
  switch (spec.engine) {
    case 'fm':
      Object.assign(opts, {
        harmonicity: spec.harmonicity ?? 2,
        modulationIndex: spec.modulationIndex ?? 6,
        modulation: { type: spec.modulation ?? 'sine' },
        modulationEnvelope: { attack: env.attack + 0.01, decay: 0.2, sustain: 0.3, release: env.release },
      })
      break
    case 'am':
      Object.assign(opts, {
        harmonicity: spec.harmonicity ?? 2,
        modulation: { type: spec.modulation ?? 'square' },
        modulationEnvelope: { attack: env.attack + 0.01, decay: 0.2, sustain: 0.5, release: env.release },
      })
      break
    case 'mono':
      Object.assign(opts, {
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.4, baseFrequency: spec.filterBase ?? 150, octaves: spec.filterOctaves ?? 2 },
        filter: { Q: spec.filterQ ?? 1 },
      })
      break
  }
  return opts as Partial<Tone.SynthOptions>
}

// TS can't call a union of constructor types with one options shape, so `cls` is
// narrowed to a single constructor here.
type AnySynthClass = typeof Tone.Synth

/** A polyphonic instrument for chords and leads. */
export function buildPoly(spec: PatchSpec, maxPolyphony: number): Tone.PolySynth {
  const poly = new Tone.PolySynth(CLASS[spec.engine] as AnySynthClass, toneOptions(spec))
  poly.maxPolyphony = maxPolyphony
  return poly
}

export type MonoVoice = Tone.Synth | Tone.FMSynth | Tone.AMSynth | Tone.MonoSynth

/** A monophonic instrument for bass. */
export function buildMono(spec: PatchSpec): MonoVoice {
  const cls = CLASS[spec.engine] as AnySynthClass
  return new cls(toneOptions(spec))
}
