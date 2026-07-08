import type { Archetype } from '../audio/patches'
import type { DrumSound, StudioGenre, Track } from './types'
import { emptyRow, STEPS } from './types'
import { DRUM_SOUNDS, SYNTH_ARCHETYPES } from './sounds'
import { uid } from './storage'

// Two ready-to-play projects seeded the first time the Motherload is opened, so the
// grid is never blank on arrival. They're ordinary genres — fully editable and
// deletable like anything the user makes.

function labelFor(sound: DrumSound): string {
  return DRUM_SOUNDS.find((d) => d.sound === sound)?.label ?? sound
}

function synthLabel(archetype: Archetype): string {
  return SYNTH_ARCHETYPES.find((s) => s.archetype === archetype)?.label ?? archetype
}

function drum(sound: DrumSound, steps: number[]): { track: Track; steps: number[] } {
  return { track: { id: uid(), kind: 'drum', sound, label: labelFor(sound) }, steps }
}

function synth(archetype: Archetype, degree: number, steps: number[]): { track: Track; steps: number[] } {
  return { track: { id: uid(), kind: 'synth', archetype, degree, label: synthLabel(archetype) }, steps }
}

function build(
  meta: Pick<StudioGenre, 'name' | 'bpm' | 'swing' | 'scale' | 'root'>,
  lanes: { track: Track; steps: number[] }[],
): StudioGenre {
  const tracks: Track[] = []
  const pattern: Record<string, boolean[]> = {}
  for (const { track, steps } of lanes) {
    tracks.push(track)
    const row = emptyRow()
    for (const s of steps) if (s >= 0 && s < STEPS) row[s] = true
    pattern[track.id] = row
  }
  return { id: uid(), ...meta, tracks, pattern }
}

export function makeStarters(): StudioGenre[] {
  return [
    build(
      { name: 'Boom Bap', bpm: 90, swing: 0.18, scale: 'minorPentatonic', root: 9 },
      [
        drum('kick', [0, 6, 10]),
        drum('snare', [4, 12]),
        drum('hat', [0, 2, 4, 6, 8, 10, 12, 14]),
        synth('sub', 0, [0, 10]),
        synth('rhodes', 9, [4, 12]),
      ],
    ),
    build(
      { name: 'House Pulse', bpm: 122, swing: 0.14, scale: 'dorian', root: 0 },
      [
        drum('kick', [0, 4, 8, 12]),
        drum('openhat', [2, 6, 10, 14]),
        drum('clave', [3, 11]),
        drum('shaker', [1, 3, 5, 7, 9, 11, 13, 15]),
        synth('sub', 0, [0, 4, 8, 12]),
        synth('pluck', 11, [2, 6, 7, 10, 14]),
      ],
    ),
  ]
}
