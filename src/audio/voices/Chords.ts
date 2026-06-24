import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildPoly, type PatchSpec } from '../patches'

/**
 * The harmonic bed. Plays voiced chords from the progression on whatever
 * instrument this track drew — a warm FM Rhodes, a saw pad, an organ, a choir.
 * Polyphonic so voicings ring and overlap.
 */
export class Chords {
  private readonly out: Tone.Gain
  private readonly level: number
  private readonly synth: Tone.PolySynth
  private disposed = false

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.5) {
    this.level = level
    this.out = new Tone.Gain(level).connect(dest)
    this.synth = buildPoly(spec, 32).connect(this.out)
  }

  trigger(midis: number[], time: number, velocity: number, duration: Tone.Unit.Time = '2n'): void {
    if (this.disposed || midis.length === 0) return
    this.synth.triggerAttackRelease(midis.map(midiToFreq), duration, time, velocity)
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
      this.out.dispose()
    }, fade * 1000 + 200)
  }
}
