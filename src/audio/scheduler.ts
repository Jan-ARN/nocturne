import * as Tone from 'tone'
import type { Melody } from './voices/Melody'
import type { Texture } from './voices/Texture'
import type { NoteEvent } from './events'

export interface SchedulerSources {
  melody: Melody
  texture: Texture
  /** Pool of MIDI notes the melody draws from (scale × octaves). */
  melodyPool: number[]
  /** Higher pool for sparkly texture accents. */
  texturePool: number[]
  /** Current density macro, 0..1, read fresh every tick so it responds live. */
  getDensity: () => number
  /** Fires on each audible note, aligned to the audio clock via Tone.Draw. */
  emit: (event: NoteEvent) => void
}

/**
 * Drives the procedural performance. On every transport tick it rolls dice
 * weighted by density: usually a melody note, occasionally a texture bell. Slow
 * tempo + soft voices + reverb turn this randomness into something that sounds
 * deliberate and never repeats.
 */
export class Scheduler {
  private loop: Tone.Loop | null = null

  constructor(private readonly src: SchedulerSources) {}

  start(): void {
    // An eighth-note grid at the (slow) transport tempo. Most ticks stay silent
    // at low density; the grid just keeps notes loosely in time with the bed.
    this.loop = new Tone.Loop((time) => this.tick(time), '8n').start(0)
  }

  private tick(time: number): void {
    const d = this.src.getDensity()

    // Melody: probability climbs with density. Even at full density we leave
    // gaps so it stays ambient rather than busy.
    const pMelody = 0.05 + d * 0.45
    if (Math.random() < pMelody) {
      this.fire(this.src.melody, this.src.melodyPool, time, {
        kind: 'melody',
        velocityBase: 0.18,
        velocityRange: 0.35,
      })
    }

    // Texture: rare punctuation regardless of density.
    const pTexture = 0.012 + d * 0.05
    if (Math.random() < pTexture) {
      this.fire(this.src.texture, this.src.texturePool, time, {
        kind: 'texture',
        velocityBase: 0.25,
        velocityRange: 0.4,
      })
    }
  }

  private fire(
    voice: Melody | Texture,
    pool: number[],
    time: number,
    opts: { kind: NoteEvent['kind']; velocityBase: number; velocityRange: number },
  ): void {
    if (pool.length === 0) return
    const midi = pool[Math.floor(Math.random() * pool.length)]
    const velocity = opts.velocityBase + Math.random() * opts.velocityRange
    // Humanize a touch so notes don't all land dead on the grid.
    const jitter = Math.random() * 0.04
    voice.trigger(midi, time + jitter, velocity)
    // Schedule the visual pulse on the draw clock so it lands when the note is
    // actually heard, not when it was scheduled ahead of time.
    Tone.getDraw().schedule(() => {
      this.src.emit({ kind: opts.kind, intensity: velocity })
    }, time + jitter)
  }

  stop(): void {
    this.loop?.stop()
    this.loop?.dispose()
    this.loop = null
  }
}
