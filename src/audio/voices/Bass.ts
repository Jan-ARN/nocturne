import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildMono, type MonoVoice, type PatchSpec } from '../patches'
import { Voice } from './Voice'

/**
 * Monophonic bass that anchors the harmony. Could be a sine sub, a resonant acid
 * line, or an FM reece, depending on the track. Plays roots, offbeats or rolling
 * steps, whatever the sequencer asks for.
 */
export class Bass extends Voice {
  private readonly synth: MonoVoice

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.7) {
    super(dest, level, 0.8)
    this.synth = buildMono(spec).connect(this.out)
  }

  trigger(midi: number, time: number, velocity: number, duration: Tone.Unit.Time = '2n'): void {
    if (this.disposed) return
    this.synth.triggerAttackRelease(midiToFreq(midi), duration, time, velocity)
  }

  protected disposeNodes(): void {
    this.synth.dispose()
  }
}
