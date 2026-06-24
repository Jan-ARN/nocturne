import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildPoly, type PatchSpec } from '../patches'
import { Voice } from './Voice'

/**
 * The lead line, used differently per groove: sparse notes over beats, a running
 * arpeggio for synthwave, a repeating motif (often delayed) for house, slow bells
 * in ambient. Whatever instrument the track drew, it lands on scale/chord tones.
 */
export class Melody extends Voice {
  private readonly synth: Tone.PolySynth
  private readonly delay: Tone.FeedbackDelay | null

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.42) {
    super(dest, level, 1.2)

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

  protected disposeNodes(): void {
    this.synth.dispose()
    this.delay?.dispose()
  }
}
