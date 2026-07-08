import * as Tone from 'tone'
import { Drums } from '../audio/voices/Drums'
import { buildPoly, makePatch } from '../audio/patches'
import { buildScalePool, midiToFreq } from '../audio/scales'
import type { DrumKitConfig } from '../audio/genres'
import { BASE_MIDI, DRUM_VELOCITY, POOL_OCTAVES } from './sounds'
import { STEPS, type DrumSound, type StudioGenre, type SynthTrack, type Track } from './types'

// A self-contained step sequencer for the Motherload. It reuses the Drums voice and
// instrument patches, but owns its own master chain and drives the transport itself,
// so it stays cleanly separate from the generative AudioEngine (only one of the two
// runs the transport at a time — App pauses the main engine while the Studio is open).

// A fixed, punchy general-purpose kit for the grid.
const STUDIO_KIT: DrumKitConfig = {
  kick: { pitchDecay: 0.035, octaves: 6, decay: 0.4, volume: 4 },
  snare: { decay: 0.2, filterFreq: 1800, Q: 0.8, volume: -5 },
  hat: { filterFreq: 8500, volume: -16 },
}
const CONGA_MIDI = 48

type StepListener = (step: number) => void

export class StudioEngine {
  private built = false
  private playing = false

  private bus!: Tone.Gain
  private reverb!: Tone.Reverb
  private limiter!: Tone.Limiter
  private master!: Tone.Gain

  private drums: Drums | null = null
  private readonly synths = new Map<string, Tone.PolySynth>()
  private seq: Tone.Sequence<number> | null = null

  // The live genre snapshot the sequence reads at trigger time. React re-syncs it on
  // every edit; pattern/degree/scale/root changes are picked up without a rebuild.
  private genre: StudioGenre | null = null
  // Signature of the current voice set, to know when a rebuild is actually needed.
  private voiceSig = ''

  private volume = 0.8
  private readonly muted = new Set<string>()
  private readonly stepListeners = new Set<StepListener>()

  get isPlaying(): boolean {
    return this.playing
  }

  onStep(listener: StepListener): () => void {
    this.stepListeners.add(listener)
    return () => this.stepListeners.delete(listener)
  }

  private async build(): Promise<void> {
    this.bus = new Tone.Gain(1)
    this.reverb = new Tone.Reverb({ decay: 2.2, preDelay: 0.02, wet: 0.16 })
    await this.reverb.generate()
    this.limiter = new Tone.Limiter(-1)
    this.master = new Tone.Gain(0)
    this.bus.chain(this.reverb, this.limiter, this.master, Tone.getDestination())
    this.built = true
  }

  /** Push the latest genre to the engine; rebuilds voices only if the lanes changed. */
  sync(genre: StudioGenre): void {
    this.genre = genre
    const sig = genre.tracks
      .map((t) => (t.kind === 'drum' ? `d:${t.id}:${t.sound}` : `s:${t.id}:${t.archetype}`))
      .join('|')
    if (this.built && sig !== this.voiceSig) this.rebuildVoices()
    this.voiceSig = sig
    if (this.playing) {
      const transport = Tone.getTransport()
      transport.bpm.rampTo(genre.bpm, 0.1)
      transport.swing = genre.swing
    }
  }

  /** Start playback of the synced genre. Call from a user gesture. */
  async start(): Promise<void> {
    if (!this.genre) return
    await Tone.start()
    if (!this.built) await this.build()
    if (this.playing) return

    this.rebuildVoices()
    const transport = Tone.getTransport()
    transport.bpm.value = this.genre.bpm
    transport.swing = this.genre.swing
    transport.swingSubdivision = '8n'

    this.seq = new Tone.Sequence(
      (time, step) => this.tick(time, step),
      Array.from({ length: STEPS }, (_, i) => i),
      '16n',
    )
    this.seq.start(0)
    transport.start()

    this.playing = true
    this.master.gain.cancelScheduledValues(Tone.now())
    this.master.gain.rampTo(this.volume, 0.4)
  }

  stop(): void {
    if (!this.playing) return
    this.playing = false
    this.master.gain.rampTo(0, 0.3)
    const transport = Tone.getTransport()
    transport.stop()
    transport.cancel()
    this.seq?.dispose()
    this.seq = null
    for (const l of this.stepListeners) l(-1)
  }

  setVolume(value: number): void {
    this.volume = value
    if (this.built && this.playing) this.master.gain.rampTo(value, 0.12)
  }

  setMute(trackId: string, muted: boolean): void {
    if (muted) this.muted.add(trackId)
    else this.muted.delete(trackId)
  }

  /** Audition a single lane's sound (used when adding or retuning a track). */
  preview(track: Track): void {
    if (!this.built || !this.playing) return
    if (track.kind === 'drum') this.triggerDrum(track.sound, Tone.now())
    else this.triggerSynth(track, Tone.now())
  }

  // ── Internals ────────────────────────────────────────────────────────

  private tick(time: number, step: number): void {
    const g = this.genre
    if (!g) return
    for (const track of g.tracks) {
      if (this.muted.has(track.id)) continue
      if (!g.pattern[track.id]?.[step]) continue
      if (track.kind === 'drum') this.triggerDrum(track.sound, time)
      else this.triggerSynth(track, time)
    }
    Tone.getDraw().schedule(() => {
      for (const l of this.stepListeners) l(step)
    }, time)
  }

  private triggerDrum(sound: DrumSound, time: number): void {
    const drums = this.drums
    if (!drums) return
    const vel = DRUM_VELOCITY[sound]
    switch (sound) {
      case 'kick': return drums.kick(time, vel)
      case 'snare': return drums.snare(time, vel)
      case 'hat': return drums.hat(time, vel)
      case 'openhat': return drums.openHat(time, vel)
      case 'conga': return drums.conga(CONGA_MIDI, time, vel)
      case 'shaker': return drums.shaker(time, vel)
      case 'clave': return drums.clave(time, vel)
    }
  }

  private triggerSynth(track: SynthTrack, time: number): void {
    const synth = this.synths.get(track.id)
    const g = this.genre
    if (!synth || !g) return
    const pool = buildScalePool(BASE_MIDI + g.root, g.scale, POOL_OCTAVES)
    const midi = pool[Math.min(track.degree, pool.length - 1)]
    synth.triggerAttackRelease(midiToFreq(midi), '16n', time, 0.8)
  }

  private rebuildVoices(): void {
    const g = this.genre
    if (!this.built || !g) return
    this.disposeVoices()

    const hasDrums = g.tracks.some((t) => t.kind === 'drum')
    if (hasDrums) this.drums = new Drums(this.bus, STUDIO_KIT)

    for (const track of g.tracks) {
      if (track.kind !== 'synth') continue
      const poly = buildPoly(makePatch(track.archetype), 4)
      poly.connect(this.bus)
      this.synths.set(track.id, poly)
    }
  }

  private disposeVoices(): void {
    this.drums?.dispose(0)
    this.drums = null
    for (const synth of this.synths.values()) synth.dispose()
    this.synths.clear()
  }

  dispose(): void {
    this.stop()
    this.disposeVoices()
    if (this.built) {
      this.bus.dispose()
      this.reverb.dispose()
      this.limiter.dispose()
      this.master.dispose()
    }
    this.stepListeners.clear()
  }
}
