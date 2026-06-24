import * as Tone from 'tone'
import { Drone } from './voices/Drone'
import { Melody } from './voices/Melody'
import { Texture } from './voices/Texture'
import { Scheduler } from './scheduler'
import { buildScalePool } from './scales'
import type { NoteEvent, NoteListener } from './events'
import type { Preset } from '../presets/presets'

/**
 * Owns the whole audio graph and its lifecycle.
 *
 * Signal flow:  voices → bus → filter → reverb → limiter → master → speakers
 *
 * The master chain is built once (lazily, after the first user gesture, because
 * the reverb impulse must be generated asynchronously). Voices and the scheduler
 * are torn down and rebuilt per preset so each mood gets its own oscillators.
 */
export class AudioEngine {
  private built = false
  private playing = false

  private bus!: Tone.Gain
  private filter!: Tone.Filter
  private reverb!: Tone.Reverb
  private limiter!: Tone.Limiter
  private master!: Tone.Gain

  private drone: Drone | null = null
  private melody: Melody | null = null
  private texture: Texture | null = null
  private scheduler: Scheduler | null = null

  private stopTimer: number | null = null

  // Macro state. Density is read live by the scheduler; volume/space drive nodes.
  private density = 0.5
  private space = 0.5
  private volume = 0.7

  private readonly listeners = new Set<NoteListener>()

  get isPlaying(): boolean {
    return this.playing
  }

  onNote(listener: NoteListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit = (event: NoteEvent): void => {
    for (const listener of this.listeners) listener(event)
  }

  private async build(): Promise<void> {
    this.bus = new Tone.Gain(1)
    this.filter = new Tone.Filter({ type: 'lowpass', frequency: 4000, Q: 0.4 })
    this.reverb = new Tone.Reverb({ decay: 9, preDelay: 0.03, wet: 0.5 })
    // Generate the impulse response before any audio reaches the reverb.
    await this.reverb.generate()
    this.limiter = new Tone.Limiter(-2)
    this.master = new Tone.Gain(0)

    this.bus.chain(
      this.filter,
      this.reverb,
      this.limiter,
      this.master,
      Tone.getDestination(),
    )
    this.built = true
  }

  /** Start (or restart) playback with a preset. Call from a user gesture. */
  async start(preset: Preset): Promise<void> {
    // Resume the AudioContext — must originate from a user gesture.
    await Tone.start()
    if (!this.built) await this.build()

    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer)
      this.stopTimer = null
    }

    this.density = preset.density
    this.space = preset.space

    this.buildVoices(preset)
    this.applySpace(0.1)

    const transport = Tone.getTransport()
    transport.bpm.value = preset.bpm
    transport.start()

    this.playing = true
    // Fade up from silence to the current volume.
    this.master.gain.cancelScheduledValues(Tone.now())
    this.master.gain.rampTo(this.volume, 1.5)
  }

  stop(): void {
    if (!this.playing) return
    this.playing = false
    this.master.gain.rampTo(0, 1.2)

    // Let the fade finish before tearing the graph down.
    this.stopTimer = window.setTimeout(() => {
      const transport = Tone.getTransport()
      transport.stop()
      transport.cancel()
      this.teardownVoices()
      this.stopTimer = null
    }, 1400)
  }

  /** Switch mood live, crossfading the bed and re-voicing the performance. */
  setPreset(preset: Preset): void {
    if (!this.playing) return
    this.teardownVoices()
    this.buildVoices(preset)
    Tone.getTransport().bpm.rampTo(preset.bpm, 2)
    this.applySpace(1.5)
  }

  setVolume(value: number): void {
    this.volume = value
    if (this.built && this.playing) this.master.gain.rampTo(value, 0.15)
  }

  setDensity(value: number): void {
    this.density = value
  }

  setSpace(value: number): void {
    this.space = value
    this.applySpace(0.4)
  }

  /** Map the space macro onto reverb wetness and filter brightness. */
  private applySpace(ramp: number): void {
    if (!this.built) return
    const wet = 0.18 + this.space * 0.7
    // More space → darker and more distant; less space → close and bright.
    const cutoff = 1400 + (1 - this.space) * 5600
    this.reverb.wet.rampTo(wet, ramp)
    this.filter.frequency.rampTo(cutoff, ramp)
  }

  private buildVoices(preset: Preset): void {
    const rootMidi = Tone.Frequency(preset.root).toMidi()

    this.drone = new Drone(this.bus, rootMidi, preset.drone)
    this.melody = new Melody(this.bus, preset.melody)
    this.texture = new Texture(this.bus, preset.texture)

    this.scheduler = new Scheduler({
      melody: this.melody,
      texture: this.texture,
      // Melody sits an octave above the bed; texture two octaves up.
      melodyPool: buildScalePool(rootMidi + 12, preset.scale, 3),
      texturePool: buildScalePool(rootMidi + 24, preset.scale, 2),
      getDensity: () => this.density,
      emit: this.emit,
    })
    this.scheduler.start()
  }

  private teardownVoices(): void {
    this.scheduler?.stop()
    this.drone?.dispose()
    this.melody?.dispose()
    this.texture?.dispose()
    this.scheduler = null
    this.drone = null
    this.melody = null
    this.texture = null
  }

  /** Release everything. Used on unmount. */
  dispose(): void {
    if (this.stopTimer !== null) window.clearTimeout(this.stopTimer)
    this.teardownVoices()
    if (this.built) {
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      this.bus.dispose()
      this.filter.dispose()
      this.reverb.dispose()
      this.limiter.dispose()
      this.master.dispose()
    }
    this.listeners.clear()
  }
}
