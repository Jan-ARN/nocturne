import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildPoly, type PatchSpec } from '../patches'

/**
 * The lead line. Used a few ways depending on groove: sparse sprinkles over beats,
 * a continuous arpeggio for synthwave, a repetitive motif (often with a dubby
 * delay) for house, or slow bell tones in ambient. Whatever instrument the track
 * drew — Bell, Glass, Marimba, Pluck, Harp — always lands on scale/chord tones.
 */
export class Melody {
  private readonly out: Tone.Gain
  private readonly level: number
  private readonly synth: Tone.PolySynth
  private readonly delay: Tone.FeedbackDelay | null
  private disposed = false

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.42) {
    this.level = level
    this.out = new Tone.Gain(level).connect(dest)

    if (spec.delay) {
      this.delay = new Tone.FeedbackDelay({
        delayTime: spec.delay.time,
        feedback: spec.delay.feedback,
        wet: spec.delay.wet,
      }).connect(this.out)
    } else {
      this.delay = null
    }

    this.synth = buildPoly(spec, 16).connect(this.delay ?? this.out)
  }

  trigger(midi: number, time: number, velocity: number, duration: Tone.Unit.Time = '4n'): void {
    if (this.disposed) return
    this.synth.triggerAttackRelease(midiToFreq(midi), duration, time, velocity)
  }

  setMuted(muted: boolean): void {
    if (this.disposed) return
    this.out.gain.rampTo(muted ? 0 : this.level, 0.08)
  }

  dispose(fade = 1.2): void {
    if (this.disposed) return
    this.disposed = true
    this.out.gain.rampTo(0, fade)
    window.setTimeout(() => {
      this.synth.dispose()
      this.delay?.dispose()
      this.out.dispose()
    }, fade * 1000 + 200)
  }
}
