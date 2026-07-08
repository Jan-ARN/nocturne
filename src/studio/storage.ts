import type { StudioGenre } from './types'

// All Motherload state lives in localStorage so a hand-made beat survives a reload.
// Every access is guarded — private-mode browsers and quota errors must never take
// the app down over an easter egg.

const UNLOCK_KEY = 'nocturne:motherload'
const GENRES_KEY = 'nocturne:studio:genres'
const LAST_KEY = 'nocturne:studio:last'

export function isUnlocked(): boolean {
  try {
    return window.localStorage.getItem(UNLOCK_KEY) === 'true'
  } catch {
    return false
  }
}

export function setUnlocked(value: boolean): void {
  try {
    if (value) window.localStorage.setItem(UNLOCK_KEY, 'true')
    else window.localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* ignore */
  }
}

export function loadGenres(): StudioGenre[] {
  try {
    const raw = window.localStorage.getItem(GENRES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StudioGenre[]) : []
  } catch {
    return []
  }
}

export function saveGenres(genres: StudioGenre[]): void {
  try {
    window.localStorage.setItem(GENRES_KEY, JSON.stringify(genres))
  } catch {
    /* ignore */
  }
}

export function loadLastGenreId(): string | null {
  try {
    return window.localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}

export function saveLastGenreId(id: string): void {
  try {
    window.localStorage.setItem(LAST_KEY, id)
  } catch {
    /* ignore */
  }
}

/** A unique id, with a fallback for browsers without crypto.randomUUID. */
export function uid(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `id-${Date.now()}-${Math.floor(Math.random() * 1e6)}`
  }
}
