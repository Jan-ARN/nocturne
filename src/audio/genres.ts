import type { Archetype, PatchSpec } from './patches'
import { makePatch } from './patches'
import type { ScaleName } from './scales'

// A genre is the *character* of a track: how it grooves, what tempo and scales it
// lives in, which instrument archetypes it draws from, how it's mixed and what the
// visual does. The musical content (progression, melody, structure) is generated;
// the genre just sets the rules. Adding a genre is almost entirely data — the
// sequencer branches on a small set of reusable grooves, not on genre id.

export type GenreId =
  | 'lofi' | 'boombap' | 'triphop'
  | 'house' | 'techno'
  | 'synthwave' | 'dreamwave'
  | 'dnb' | 'ambient'

/** The rhythm engine a genre uses. Several genres can share one. */
export type GrooveId = 'beats' | 'four' | 'arp' | 'breaks' | 'ambient'

/** Mutable layers the user can mute/unmute live. */
export type Layer = 'drums' | 'chords' | 'bass' | 'lead'
export const LAYERS: Layer[] = ['drums', 'chords', 'bass', 'lead']

export interface DrumKitConfig {
  kick: { pitchDecay: number; octaves: number; decay: number; volume: number }
  snare: { decay: number; filterFreq: number; Q: number; volume: number }
  hat: { filterFreq: number; volume: number }
}

export interface FxConfig {
  chorusWet: number
  reverbMin: number
  reverbMax: number
  pump: number
  pumpRecovery: number
}

export interface HarmonyProfile {
  seventh: number
  ninth: number
  vamp: number
}

/** Which garnish percussion a groove layers in for this genre. */
export interface PercFlags {
  conga?: boolean
  clave?: boolean
  shaker?: boolean
  openHat?: boolean
}

/** How the background visual behaves for this genre. */
export interface VisualStyle {
  drift: number
  grid?: boolean
}

/** Instrument archetypes a track may draw for each voice. */
export interface VoicePools {
  chord: Archetype[]
  bass: Archetype[]
  lead: Archetype[]
}

export interface Genre {
  id: GenreId
  name: string
  /** One-line description for the genre picker. */
  blurb: string
  groove: GrooveId
  swing: number
  tempoRange: [number, number]
  scales: ScaleName[]
  harmony: HarmonyProfile
  perc: PercFlags
  visual: VisualStyle
  fx: FxConfig
  kit: DrumKitConfig
  voices: VoicePools
}

/** The instruments a single track is playing. */
export interface TrackTimbres {
  chord: PatchSpec
  bass: PatchSpec
  lead: PatchSpec
}

export const GENRES: Record<GenreId, Genre> = {
  // ── Beats family ───────────────────────────────────────────────────────
  lofi: {
    id: 'lofi', name: 'Lo-Fi', blurb: 'Dusty keys, swung & warm',
    groove: 'beats', swing: 0.4, tempoRange: [70, 88],
    scales: ['minorPentatonic', 'majorPentatonic', 'kumoi', 'dorian'],
    harmony: { seventh: 0.85, ninth: 0.45, vamp: 0.15 },
    perc: {}, visual: { drift: 1 },
    fx: { chorusWet: 0.3, reverbMin: 0.12, reverbMax: 0.55, pump: 0, pumpRecovery: 0.25 },
    kit: {
      kick: { pitchDecay: 0.045, octaves: 5, decay: 0.45, volume: 2 },
      snare: { decay: 0.18, filterFreq: 1700, Q: 0.7, volume: -9 },
      hat: { filterFreq: 7500, volume: -20 },
    },
    voices: {
      chord: ['rhodes', 'organ', 'airpad'],
      bass: ['sub', 'round'],
      lead: ['rhodes', 'marimba', 'pluck', 'harp'],
    },
  },
  boombap: {
    id: 'boombap', name: 'Boom-Bap', blurb: 'Hard-knock 90s hip-hop',
    groove: 'beats', swing: 0.16, tempoRange: [86, 96],
    scales: ['minorPentatonic', 'dorian', 'aeolian'],
    harmony: { seventh: 0.7, ninth: 0.35, vamp: 0.25 },
    perc: { clave: true }, visual: { drift: 1 },
    fx: { chorusWet: 0.12, reverbMin: 0.08, reverbMax: 0.4, pump: 0.12, pumpRecovery: 0.2 },
    kit: {
      kick: { pitchDecay: 0.03, octaves: 6, decay: 0.42, volume: 4 },
      snare: { decay: 0.22, filterFreq: 1900, Q: 0.8, volume: -4 },
      hat: { filterFreq: 8000, volume: -18 },
    },
    voices: {
      chord: ['rhodes', 'organ'],
      bass: ['sub', 'round', 'fmbass'],
      lead: ['rhodes', 'bell', 'pluck', 'marimba'],
    },
  },
  triphop: {
    id: 'triphop', name: 'Trip-Hop', blurb: 'Slow, dark, cinematic',
    groove: 'beats', swing: 0.2, tempoRange: [76, 90],
    scales: ['aeolian', 'phrygian', 'kumoi', 'minorPentatonic'],
    harmony: { seventh: 0.8, ninth: 0.4, vamp: 0.3 },
    perc: { clave: true }, visual: { drift: 0.8 },
    fx: { chorusWet: 0.2, reverbMin: 0.2, reverbMax: 0.7, pump: 0.2, pumpRecovery: 0.25 },
    kit: {
      kick: { pitchDecay: 0.05, octaves: 6, decay: 0.5, volume: 4 },
      snare: { decay: 0.3, filterFreq: 1500, Q: 0.7, volume: -5 },
      hat: { filterFreq: 7000, volume: -19 },
    },
    voices: {
      chord: ['rhodes', 'choir', 'airpad'],
      bass: ['sub', 'reece', 'fmbass'],
      lead: ['bell', 'glass', 'rhodes', 'harp'],
    },
  },

  // ── Four-on-the-floor family ─────────────────────────────────────────────
  house: {
    id: 'house', name: 'House', blurb: 'Organic, Afro, sun-soaked',
    groove: 'four', swing: 0.16, tempoRange: [118, 125],
    scales: ['minorPentatonic', 'majorPentatonic', 'dorian', 'mixolydian'],
    harmony: { seventh: 0.5, ninth: 0.2, vamp: 0.6 },
    perc: { conga: true, clave: true, shaker: true, openHat: true }, visual: { drift: 1.25 },
    fx: { chorusWet: 0.12, reverbMin: 0.1, reverbMax: 0.4, pump: 0.45, pumpRecovery: 0.22 },
    kit: {
      kick: { pitchDecay: 0.04, octaves: 6, decay: 0.34, volume: 4 },
      snare: { decay: 0.12, filterFreq: 1400, Q: 1.0, volume: -13 },
      hat: { filterFreq: 9000, volume: -18 },
    },
    voices: {
      chord: ['sawpad', 'organ', 'rhodes'],
      bass: ['sub', 'round', 'fmbass'],
      lead: ['marimba', 'pluck', 'glass', 'bell'],
    },
  },
  techno: {
    id: 'techno', name: 'Techno', blurb: 'Hypnotic, deep, dub stabs',
    groove: 'four', swing: 0, tempoRange: [124, 132],
    scales: ['minorPentatonic', 'phrygian', 'aeolian'],
    harmony: { seventh: 0.4, ninth: 0.15, vamp: 0.75 },
    perc: { shaker: true, openHat: true, clave: true }, visual: { drift: 1.35 },
    fx: { chorusWet: 0.1, reverbMin: 0.14, reverbMax: 0.6, pump: 0.5, pumpRecovery: 0.2 },
    kit: {
      kick: { pitchDecay: 0.03, octaves: 7, decay: 0.3, volume: 5 },
      snare: { decay: 0.1, filterFreq: 1800, Q: 1.2, volume: -14 },
      hat: { filterFreq: 9500, volume: -16 },
    },
    voices: {
      chord: ['organ', 'sawpad', 'glass'],
      bass: ['sub', 'reece', 'fmbass'],
      lead: ['glass', 'bell', 'pluck'],
    },
  },

  // ── Arp family ───────────────────────────────────────────────────────────
  synthwave: {
    id: 'synthwave', name: 'Synthwave', blurb: 'Neon arpeggios, chrome',
    groove: 'arp', swing: 0, tempoRange: [98, 116],
    scales: ['minorPentatonic', 'lydian', 'aeolian', 'phrygian'],
    harmony: { seventh: 0.4, ninth: 0.15, vamp: 0.3 },
    perc: { openHat: true }, visual: { drift: 1.4, grid: true },
    fx: { chorusWet: 0.18, reverbMin: 0.08, reverbMax: 0.35, pump: 0.3, pumpRecovery: 0.18 },
    kit: {
      kick: { pitchDecay: 0.035, octaves: 6, decay: 0.4, volume: 4 },
      snare: { decay: 0.3, filterFreq: 1500, Q: 0.6, volume: -6 },
      hat: { filterFreq: 8500, volume: -17 },
    },
    voices: {
      chord: ['sawpad', 'organ', 'choir'],
      bass: ['acid', 'reece', 'fmbass'],
      lead: ['sawpad', 'glass', 'bell', 'pluck'],
    },
  },
  dreamwave: {
    id: 'dreamwave', name: 'Dreamwave', blurb: 'Washed, slow, weightless',
    groove: 'arp', swing: 0, tempoRange: [88, 104],
    scales: ['lydian', 'majorPentatonic', 'mixolydian', 'aeolian'],
    harmony: { seventh: 0.6, ninth: 0.4, vamp: 0.4 },
    perc: { openHat: true }, visual: { drift: 1.1 },
    fx: { chorusWet: 0.3, reverbMin: 0.25, reverbMax: 0.75, pump: 0.2, pumpRecovery: 0.2 },
    kit: {
      kick: { pitchDecay: 0.04, octaves: 5, decay: 0.45, volume: 2 },
      snare: { decay: 0.4, filterFreq: 1300, Q: 0.5, volume: -10 },
      hat: { filterFreq: 7800, volume: -20 },
    },
    voices: {
      chord: ['sawpad', 'choir', 'airpad'],
      bass: ['sub', 'round'],
      lead: ['glass', 'bell', 'harp', 'airpad'],
    },
  },

  // ── Breakbeat ────────────────────────────────────────────────────────────
  dnb: {
    id: 'dnb', name: 'Liquid DnB', blurb: 'Rolling breaks, deep sub',
    groove: 'breaks', swing: 0, tempoRange: [168, 176],
    scales: ['minorPentatonic', 'dorian', 'aeolian', 'majorPentatonic'],
    harmony: { seventh: 0.7, ninth: 0.4, vamp: 0.4 },
    perc: { shaker: true, openHat: true }, visual: { drift: 1.6 },
    fx: { chorusWet: 0.16, reverbMin: 0.16, reverbMax: 0.6, pump: 0.25, pumpRecovery: 0.12 },
    kit: {
      kick: { pitchDecay: 0.028, octaves: 7, decay: 0.32, volume: 4 },
      snare: { decay: 0.16, filterFreq: 2200, Q: 0.9, volume: -4 },
      hat: { filterFreq: 9500, volume: -18 },
    },
    voices: {
      chord: ['sawpad', 'choir', 'rhodes'],
      bass: ['reece', 'sub', 'fmbass'],
      lead: ['bell', 'glass', 'pluck', 'harp'],
    },
  },

  // ── Ambient ──────────────────────────────────────────────────────────────
  ambient: {
    id: 'ambient', name: 'Ambient', blurb: 'Beatless, drifting drones',
    groove: 'ambient', swing: 0, tempoRange: [52, 70],
    scales: ['lydian', 'aeolian', 'majorPentatonic', 'kumoi', 'dorian'],
    harmony: { seventh: 0.7, ninth: 0.55, vamp: 0.5 },
    perc: {}, visual: { drift: 0.5 },
    fx: { chorusWet: 0.35, reverbMin: 0.45, reverbMax: 0.9, pump: 0, pumpRecovery: 0.3 },
    kit: {
      kick: { pitchDecay: 0.05, octaves: 5, decay: 0.5, volume: -4 },
      snare: { decay: 0.4, filterFreq: 1200, Q: 0.5, volume: -16 },
      hat: { filterFreq: 7000, volume: -24 },
    },
    voices: {
      chord: ['airpad', 'choir', 'sawpad'],
      bass: ['sub', 'round'],
      lead: ['glass', 'bell', 'harp', 'marimba'],
    },
  },
}

// ── Per-track randomization ─────────────────────────────────────────────────

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo)
const choose = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]
const jitter = (v: number, amt: number): number => v * (1 + (Math.random() * 2 - 1) * amt)

/** Draw a fresh instrument for each voice from the genre's archetype pools. */
export function makeTimbres(id: GenreId): TrackTimbres {
  const g = GENRES[id]
  const chord = makePatch(choose(g.voices.chord))
  const bass = makePatch(choose(g.voices.bass))
  const lead = makePatch(choose(g.voices.lead))

  // Echo garnish on the lead — always for spacious grooves, sometimes elsewhere.
  if (g.groove === 'four' || g.groove === 'ambient' || g.groove === 'arp' || Math.random() < 0.3) {
    const times: Array<'8n' | '8n.' | '4n'> = ['8n', '8n.', '4n']
    lead.delay = { time: choose(times), feedback: rand(0.2, 0.42), wet: rand(0.18, 0.36) }
  }
  return { chord, bass, lead }
}

/** A fresh drum voicing — tuning, brightness and decay drift around the genre kit. */
export function makeKit(id: GenreId): DrumKitConfig {
  const base = GENRES[id].kit
  return {
    kick: {
      pitchDecay: jitter(base.kick.pitchDecay, 0.35),
      octaves: jitter(base.kick.octaves, 0.15),
      decay: jitter(base.kick.decay, 0.3),
      volume: base.kick.volume + rand(-1, 1),
    },
    snare: {
      decay: jitter(base.snare.decay, 0.35),
      filterFreq: jitter(base.snare.filterFreq, 0.3),
      Q: jitter(base.snare.Q, 0.4),
      volume: base.snare.volume + rand(-1.5, 1.5),
    },
    hat: {
      filterFreq: jitter(base.hat.filterFreq, 0.2),
      volume: base.hat.volume + rand(-1.5, 1.5),
    },
  }
}
