import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import { buildMono, type MonoVoice, type PatchSpec } from '../patches'

/**
 * Monophonic bass that anchors the harmony. Depending on the track it might be a
 * round sine sub, a resonant acid line, or a growling FM reece. Plays roots,
 * offbeats, or rolling steps depending on what the sequencer asks for.
 */
export class Bass {
  private readonly out: Tone.Gain
  private readonly level: number
  private readonly synth: MonoVoice
  private disposed = false

  constructor(dest: Tone.InputNode, spec: PatchSpec, level = 0.7) {
    this.level = level
    this.out = new Tone.Gain(level).connect(dest)
    this.synth = buildMono(spec).connect(this.out)
  }

  trigger(midi: number, time: number, velocity: number, duration: Tone.Unit.Time = '2n'): void {
    if (this.disposed) return
    this.synth.triggerAttackRelease(midiToFreq(midi), duration, time, velocity)
  }

  setMuted(muted: boolean): void {
    if (this.disposed) return
    this.out.gain.rampTo(muted ? 0 : this.level, 0.08)
  }

  dispose(fade = 0.8): void {
    if (this.disposed) return
    this.disposed = true
    this.out.gain.rampTo(0, fade)
    window.setTimeout(() => {
      this.synth.dispose()
      this.out.dispose()
    }, fade * 1000 + 200)
  }
}
