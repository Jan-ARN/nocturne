import * as Tone from 'tone'
import { midiToFreq } from '../scales'
import type { DrumKitConfig } from '../genres'
import { Voice } from './Voice'

/**
 * The kit: a sine kick, filtered-noise snare and hats, plus hand percussion (tuned
 * conga, shaker, clave) for the organic house groove. The core drums take their
 * timbre from the genre's kit config; the percussion uses fixed voices.
 */
export class Drums extends Voice {
  private readonly kickSynth: Tone.MembraneSynth
  private readonly snareSynth: Tone.NoiseSynth
  private readonly snareFilter: Tone.Filter
  private readonly hatSynth: Tone.NoiseSynth
  private readonly hatFilter: Tone.Filter
  private readonly openHatSynth: Tone.NoiseSynth
  private readonly openHatFilter: Tone.Filter
  private readonly congaSynth: Tone.MembraneSynth
  private readonly shakerSynth: Tone.NoiseSynth
  private readonly shakerFilter: Tone.Filter
  private readonly claveSynth: Tone.Synth

  constructor(dest: Tone.InputNode, kit: DrumKitConfig, level = 0.9) {
    super(dest, level, 0.4)

    this.kickSynth = new Tone.MembraneSynth({
      pitchDecay: kit.kick.pitchDecay,
      octaves: kit.kick.octaves,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: kit.kick.decay, sustain: 0, release: 0.5 },
      volume: kit.kick.volume,
    }).connect(this.out)

    this.snareFilter = new Tone.Filter({ type: 'bandpass', frequency: kit.snare.filterFreq, Q: kit.snare.Q }).connect(this.out)
    this.snareSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: kit.snare.decay, sustain: 0, release: 0.06 },
      volume: kit.snare.volume,
    }).connect(this.snareFilter)

    this.hatFilter = new Tone.Filter({ type: 'highpass', frequency: kit.hat.filterFreq }).connect(this.out)
    this.hatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.035, sustain: 0, release: 0.02 },
      volume: kit.hat.volume,
    }).connect(this.hatFilter)

    // A separate, longer-ringing open hat for the offbeat.
    this.openHatFilter = new Tone.Filter({ type: 'highpass', frequency: kit.hat.filterFreq - 1500 }).connect(this.out)
    this.openHatSynth = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.001, decay: 0.32, sustain: 0, release: 0.12 },
      volume: kit.hat.volume + 3,
    }).connect(this.openHatFilter)

    // Organic percussion.
    // Tuned conga/bongo: a round, resonant membrane hit.
    this.congaSynth = new Tone.MembraneSynth({
      pitchDecay: 0.012,
      octaves: 1.5,
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.22, sustain: 0, release: 0.1 },
      volume: -7,
    }).connect(this.out)

    // Shaker: a short band of high noise for the constant 16th texture.
    this.shakerFilter = new Tone.Filter({ type: 'bandpass', frequency: 7000, Q: 1.2 }).connect(this.out)
    this.shakerSynth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.004, decay: 0.06, sustain: 0, release: 0.03 },
      volume: -16,
    }).connect(this.shakerFilter)

    // Clave/woodblock: a tight high ping for syncopation.
    this.claveSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.001, decay: 0.06, sustain: 0, release: 0.05 },
      volume: -13,
    }).connect(this.out)
  }

  kick(time: number, velocity: number): void {
    if (this.disposed) return
    this.kickSynth.triggerAttackRelease('C1', '8n', time, velocity)
  }

  snare(time: number, velocity: number): void {
    if (this.disposed) return
    this.snareSynth.triggerAttackRelease('16n', time, velocity)
  }

  hat(time: number, velocity: number): void {
    if (this.disposed) return
    this.hatSynth.triggerAttackRelease('32n', time, velocity)
  }

  /** The ringing offbeat open hat. */
  openHat(time: number, velocity: number): void {
    if (this.disposed) return
    this.openHatSynth.triggerAttackRelease('8n', time, velocity)
  }

  conga(midi: number, time: number, velocity: number): void {
    if (this.disposed) return
    this.congaSynth.triggerAttackRelease(midiToFreq(midi), '8n', time, velocity)
  }

  shaker(time: number, velocity: number): void {
    if (this.disposed) return
    this.shakerSynth.triggerAttackRelease('16n', time, velocity)
  }

  clave(time: number, velocity: number): void {
    if (this.disposed) return
    this.claveSynth.triggerAttackRelease('C6', '32n', time, velocity)
  }

  protected disposeNodes(): void {
    this.kickSynth.dispose()
    this.snareSynth.dispose()
    this.snareFilter.dispose()
    this.hatSynth.dispose()
    this.hatFilter.dispose()
    this.openHatSynth.dispose()
    this.openHatFilter.dispose()
    this.congaSynth.dispose()
    this.shakerSynth.dispose()
    this.claveSynth.dispose()
    this.shakerFilter.dispose()
  }
}
