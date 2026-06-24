import type { ScaleName } from '../audio/scales'
import type { DroneConfig } from '../audio/voices/Drone'
import type { MelodyConfig } from '../audio/voices/Melody'
import type { TextureConfig } from '../audio/voices/Texture'

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
  /** Root of the bed, as a note name (e.g. "C2"). */
  root: string
  scale: ScaleName
  /** Transport tempo — kept slow so the eighth-note grid is gentle. */
  bpm: number
  /** Default macro positions, 0..1. */
  density: number
  space: number
  drone: DroneConfig
  melody: MelodyConfig
  texture: TextureConfig
  palette: Palette
}

export const PRESETS: Preset[] = [
  {
    id: 'dusk',
    name: 'Dusk',
    blurb: 'Warm, settling, the last light',
    root: 'A2',
    scale: 'majorPentatonic',
    bpm: 56,
    density: 0.45,
    space: 0.55,
    drone: { waveform: 'sine', offsets: [0, 7, 12], level: 0.5, drift: 6 },
    melody: { waveform: 'triangle', level: 0.5, attack: 0.12, release: 3.5 },
    texture: { level: 0.4, harmonicity: 3.01 },
    palette: {
      background: ['#241326', '#0c0710'],
      blobs: ['#e8956b', '#c45d8a', '#6d4a8f', '#f0b67f'],
      pulse: '#ffd9a0',
      accent: '#f0a878',
    },
  },
  {
    id: 'rain',
    name: 'Rain',
    blurb: 'Soft greys, water on glass',
    root: 'D2',
    scale: 'kumoi',
    bpm: 64,
    density: 0.6,
    space: 0.45,
    drone: { waveform: 'triangle', offsets: [0, 5, 12], level: 0.42, drift: 5 },
    melody: { waveform: 'sine', level: 0.46, attack: 0.06, release: 2.6 },
    texture: { level: 0.5, harmonicity: 2.5 },
    palette: {
      background: ['#16252e', '#080d12'],
      blobs: ['#5b8aa6', '#7fa9b8', '#4a6b80', '#9ec3cf'],
      pulse: '#cfeaf2',
      accent: '#8fc0d4',
    },
  },
  {
    id: 'deep-space',
    name: 'Deep Space',
    blurb: 'Vast, cold, slow shimmer',
    root: 'E2',
    scale: 'ryukyu',
    bpm: 48,
    density: 0.3,
    space: 0.8,
    drone: { waveform: 'sine', offsets: [0, 12, 19], level: 0.46, drift: 9 },
    melody: { waveform: 'sine', level: 0.42, attack: 0.25, release: 5 },
    texture: { level: 0.55, harmonicity: 4.02 },
    palette: {
      background: ['#101a33', '#04060f'],
      blobs: ['#3a4f9e', '#6a5acd', '#2d6e9e', '#8e7bd6'],
      pulse: '#bcd0ff',
      accent: '#7c8cf0',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    blurb: 'Green hush, dappled light',
    root: 'G2',
    scale: 'minorPentatonic',
    bpm: 60,
    density: 0.5,
    space: 0.5,
    drone: { waveform: 'sawtooth', offsets: [0, 7, 10], level: 0.34, drift: 5 },
    melody: { waveform: 'triangle', level: 0.48, attack: 0.1, release: 3 },
    texture: { level: 0.45, harmonicity: 3.5 },
    palette: {
      background: ['#152318', '#060c08'],
      blobs: ['#5f9e5a', '#8fae4d', '#3d7a5e', '#bcd17a'],
      pulse: '#e2f2b0',
      accent: '#8fc06a',
    },
  },
]

export const DEFAULT_PRESET = PRESETS[0]
