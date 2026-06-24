import * as Tone from 'tone'
import { midiToFreq } from '../scales'

export interface TextureConfig {
  /** Output level, 0..1. */
  level: number
  /** Bell brightness — higher harmonicity rings more metallic. */
  harmonicity: number
}

/**
 * Occasional bell / pluck accents that sparkle high above the melody. FM
 * synthesis gives an inharmonic, glassy tone with a long decaying tail. Fires
 * rarely — these are punctuation, not rhythm.
 */
export class Texture {
  private readonly out: Tone.Gain
  private readonly synth: Tone.PolySynth<Tone.FMSynth>
  private disposed = false

  constructor(dest: Tone.InputNode, cfg: TextureConfig) {
    this.out = new Tone.Gain(cfg.level).connect(dest)
    this.synth = new Tone.PolySynth(Tone.FMSynth, {
      harmonicity: cfg.harmonicity,
      modulationIndex: 7,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.004, decay: 1.6, sustain: 0, release: 2.4 },
      modulation: { type: 'sine' },
      modulationEnvelope: { attack: 0.01, decay: 0.5, sustain: 0, release: 0.6 },
      volume: -12,
    }).connect(this.out)
    this.synth.maxPolyphony = 12
  }

  trigger(midi: number, time: number, velocity: number): void {
    if (this.disposed) return
    this.synth.triggerAttackRelease(midiToFreq(midi), '4n', time, velocity)
  }

  dispose(fade = 1.5): void {
    if (this.disposed) return
    this.disposed = true
    this.out.gain.rampTo(0, fade)
    window.setTimeout(() => {
      this.synth.dispose()
      this.out.dispose()
    }, fade * 1000 + 200)
  }
}
