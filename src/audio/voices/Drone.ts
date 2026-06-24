import * as Tone from 'tone'
import { midiToFreq } from '../scales'

export interface DroneConfig {
  waveform: OscillatorType
  /** Semitone offsets from the root forming the sustained chord bed. */
  offsets: number[]
  /** Target output level, 0..1. */
  level: number
  /** Cents of slow detune wander, gives the bed its slow movement. */
  drift: number
}

/**
 * The bed: a handful of detuned oscillators held forever, each breathing on its
 * own slow LFO so the chord never sits perfectly still. No note triggers — it
 * just sustains and evolves underneath everything else.
 */
export class Drone {
  private readonly out: Tone.Gain
  private readonly oscs: Tone.Oscillator[] = []
  private readonly nodes: Tone.ToneAudioNode[] = []
  private disposed = false

  constructor(dest: Tone.InputNode, rootMidi: number, cfg: DroneConfig) {
    this.out = new Tone.Gain(0).connect(dest)
    const n = cfg.offsets.length

    cfg.offsets.forEach((semi, i) => {
      const osc = new Tone.Oscillator({
        frequency: midiToFreq(rootMidi + semi),
        type: cfg.waveform,
      })
      const voiceGain = new Tone.Gain(1 / n)
      osc.connect(voiceGain)
      voiceGain.connect(this.out)

      // Slow amplitude breathing, each voice at its own rate so they drift
      // in and out of phase with one another.
      const tremolo = new Tone.LFO({
        frequency: 0.03 + i * 0.013,
        min: (1 / n) * 0.45,
        max: 1 / n,
      }).start()
      tremolo.connect(voiceGain.gain)

      // Slow detune wander for a living, slightly-out-of-tune chorus.
      const wander = new Tone.LFO({
        frequency: 0.018 + i * 0.009,
        min: -cfg.drift,
        max: cfg.drift,
      }).start()
      wander.connect(osc.detune)

      osc.start()
      this.oscs.push(osc)
      this.nodes.push(voiceGain, tremolo, wander)
    })

    // Ease the bed in so play never starts with a click.
    this.out.gain.rampTo(cfg.level, 4)
  }

  /** Fade out over `fade` seconds, then release all audio nodes. */
  dispose(fade = 2): void {
    if (this.disposed) return
    this.disposed = true
    this.out.gain.rampTo(0, fade)
    window.setTimeout(() => {
      for (const osc of this.oscs) osc.dispose()
      for (const node of this.nodes) node.dispose()
      this.out.dispose()
    }, fade * 1000 + 200)
  }
}
