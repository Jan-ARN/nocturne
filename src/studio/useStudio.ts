import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Archetype } from '../audio/patches'
import type { ScaleName } from '../audio/scales'
import { DRUM_SOUNDS, SYNTH_ARCHETYPES } from './sounds'
import { makeStarters } from './starters'
import {
  loadGenres, loadLastGenreId, saveGenres, saveLastGenreId, uid,
} from './storage'
import { emptyRow, type DrumSound, type StudioGenre, type Track } from './types'

function labelForDrum(sound: DrumSound): string {
  return DRUM_SOUNDS.find((d) => d.sound === sound)?.label ?? sound
}
function labelForSynth(archetype: Archetype): string {
  return SYNTH_ARCHETYPES.find((s) => s.archetype === archetype)?.label ?? archetype
}

/**
 * Owns the Studio's genre library: loads it from localStorage (seeding starters on a
 * first visit), tracks which genre is open, and exposes immutable mutators. Every
 * change is persisted, so a hand-made beat survives a reload.
 */
export function useStudio() {
  const [genres, setGenres] = useState<StudioGenre[]>(() => {
    const loaded = loadGenres()
    return loaded.length ? loaded : makeStarters()
  })
  const [currentId, setCurrentId] = useState<string>(() => {
    const last = loadLastGenreId()
    return last ?? ''
  })

  // Ensure a valid selection (after load, after a delete).
  useEffect(() => {
    if (!genres.length) return
    if (!genres.some((g) => g.id === currentId)) setCurrentId(genres[0].id)
  }, [genres, currentId])

  useEffect(() => {
    saveGenres(genres)
  }, [genres])
  useEffect(() => {
    if (currentId) saveLastGenreId(currentId)
  }, [currentId])

  const current = useMemo(
    () => genres.find((g) => g.id === currentId) ?? genres[0] ?? null,
    [genres, currentId],
  )

  // Keep a ref so mutators can read the live current id without re-binding.
  const currentIdRef = useRef(currentId)
  currentIdRef.current = current?.id ?? currentId

  const patch = useCallback((updater: (g: StudioGenre) => StudioGenre) => {
    const id = currentIdRef.current
    setGenres((list) => list.map((g) => (g.id === id ? updater(g) : g)))
  }, [])

  const setName = useCallback((name: string) => patch((g) => ({ ...g, name })), [patch])
  const setBpm = useCallback((bpm: number) => patch((g) => ({ ...g, bpm })), [patch])
  const setSwing = useCallback((swing: number) => patch((g) => ({ ...g, swing })), [patch])
  const setScale = useCallback((scale: ScaleName) => patch((g) => ({ ...g, scale })), [patch])
  const setRoot = useCallback((root: number) => patch((g) => ({ ...g, root })), [patch])

  const toggleStep = useCallback((trackId: string, step: number) => {
    patch((g) => {
      const row = (g.pattern[trackId] ?? emptyRow()).slice()
      row[step] = !row[step]
      return { ...g, pattern: { ...g.pattern, [trackId]: row } }
    })
  }, [patch])

  const clearTrack = useCallback((trackId: string) => {
    patch((g) => ({ ...g, pattern: { ...g.pattern, [trackId]: emptyRow() } }))
  }, [patch])

  const setDegree = useCallback((trackId: string, degree: number) => {
    patch((g) => ({
      ...g,
      tracks: g.tracks.map((t) =>
        t.id === trackId && t.kind === 'synth' ? { ...t, degree } : t,
      ),
    }))
  }, [patch])

  const addDrumTrack = useCallback((sound: DrumSound): Track => {
    const track: Track = { id: uid(), kind: 'drum', sound, label: labelForDrum(sound) }
    patch((g) => ({
      ...g,
      tracks: [...g.tracks, track],
      pattern: { ...g.pattern, [track.id]: emptyRow() },
    }))
    return track
  }, [patch])

  const addSynthTrack = useCallback((archetype: Archetype): Track => {
    const track: Track = { id: uid(), kind: 'synth', archetype, degree: 0, label: labelForSynth(archetype) }
    patch((g) => ({
      ...g,
      tracks: [...g.tracks, track],
      pattern: { ...g.pattern, [track.id]: emptyRow() },
    }))
    return track
  }, [patch])

  const removeTrack = useCallback((trackId: string) => {
    patch((g) => {
      const pattern = { ...g.pattern }
      delete pattern[trackId]
      return { ...g, tracks: g.tracks.filter((t) => t.id !== trackId), pattern }
    })
  }, [patch])

  const createGenre = useCallback(() => {
    // Build ids once, outside the updater, so the updater stays pure (it runs twice
    // under StrictMode) and the selection below targets the same genre.
    const id = uid()
    const kick: Track = { id: uid(), kind: 'drum', sound: 'kick', label: 'Kick' }
    setGenres((list) => {
      const n = list.filter((g) => g.name.startsWith('Untitled')).length + 1
      const genre: StudioGenre = {
        id,
        name: `Untitled ${n}`,
        bpm: 100,
        swing: 0.1,
        scale: 'minorPentatonic',
        root: 0,
        tracks: [kick],
        pattern: { [kick.id]: emptyRow() },
      }
      return [...list, genre]
    })
    setCurrentId(id)
  }, [])

  const deleteGenre = useCallback((id: string) => {
    setGenres((list) => (list.length > 1 ? list.filter((g) => g.id !== id) : list))
  }, [])

  const selectGenre = useCallback((id: string) => setCurrentId(id), [])

  return {
    genres,
    current,
    selectGenre,
    createGenre,
    deleteGenre,
    setName,
    setBpm,
    setSwing,
    setScale,
    setRoot,
    toggleStep,
    clearTrack,
    setDegree,
    addDrumTrack,
    addSynthTrack,
    removeTrack,
  }
}
