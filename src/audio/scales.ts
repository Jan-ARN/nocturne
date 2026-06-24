// Scale tables. Everything is quantized to one of these so randomness always
// lands on an intentional-sounding note — the core trick that makes generative
// ambient sound "composed" for free. Pentatonics have no semitone clashes, so
// any combination of their notes is consonant.

export type ScaleName =
  | 'majorPentatonic'
  | 'minorPentatonic'
  | 'ryukyu'
  | 'kumoi'
  | 'lydian'
  | 'dorian'
  | 'aeolian'
  | 'mixolydian'
  | 'phrygian'

// Semitone offsets from the root, one octave's worth. The pentatonics are clash-
// free; the seven-note modes add characteristic color notes (dorian's bright 6th,
// phrygian's dark ♭2, mixolydian's ♭7) so melodies have a recognizable flavor
// instead of always landing on the same safe pentatonic.
export const SCALES: Record<ScaleName, readonly number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  // Bright, slightly exotic — good for "deep space" shimmer.
  ryukyu: [0, 4, 5, 7, 11],
  // Wistful Japanese pentatonic — pairs well with rain.
  kumoi: [0, 2, 3, 7, 9],
  // Floating, dreamlike.
  lydian: [0, 2, 4, 6, 7, 9, 11],
  // Minor with a raised 6th — soulful, the classic deep-house mode.
  dorian: [0, 2, 3, 5, 7, 9, 10],
  // Natural minor — wistful, grounded.
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  // Major with a ♭7 — bluesy, hypnotic over vamps.
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  // Minor with a ♭2 — dark, tense, Spanish/retro edge.
  phrygian: [0, 1, 3, 5, 7, 8, 10],
}

/** Pretty names for the scales, for the now-playing panel. */
export const SCALE_LABELS: Record<ScaleName, string> = {
  majorPentatonic: 'major pent',
  minorPentatonic: 'minor pent',
  ryukyu: 'ryukyu',
  kumoi: 'kumoi',
  lydian: 'lydian',
  dorian: 'dorian',
  aeolian: 'minor',
  mixolydian: 'mixolydian',
  phrygian: 'phrygian',
}

/** Equal-tempered MIDI note number → frequency in Hz (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/** Display names for the twelve keys, indexed by pitch class (0 = C). */
export const KEY_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B']

const PITCH_CLASS: Record<string, number> = {
  C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5,
  'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11,
}

/** Pitch class (0..11) of a note name like "A2" or "F#3". */
export function pitchClassOf(note: string): number {
  const match = note.match(/^([A-G][#b]?)/)
  return match ? PITCH_CLASS[match[1]] ?? 0 : 0
}

/**
 * Build a pool of MIDI notes by stacking a scale across `octaves`, starting at
 * `rootMidi`. The scheduler draws random notes from this pool.
 */
export function buildScalePool(
  rootMidi: number,
  scale: ScaleName,
  octaves: number,
): number[] {
  const intervals = SCALES[scale]
  const pool: number[] = []
  for (let o = 0; o < octaves; o++) {
    for (const interval of intervals) {
      pool.push(rootMidi + o * 12 + interval)
    }
  }
  return pool
}
