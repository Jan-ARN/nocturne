// Drum-pattern banks. Each genre has a set of rhythmic skeletons; the sequencer
// draws a fresh one each phrase, so the groove itself shifts over a session rather
// than only the velocities on top.

import type { GenreId } from './genres'

export interface DrumPattern {
  /** Steps (0..15) the kick fires on. */
  kick: number[]
  /** Backbeat steps for the snare / clap. */
  snare: number[]
  /** Extra "push" kick steps, fired probabilistically for swing/syncopation. */
  ghostKick: number[]
}

const BANKS: Record<GenreId, DrumPattern[]> = {
  // Boom-bap: kick anchored on the one, snare on the backbeat, the rest roams.
  lofi: [
    { kick: [0, 8], snare: [4, 12], ghostKick: [11] },
    { kick: [0, 6, 10], snare: [4, 12], ghostKick: [] },
    { kick: [0, 8, 11], snare: [4, 12], ghostKick: [3] },
    { kick: [0, 7], snare: [4, 12], ghostKick: [10, 14] },
    { kick: [0, 3, 8], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 8, 10], snare: [4, 12], ghostKick: [6] },
  ],
  // Harder, more syncopated than lo-fi.
  boombap: [
    { kick: [0, 10], snare: [4, 12], ghostKick: [3, 7] },
    { kick: [0, 6, 10], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 3, 8, 10], snare: [4, 12], ghostKick: [] },
    { kick: [0, 7, 8], snare: [4, 12], ghostKick: [11] },
    { kick: [0, 10, 11], snare: [4, 12], ghostKick: [6] },
  ],
  // Slow and heavy, lots of space.
  triphop: [
    { kick: [0, 8], snare: [4, 12], ghostKick: [] },
    { kick: [0, 7, 8], snare: [4, 12], ghostKick: [3] },
    { kick: [0, 10], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 6], snare: [4, 12], ghostKick: [10] },
  ],
  // Four-on-the-floor stays the spine; variants add rolls, shifts and a clap nudge.
  house: [
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [] },
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [7] },
    { kick: [0, 4, 8, 12], snare: [7, 12], ghostKick: [] },
    { kick: [0, 4, 8, 12, 14], snare: [4, 12], ghostKick: [] },
    { kick: [0, 4, 8, 12], snare: [4, 10, 12], ghostKick: [] },
  ],
  // Relentless four-on-floor, snare often dropped for hypnotic minimalism.
  techno: [
    { kick: [0, 4, 8, 12], snare: [], ghostKick: [] },
    { kick: [0, 4, 8, 12], snare: [12], ghostKick: [14] },
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [] },
    { kick: [0, 4, 8, 12], snare: [], ghostKick: [10] },
  ],
  // Driving retro pulse — sometimes halftime, sometimes a double-kick push.
  synthwave: [
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [] },
    { kick: [0, 8], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 4, 8, 12], snare: [4, 12], ghostKick: [10] },
    { kick: [0, 6, 8, 12], snare: [4, 12], ghostKick: [] },
    { kick: [0, 8, 14], snare: [4, 12], ghostKick: [] },
  ],
  // Gentle, airy — the beat barely insists.
  dreamwave: [
    { kick: [0, 8], snare: [12], ghostKick: [] },
    { kick: [0, 4, 8, 12], snare: [12], ghostKick: [] },
    { kick: [0, 8], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 10], snare: [12], ghostKick: [] },
  ],
  // Liquid breakbeat: kick on the one and the "and" of 2, snare on the backbeat.
  dnb: [
    { kick: [0, 10], snare: [4, 12], ghostKick: [] },
    { kick: [0, 6, 10], snare: [4, 12], ghostKick: [14] },
    { kick: [0, 10, 11], snare: [4, 12], ghostKick: [] },
    { kick: [0, 8], snare: [4, 12], ghostKick: [3] },
  ],
  // Beatless.
  ambient: [{ kick: [], snare: [], ghostKick: [] }],
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** Draw a fresh skeleton for the current phrase. */
export function pickDrumPattern(genre: GenreId): DrumPattern {
  return pick(BANKS[genre])
}
