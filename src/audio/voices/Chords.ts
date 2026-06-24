import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildPoly, type PatchSpec } from '../patches'
import { Voice } from './Voice'

/**
 * The harmonic bed. Plays the progression's voiced chords on whatever instrument
 * the track drew (Rhodes, saw pad, organ, choir). Polyphonic so voicings ring out.
 */
export class Chords extends Voice {
  private readonly synth: Tone.PolySynth

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.5) {
    super(dest, level, 1.2)
    this.synth = buildPoly(spec, 32).connect(this.out)
  }

  trigger(midis: number[], time: number, velocity: number, duration: Tone.Unit.Time = '2n'): void {
    if (this.disposed || midis.length === 0) return
    this.synth.triggerAttackRelease(midis.map(midiToFreq), duration, time, velocity)
  }

  protected disposeNodes(): void {
    this.synth.dispose()
  }
}
