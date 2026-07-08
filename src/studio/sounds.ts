import type { Archetype } from '../audio/patches'
import { KEY_NAMES } from '../audio/scales'
import type { DrumSound } from './types'

// The palettes the track-adder draws from, plus a couple of small helpers shared by
// the engine and UI.

export const DRUM_SOUNDS: { sound: DrumSound; label: string }[] = [
  { sound: 'kick', label: 'Kick' },
  { sound: 'snare', label: 'Snare' },
  { sound: 'hat', label: 'Hat' },
  { sound: 'openhat', label: 'Open Hat' },
  { sound: 'conga', label: 'Conga' },
  { sound: 'shaker', label: 'Shaker' },
  { sound: 'clave', label: 'Clave' },
]

// Curated melodic archetypes — the ones that read clearly as a single plucked or
// struck note in a grid lane (pads are left out; they smear at 16th-note spacing).
export const SYNTH_ARCHETYPES: { archetype: Archetype; label: string }[] = [
  { archetype: 'sub', label: 'Sub Bass' },
  { archetype: 'reece', label: 'Reece' },
  { archetype: 'acid', label: 'Acid' },
  { archetype: 'rhodes', label: 'Rhodes' },
  { archetype: 'bell', label: 'Bell' },
  { archetype: 'glass', label: 'Glass' },
  { archetype: 'marimba', label: 'Marimba' },
  { archetype: 'pluck', label: 'Pluck' },
  { archetype: 'harp', label: 'Harp' },
]

/** Per-sound trigger velocity, so a kit sits in a sensible balance by default. */
export const DRUM_VELOCITY: Record<DrumSound, number> = {
  kick: 1,
  snare: 0.9,
  hat: 0.5,
  openhat: 0.55,
  conga: 0.75,
  shaker: 0.45,
  clave: 0.7,
}

// Synth-lane tuning, shared by the engine (when triggering) and the UI (when listing
// selectable notes): lanes draw from a scale pool stacked POOL_OCTAVES up from BASE_MIDI.
export const BASE_MIDI = 36 // C2
export const POOL_OCTAVES = 3

/** Note name like "C3" or "F♯4" from a MIDI number. */
export function noteName(midi: number): string {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  return `${KEY_NAMES[pc]}${octave}`
}
