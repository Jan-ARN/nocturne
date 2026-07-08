import type { Archetype } from '../audio/patches'
import type { ScaleName } from '../audio/scales'

// The Motherload beat station: a step sequencer that, unlike the generative engine,
// the listener programs by hand. A "genre" here is the user's own saved project —
// its tempo, key, the lanes it has, and the pattern punched into the grid.

/** Steps in one bar of the grid (16th notes). */
export const STEPS = 16

/** Drum lanes map straight onto the existing Drums voice's triggers. */
export type DrumSound = 'kick' | 'snare' | 'hat' | 'openhat' | 'conga' | 'shaker' | 'clave'

export interface DrumTrack {
  id: string
  kind: 'drum'
  sound: DrumSound
  label: string
}

export interface SynthTrack {
  id: string
  kind: 'synth'
  archetype: Archetype
  /** Index into the genre's scale pool (which spans a few octaves). */
  degree: number
  label: string
}

export type Track = DrumTrack | SynthTrack

export interface StudioGenre {
  id: string
  name: string
  bpm: number
  /** Transport swing, 0..0.5. */
  swing: number
  scale: ScaleName
  /** Root pitch class, 0 (C) .. 11 (B). */
  root: number
  tracks: Track[]
  /** trackId → STEPS booleans. */
  pattern: Record<string, boolean[]>
}

export function emptyRow(): boolean[] {
  return Array.from({ length: STEPS }, () => false)
}
