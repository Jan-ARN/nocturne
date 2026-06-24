import * as Tone from 'tone'
import { midiToFreq } from '../scales'

export interface MelodyConfig {
  waveform: OscillatorType
  /** Output level, 0..1. */
  level: number
  /** Soft attack in seconds — long attacks keep notes from poking out. */
  attack: number
  /** Long release in seconds — notes bloom into the reverb tail. */
  release: number
}

/**
 * Sparse, soft procedural notes. The scheduler decides when one fires and which
 * scale degree it is; this voice just plays it gently and polyphonically so
 * overlapping notes ring together.
 */
export class Melody {
  private readonly out: Tone.Gain
  private readonly synth: Tone.PolySynth<Tone.Synth>
  private disposed = false

  constructor(dest: Tone.InputNode, cfg: MelodyConfig) {
    this.out = new Tone.Gain(cfg.level).connect(dest)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: cfg.waveform },
      envelope: {
        attack: cfg.attack,
        decay: 0.4,
        sustain: 0.25,
        release: cfg.release,
      },
      volume: -8,
    }).connect(this.out)
    this.synth.maxPolyphony = 24
  }

  /** Trigger a MIDI note at audio-clock `time` with the given 0..1 velocity. */
  trigger(midi: number, time: number, velocity: number): void {
    if (this.disposed) return
    this.synth.triggerAttackRelease(midiToFreq(midi), '2n', time, velocity)
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
