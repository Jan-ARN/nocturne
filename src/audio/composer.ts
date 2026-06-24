// The composition engine. Rather than loop one hardcoded progression and motif
// forever, the sequencer asks this module for fresh material continuously:
//
//   • chord progressions walked over a functional-harmony transition table, then
//     *voiced* — quality (triad / 7th / 9th) chosen per genre, inversions picked
//     by nearest-note voice leading so chords glide instead of jumping,
//   • a melodic theme (a shaped contour over the scale ladder, with rests, leaps
//     and passing tones) that is then *developed* bar by bar — transposed,
//     inverted, truncated — so a line has identity yet never sits still,
//   • whole-track arrangements assembled from a block vocabulary, so the macro
//     shape (section order, lengths, energy arc) differs every time too.
//
// Consonance still comes for free — chords are diatonic, the melody rides the
// scale and snaps to chord tones on strong beats — but nothing is fixed, so two
// takes never share a progression, a melody, or a structure.

import type { ScaleName } from './scales'
import type { HarmonyProfile } from './genres'

export type Mode = 'major' | 'minor'

const MINOR_SCALES = new Set<ScaleName>(['minorPentatonic', 'kumoi', 'dorian', 'aeolian', 'phrygian'])

/** Which harmonic mode a scale implies (drives the chord vocabulary). */
export function modeOf(scale: ScaleName): Mode {
  return MINOR_SCALES.has(scale) ? 'minor' : 'major'
}

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

// ── Harmony ────────────────────────────────────────────────────────────

// Diatonic 7th chords as ascending semitone offsets from the key root. Index 0 is
// always the chord's scale-degree root (used for the bass, independent of voicing).
const MINOR_CHORDS: Record<string, number[]> = {
  i: [0, 3, 7, 10],
  III: [3, 7, 10, 14],
  iv: [5, 8, 12, 15],
  v: [7, 10, 14, 17],
  VI: [8, 12, 15, 19],
  VII: [10, 14, 17, 21],
}

const MAJOR_CHORDS: Record<string, number[]> = {
  I: [0, 4, 7, 11],
  ii: [2, 5, 9, 12],
  iii: [4, 7, 11, 14],
  IV: [5, 9, 12, 16],
  V: [7, 11, 14, 17],
  vi: [9, 12, 16, 19],
}

// Where each chord tends to move next — the heart of "sounds intentional".
const MINOR_NEXT: Record<string, string[]> = {
  i: ['VI', 'iv', 'VII', 'III', 'v'],
  III: ['VI', 'iv', 'VII'],
  iv: ['v', 'VII', 'i', 'VI'],
  v: ['i', 'VI', 'III'],
  VI: ['VII', 'iv', 'III', 'v'],
  VII: ['i', 'III', 'VI'],
}

const MAJOR_NEXT: Record<string, string[]> = {
  I: ['vi', 'IV', 'ii', 'V', 'iii'],
  ii: ['V', 'IV', 'vi'],
  iii: ['vi', 'IV', 'ii'],
  IV: ['V', 'I', 'ii', 'vi'],
  V: ['I', 'vi', 'IV'],
  vi: ['IV', 'ii', 'V', 'iii'],
}

// Where a progression may begin — weighted toward the tonic but not always, so
// every regeneration can open on a different chord.
const MINOR_STARTS = ['i', 'i', 'i', 'VI', 'iv', 'III', 'VII']
const MAJOR_STARTS = ['I', 'I', 'I', 'vi', 'IV', 'ii']

export interface ChordSpec {
  /** Voiced MIDI offsets from the key root — inverted & octave-placed for voice leading. */
  offsets: number[]
  /** Scale-degree root offset (semitones from key root) for the bass. */
  rootOffset: number
  /** Pitch classes (0..11, relative to key root) the melody treats as chord tones. */
  pitchClasses: number[]
}

/** Drop to a triad and/or add a 9th, per the genre's harmonic taste. */
function applyQuality(base: number[], h: HarmonyProfile): number[] {
  let out = Math.random() < h.seventh ? base.slice() : base.slice(0, 3)
  if (Math.random() < h.ninth) out.push(base[0] + 14)
  return out
}

/** Rotate the lowest `k` notes up an octave (an inversion). */
function invert(offsets: number[], k: number): number[] {
  const out = offsets.slice()
  for (let i = 0; i < k; i++) out.push(out.shift()! + 12)
  return out
}

// Voiced chords should sit in a comfortable register above the key root.
const VOICE_LOW = 6
const VOICE_HIGH = 30

/**
 * Pick the inversion (and octave placement) whose top note is closest to the
 * previous chord's top — smooth voice leading, the thing that makes a sequence of
 * chords sound deliberately played rather than stamped out in root position.
 */
function voiceLead(offsets: number[], prevTop: number | null): number[] {
  const candidates: number[][] = []
  for (let k = 0; k < offsets.length; k++) {
    const inv = invert(offsets, k)
    for (const shift of [-12, 0, 12]) {
      const c = inv.map((n) => n + shift)
      const top = c[c.length - 1]
      const low = c[0]
      if (low >= VOICE_LOW && top <= VOICE_HIGH) candidates.push(c)
    }
  }
  if (candidates.length === 0) return offsets
  if (prevTop === null) return pick(candidates)
  let best = candidates[0]
  let bestDist = Infinity
  for (const c of candidates) {
    const d = Math.abs(c[c.length - 1] - prevTop)
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best
}

/** Walk the transition table and voice each chord into a coherent progression. */
export function generateProgression(mode: Mode, harmony: HarmonyProfile, length = 4): ChordSpec[] {
  const chords = mode === 'minor' ? MINOR_CHORDS : MAJOR_CHORDS
  const next = mode === 'minor' ? MINOR_NEXT : MAJOR_NEXT
  // Vampy genres lean toward a short repeating cell; others keep things moving.
  const len = Math.random() < harmony.vamp ? 2 : Math.random() < 0.3 ? 8 : length
  let degree = pick(mode === 'minor' ? MINOR_STARTS : MAJOR_STARTS)

  const out: ChordSpec[] = []
  let prevTop: number | null = null
  for (let i = 0; i < len; i++) {
    const base = chords[degree]
    const voiced = voiceLead(applyQuality(base, harmony), prevTop)
    prevTop = voiced[voiced.length - 1]
    out.push({
      offsets: voiced,
      rootOffset: base[0],
      pitchClasses: base.map((o) => ((o % 12) + 12) % 12),
    })
    degree = pick(next[degree])
  }
  return out
}

// ── Melody ───────────────────────────────────────────────────────────────

export interface MotifNote {
  /** 16-step position that fires this note. */
  step: number
  /** Index into the scale ladder (stable across chords); snapped to chord tones on strong beats. */
  pool: number
  /** Velocity 0..1. */
  vel: number
}

export interface Motif {
  notes: MotifNote[]
}

// Onset positions, biased toward beats but with room for tasteful syncopation.
const ONSET_CANDIDATES = [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15]
const STRONG_STEPS = new Set([0, 4, 8, 12])
const isStrong = (step: number): boolean => STRONG_STEPS.has(step)

type Shape = 'arch' | 'rise' | 'fall' | 'wave'
const SHAPES: Shape[] = ['arch', 'rise', 'fall', 'wave']

function contourAt(shape: Shape, t: number, center: number, amp: number): number {
  switch (shape) {
    case 'arch':
      return center + amp * Math.sin(Math.PI * t)
    case 'rise':
      return center - amp + 2 * amp * t
    case 'fall':
      return center + amp - 2 * amp * t
    case 'wave':
      return center + amp * Math.sin(2 * Math.PI * t)
  }
}

/**
 * Generate a melodic theme: a rhythm (which steps), then a contour over the scale
 * ladder. The walk mostly steps, occasionally leaps, follows an overall shape, and
 * leaves rests — so it reads as a phrase with a memorable arc rather than a flat
 * random sprinkle. `poolSize` is the size of the sequencer's scale ladder.
 */
export function generateMotif(poolSize: number, density: number, maxNotes: number): Motif {
  const count = clampInt(Math.round(2 + density * (maxNotes - 1)), 2, maxNotes)
  const candidates = ONSET_CANDIDATES.slice()
  const steps: number[] = []
  // Usually start the phrase on the downbeat to ground it.
  if (Math.random() < 0.7) {
    steps.push(0)
    candidates.splice(candidates.indexOf(0), 1)
  }
  while (steps.length < count && candidates.length > 0) {
    steps.push(candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0])
  }
  steps.sort((a, b) => a - b)

  const shape = pick(SHAPES)
  const center = (poolSize - 1) / 2
  const amp = poolSize * (0.28 + Math.random() * 0.18)
  const notes: MotifNote[] = []
  for (let i = 0; i < steps.length; i++) {
    const t = steps.length > 1 ? i / (steps.length - 1) : 0
    // Base position from the shape, plus a little jitter and the odd leap.
    let pos = contourAt(shape, t, center, amp)
    pos += Math.floor(Math.random() * 3) - 1
    if (Math.random() < 0.18) pos += pick([-4, -3, 3, 4]) // occasional leap
    notes.push({
      step: steps[i],
      pool: clampInt(Math.round(pos), 0, poolSize - 1),
      vel: (isStrong(steps[i]) ? 0.42 : 0.3) + Math.random() * 0.12,
    })
  }
  return { notes }
}

/**
 * Develop a theme for a given repetition: identity, transposition, contour
 * inversion, octave lift, or truncation. The ear hears the same idea returning,
 * subtly changed — variation, not a brand-new line every bar.
 */
export function developMotif(theme: Motif, variation: number, poolSize: number): Motif {
  const v = ((variation % 6) + 6) % 6
  const map = (n: MotifNote, pool: number): MotifNote => ({
    ...n,
    pool: clampInt(pool, 0, poolSize - 1),
  })
  switch (v) {
    case 0:
      return theme
    case 1: // up a scale step
      return { notes: theme.notes.map((n) => map(n, n.pool + 1)) }
    case 2: // down two scale steps
      return { notes: theme.notes.map((n) => map(n, n.pool - 2)) }
    case 3: // lift the tail an octave (~4 ladder steps)
      return {
        notes: theme.notes.map((n, i) => (i >= theme.notes.length / 2 ? map(n, n.pool + 4) : n)),
      }
    case 4: // truncate — drop the last note or two, leaving more space
      return { notes: theme.notes.slice(0, Math.max(2, theme.notes.length - 1 - (Math.random() < 0.5 ? 1 : 0))) }
    case 5: // invert the contour around its center
      return { notes: theme.notes.map((n) => map(n, Math.round(2 * ((poolSize - 1) / 2) - n.pool))) }
    default:
      return theme
  }
}

// ── Arrangement ───────────────────────────────────────────────────────────

export interface Section {
  name: string
  bars: number
  drums: boolean
  snare: boolean
  bass: boolean
  chords: boolean
  lead: boolean
  intensity: number
  filter: number
}

const between = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)
const barsFrom = (...opts: number[]): number => pick(opts)

const intro = (): Section => ({
  name: 'Intro', bars: barsFrom(2, 4), drums: true, snare: false, bass: true,
  chords: true, lead: false, intensity: 0.5, filter: 0.5,
})
const groove = (): Section => ({
  name: 'Groove', bars: barsFrom(6, 8, 8), drums: true, snare: true, bass: true,
  chords: true, lead: true, intensity: between(0.92, 1.05), filter: 1,
})
const lift = (): Section => ({
  name: 'Lift', bars: barsFrom(6, 8), drums: true, snare: true, bass: true,
  chords: true, lead: true, intensity: between(1.12, 1.28), filter: 1,
})
const breakdown = (): Section => ({
  name: 'Breakdown', bars: barsFrom(4, 6), drums: false, snare: false, bass: false,
  chords: true, lead: true, intensity: between(0.4, 0.58), filter: between(0.4, 0.6),
})
const build = (): Section => ({
  name: 'Build', bars: barsFrom(2, 4), drums: true, snare: true, bass: true,
  chords: true, lead: true, intensity: between(0.82, 0.95), filter: between(0.66, 0.8),
})
const peak = (): Section => ({
  name: 'Peak', bars: barsFrom(8, 8, 6), drums: true, snare: true, bass: true,
  chords: true, lead: true, intensity: between(1.25, 1.4), filter: 1,
})

/**
 * Assemble a whole-track structure from the block vocabulary. `first` arrangements
 * open with an Intro; later ones (each time the structure loops) skip straight in.
 * Which blocks appear, their order, lengths and energy all vary — so the macro
 * shape is never the same twice.
 */
export function generateArrangement(first: boolean): Section[] {
  const out: Section[] = []
  if (first) out.push(intro())

  out.push(groove()) // always ground it with a groove
  if (Math.random() < 0.8) out.push(lift())
  if (Math.random() < 0.6) out.push(breakdown())
  if (Math.random() < 0.7) out.push(build())
  if (Math.random() < 0.5) out.push(peak())
  // Guarantee enough material that the structure doesn't whip past in a few bars.
  if (out.reduce((n, s) => n + s.bars, 0) < 12) out.push(groove())
  return out
}
