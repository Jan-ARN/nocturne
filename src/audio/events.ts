// A note firing in the engine, surfaced to the UI/visual layer so the canvas can
// pulse in time with what you hear.

export type NoteKind = 'melody' | 'texture'

export interface NoteEvent {
  kind: NoteKind
  /** 0..1 — how hard the note was struck; drives pulse brightness/size. */
  intensity: number
}

export type NoteListener = (event: NoteEvent) => void
