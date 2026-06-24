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

// Semitone offsets from the root, one octave's worth.
export const SCALES: Record<ScaleName, readonly number[]> = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  // Bright, slightly exotic — good for "deep space" shimmer.
  ryukyu: [0, 4, 5, 7, 11],
  // Wistful Japanese pentatonic — pairs well with rain.
  kumoi: [0, 2, 3, 7, 9],
  // Floating, dreamlike (six notes, still clash-free in practice).
  lydian: [0, 2, 4, 6, 7, 9, 11],
}

/** Equal-tempered MIDI note number → frequency in Hz (A4 = 69 = 440 Hz). */
export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
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
