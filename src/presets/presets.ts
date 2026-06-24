import type { ScaleName } from '../audio/scales'
import type { GenreId } from '../audio/genres'

export interface Palette {
  /** Two-stop radial backdrop, inner → outer. */
  background: [string, string]
  /** Drifting blob colors. */
  blobs: string[]
  /** Color of the soft pulse a note triggers. */
  pulse: string
  /** UI accent (buttons, active states). */
  accent: string
}

export interface Preset {
  id: string
  name: string
  blurb: string
  genre: GenreId
  /** Key root as a note name in the bass register (e.g. "A2"). */
  root: string
  /** Starting scale (Shuffle re-rolls within the genre's pool). */
  scale: ScaleName
  bpm: number
  /** Default macro positions, 0..1. */
  density: number
  space: number
  /** Master warmth: lowpass cutoff in Hz (lower = duskier). */
  warmth: number
  palette: Palette
}

export const PRESETS: Preset[] = [
  // ── Lo-Fi ──────────────────────────────────────────────────────────
  {
    id: 'dusk', name: 'Dusk', blurb: 'Warm keys, last light',
    genre: 'lofi', root: 'A2', scale: 'minorPentatonic', bpm: 82, density: 0.5, space: 0.5, warmth: 3400,
    palette: { background: ['#241326', '#0c0710'], blobs: ['#e8956b', '#c45d8a', '#6d4a8f', '#f0b67f'], pulse: '#ffd9a0', accent: '#f0a878' },
  },
  {
    id: 'rain', name: 'Rain', blurb: 'Grey skies, mellow keys',
    genre: 'lofi', root: 'D2', scale: 'kumoi', bpm: 78, density: 0.55, space: 0.45, warmth: 3000,
    palette: { background: ['#16252e', '#080d12'], blobs: ['#5b8aa6', '#7fa9b8', '#4a6b80', '#9ec3cf'], pulse: '#cfeaf2', accent: '#8fc0d4' },
  },

  // ── Boom-Bap ───────────────────────────────────────────────────────
  {
    id: 'crate', name: 'Crate', blurb: 'Dusty soul samples',
    genre: 'boombap', root: 'C2', scale: 'minorPentatonic', bpm: 90, density: 0.6, space: 0.4, warmth: 3600,
    palette: { background: ['#2a2113', '#0f0b06'], blobs: ['#c89b4a', '#b06b3a', '#8a6a3a', '#d8b46a'], pulse: '#f2d89a', accent: '#d6a24e' },
  },
  {
    id: 'dilla', name: 'Dilla', blurb: 'Drunk swing, fat snare',
    genre: 'boombap', root: 'F2', scale: 'dorian', bpm: 88, density: 0.62, space: 0.42, warmth: 3300,
    palette: { background: ['#26172a', '#0d0710'], blobs: ['#a05cc4', '#c46d8a', '#7a5ac0', '#d49ad0'], pulse: '#e6c0f0', accent: '#b574d6' },
  },

  // ── Trip-Hop ───────────────────────────────────────────────────────
  {
    id: 'bristol', name: 'Bristol', blurb: 'Rain-slick, noir',
    genre: 'triphop', root: 'E2', scale: 'aeolian', bpm: 82, density: 0.5, space: 0.6, warmth: 2800,
    palette: { background: ['#16191f', '#070809'], blobs: ['#4a5a6a', '#6a7a8a', '#3a4a5a', '#8a98a6'], pulse: '#c0ccd6', accent: '#7e8c9a' },
  },
  {
    id: 'smoke', name: 'Smoke', blurb: 'Dark, smouldering',
    genre: 'triphop', root: 'A2', scale: 'phrygian', bpm: 80, density: 0.48, space: 0.62, warmth: 2600,
    palette: { background: ['#1f141a', '#0b0608'], blobs: ['#8a4a5a', '#a05c6a', '#6a3a4a', '#b06a7a'], pulse: '#e0a8b4', accent: '#a85f6e' },
  },

  // ── House ──────────────────────────────────────────────────────────
  {
    id: 'sunset', name: 'Sunset', blurb: 'Organic, golden hour',
    genre: 'house', root: 'A2', scale: 'minorPentatonic', bpm: 121, density: 0.6, space: 0.55, warmth: 4200,
    palette: { background: ['#2a1620', '#0d0608'], blobs: ['#e8896b', '#d6608a', '#f0a86b', '#c4708a'], pulse: '#ffd0a8', accent: '#e8956b' },
  },
  {
    id: 'jungle', name: 'Jungle', blurb: 'Afro house, deep & green',
    genre: 'house', root: 'E2', scale: 'dorian', bpm: 122, density: 0.64, space: 0.52, warmth: 4000,
    palette: { background: ['#10231e', '#050d0a'], blobs: ['#3fa07a', '#5fb0a0', '#7fae6a', '#9ed0a0'], pulse: '#c0f0d8', accent: '#5fc09a' },
  },

  // ── Techno ─────────────────────────────────────────────────────────
  {
    id: 'tunnel', name: 'Tunnel', blurb: 'Hypnotic, relentless',
    genre: 'techno', root: 'A2', scale: 'phrygian', bpm: 128, density: 0.7, space: 0.5, warmth: 4400,
    palette: { background: ['#141418', '#060608'], blobs: ['#5a5a6a', '#7a7a90', '#4a4a5a', '#9a9ab0'], pulse: '#d0d0e0', accent: '#8a8aa6' },
  },
  {
    id: 'cobalt', name: 'Cobalt', blurb: 'Dub stabs, blue depth',
    genre: 'techno', root: 'D2', scale: 'minorPentatonic', bpm: 130, density: 0.72, space: 0.55, warmth: 4600,
    palette: { background: ['#0c1626', '#04060f'], blobs: ['#3a5a9e', '#4d7ec0', '#2d4a7e', '#6a9ad6'], pulse: '#a8c8ff', accent: '#4d80d0' },
  },

  // ── Synthwave ──────────────────────────────────────────────────────
  {
    id: 'neon', name: 'Neon', blurb: 'Arpeggios, chrome & pink',
    genre: 'synthwave', root: 'A2', scale: 'minorPentatonic', bpm: 104, density: 0.7, space: 0.45, warmth: 5500,
    palette: { background: ['#1a0a2a', '#06040f'], blobs: ['#ff4d9e', '#7c4dff', '#4dd0ff', '#b04dff'], pulse: '#ff80d0', accent: '#ff4d9e' },
  },
  {
    id: 'outrun', name: 'Outrun', blurb: 'Night drive, horizon glow',
    genre: 'synthwave', root: 'E2', scale: 'aeolian', bpm: 110, density: 0.72, space: 0.42, warmth: 5800,
    palette: { background: ['#0a1230', '#04060f'], blobs: ['#4dd0ff', '#ff4da6', '#7c5cff', '#4d9eff'], pulse: '#a0e0ff', accent: '#4dd0ff' },
  },

  // ── Dreamwave ──────────────────────────────────────────────────────
  {
    id: 'pastel', name: 'Pastel', blurb: 'Soft focus, lighter than air',
    genre: 'dreamwave', root: 'C2', scale: 'lydian', bpm: 96, density: 0.55, space: 0.62, warmth: 5200,
    palette: { background: ['#1e1a2e', '#0a0812'], blobs: ['#b0a0e0', '#e0a0d0', '#a0c0e8', '#d0b0f0'], pulse: '#e8d8ff', accent: '#c0a8f0' },
  },
  {
    id: 'vapor', name: 'Vapor', blurb: 'Mallrat nostalgia',
    genre: 'dreamwave', root: 'G2', scale: 'majorPentatonic', bpm: 92, density: 0.52, space: 0.6, warmth: 5000,
    palette: { background: ['#221a2a', '#0b0810'], blobs: ['#ff9ec4', '#9ed8e0', '#c0a0e0', '#ffd0e0'], pulse: '#ffe0f0', accent: '#ff9ec4' },
  },

  // ── Liquid DnB ─────────────────────────────────────────────────────
  {
    id: 'current', name: 'Current', blurb: 'Rolling, liquid, deep',
    genre: 'dnb', root: 'A2', scale: 'minorPentatonic', bpm: 172, density: 0.68, space: 0.55, warmth: 4800,
    palette: { background: ['#0c1f26', '#04090c'], blobs: ['#3aa0a0', '#4dc0b0', '#2d7e90', '#6ad0c0'], pulse: '#a8f0e0', accent: '#4dc0b0' },
  },
  {
    id: 'atlas', name: 'Atlas', blurb: 'Soulful breaks, wide sky',
    genre: 'dnb', root: 'D2', scale: 'dorian', bpm: 174, density: 0.7, space: 0.58, warmth: 5000,
    palette: { background: ['#15182a', '#060810'], blobs: ['#6a8ad0', '#9e6ad0', '#4d9ec0', '#b0a0e8'], pulse: '#c8d8ff', accent: '#7e9ad6' },
  },

  // ── Ambient ────────────────────────────────────────────────────────
  {
    id: 'glacier', name: 'Glacier', blurb: 'Vast, beatless, still',
    genre: 'ambient', root: 'C2', scale: 'lydian', bpm: 60, density: 0.32, space: 0.85, warmth: 4200,
    palette: { background: ['#0e1c24', '#04090d'], blobs: ['#5a90a8', '#7ab0c0', '#90c8d8', '#a0d8e0'], pulse: '#d0f0ff', accent: '#7ab8cf' },
  },
  {
    id: 'nimbus', name: 'Nimbus', blurb: 'Slow clouds, deep reverb',
    genre: 'ambient', root: 'E2', scale: 'aeolian', bpm: 58, density: 0.3, space: 0.9, warmth: 3800,
    palette: { background: ['#1a1726', '#08070f'], blobs: ['#7a6ab0', '#9e8ad0', '#6a5a9e', '#b0a0e0'], pulse: '#ddd0ff', accent: '#9282d0' },
  },
]

export const DEFAULT_PRESET = PRESETS[0]

export function presetsByGenre(genre: GenreId): Preset[] {
  return PRESETS.filter((p) => p.genre === genre)
}
