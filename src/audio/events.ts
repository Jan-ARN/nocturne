// A musical event surfaced to the UI/visual layer so the canvas can pulse in
// time with the beat.

export type NoteKind = 'kick' | 'snare' | 'chord' | 'melody'

export interface NoteEvent {
  kind: NoteKind
  /** 0..1 — how hard it hit; drives pulse brightness/size. */
  intensity: number
}

export type NoteListener = (event: NoteEvent) => void

/** Normalized spectrum energy (0..1) sampled from the master output. */
export interface Energy {
  level: number
  bass: number
  mid: number
  high: number
}

export type SectionListener = (name: string) => void
