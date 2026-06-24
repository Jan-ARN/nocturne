import * as Tone from 'tone'
import { Drums } from './voices/Drums'
import { Chords } from './voices/Chords'
import { Bass } from './voices/Bass'
import { Melody } from './voices/Melody'
import { Sequencer } from './sequencer'
import {
  GENRES, makeKit, makeTimbres,
  type DrumKitConfig, type Genre, type GenreId, type GrooveId, type Layer, type TrackTimbres,
} from './genres'
import { pitchClass, type ScaleName } from './scales'
import type { Energy, NoteEvent, NoteListener, SectionListener } from './events'
import type { Preset } from '../presets/presets'

/** A snapshot of what the engine is currently playing, for the UI. */
export interface TrackInfo {
  genre: GenreId
  groove: GrooveId
  bpm: number
  pitchClass: number
  scale: ScaleName
  instruments: { chords: string; bass: string; lead: string }
}

const FFT_SIZE = 32
// The analyser reports magnitudes in dB; map this range onto 0..1 for the visual.
const DB_FLOOR = -100
const DB_RANGE = 75
// Split the FFT bins into three bands: bass [0, BASS_BINS), mid [BASS_BINS, MID_BINS),
// high [MID_BINS, FFT_SIZE).
const BASS_BINS = 4
const MID_BINS = 14

/**
 * Owns the whole audio graph and its lifecycle.
 *
 * Signal flow:  voices → bus → pump → chorus → warmth filter → reverb → comp → limiter → master
 *
 * The master chain is built once (lazily, after the first user gesture, since the
 * reverb impulse generates asynchronously). FX parameters (chorus, reverb, pump,
 * filter) are reconfigured per genre. The `pump` gain is ducked by every kick for
 * the house sidechain. An analyser on the master feeds the audio-reactive visual.
 */
export class AudioEngine {
  private built = false
  private playing = false

  private bus!: Tone.Gain
  private pump!: Tone.Gain
  private chorus!: Tone.Chorus
  private warmth!: Tone.Filter
  private reverb!: Tone.Reverb
  private comp!: Tone.Compressor
  private limiter!: Tone.Limiter
  private master!: Tone.Gain
  private analyser!: Tone.Analyser

  private drums: Drums | null = null
  private chords: Chords | null = null
  private bass: Bass | null = null
  private melody: Melody | null = null
  private sequencer: Sequencer | null = null

  private stopTimer: number | null = null

  private density = 0.5
  private space = 0.5
  private volume = 0.7

  // The currently loaded preset, for genre-aware Shuffle re-rolls.
  private current: Preset | null = null

  // Mutable per-track state. The preset seeds these; Shuffle re-rolls them so the
  // instruments, scale, key and tempo all change, not just the note sequence.
  private genre: Genre = GENRES.lofi
  private scale: ScaleName = 'minorPentatonic'
  private timbres: TrackTimbres = makeTimbres('lofi')
  private kit: DrumKitConfig = GENRES.lofi.kit
  private bpm = 82

  // Key.
  private octaveBase = 36
  private pitchClass = 0

  // Per-genre FX state, applied to the shared chain.
  private baseWarmth = 3600
  private reverbMin = 0.12
  private reverbMax = 0.55
  private pumpDepth = 0
  private pumpRecovery = 0.25

  private readonly muted = new Set<Layer>()
  private readonly listeners = new Set<NoteListener>()
  private readonly sectionListeners = new Set<SectionListener>()

  private readonly energy: Energy = { level: 0, bass: 0, mid: 0, high: 0 }

  get isPlaying(): boolean {
    return this.playing
  }

  onNote(listener: NoteListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  onSection(listener: SectionListener): () => void {
    this.sectionListeners.add(listener)
    return () => this.sectionListeners.delete(listener)
  }

  private emit = (event: NoteEvent): void => {
    for (const listener of this.listeners) listener(event)
  }

  private emitSection = (name: string): void => {
    for (const listener of this.sectionListeners) listener(name)
  }

  private async build(): Promise<void> {
    this.bus = new Tone.Gain(1)
    this.pump = new Tone.Gain(1)
    this.chorus = new Tone.Chorus({ frequency: 1.1, delayTime: 3.5, depth: 0.6, wet: 0.28 }).start()
    this.warmth = new Tone.Filter({ type: 'lowpass', frequency: 3600, Q: 0.3 })
    this.reverb = new Tone.Reverb({ decay: 3, preDelay: 0.02, wet: 0.25 })
    await this.reverb.generate()
    this.comp = new Tone.Compressor({ threshold: -20, ratio: 3, attack: 0.01, release: 0.18 })
    this.limiter = new Tone.Limiter(-1.5)
    this.master = new Tone.Gain(0)
    this.analyser = new Tone.Analyser('fft', FFT_SIZE)

    this.bus.chain(
      this.pump,
      this.chorus,
      this.warmth,
      this.reverb,
      this.comp,
      this.limiter,
      this.master,
      Tone.getDestination(),
    )
    this.master.connect(this.analyser)
    this.built = true
  }

  /** Start (or restart) playback with a preset. Call from a user gesture. */
  async start(preset: Preset): Promise<void> {
    await Tone.start()
    if (!this.built) await this.build()

    if (this.stopTimer !== null) {
      window.clearTimeout(this.stopTimer)
      this.stopTimer = null
    }

    this.loadTrackState(preset)
    this.density = preset.density
    this.space = preset.space
    this.applyGenreFx(preset, 0.1)
    this.buildVoices()

    const transport = Tone.getTransport()
    transport.bpm.value = preset.bpm
    transport.swing = GENRES[preset.genre].swing
    transport.swingSubdivision = '8n'
    transport.start()

    this.playing = true
    this.master.gain.cancelScheduledValues(Tone.now())
    this.master.gain.rampTo(this.volume, 1.2)
  }

  stop(): void {
    if (!this.playing) return
    this.playing = false
    this.master.gain.rampTo(0, 1)

    this.stopTimer = window.setTimeout(() => {
      const transport = Tone.getTransport()
      transport.stop()
      transport.cancel()
      this.teardownVoices()
      this.stopTimer = null
    }, 1200)
  }

  /** Switch vibe/genre live, crossfading and re-keying the groove. */
  setPreset(preset: Preset): void {
    if (!this.playing) return
    this.loadTrackState(preset)
    this.teardownVoices()
    this.applyGenreFx(preset, 1.5)
    this.buildVoices()
    const transport = Tone.getTransport()
    transport.bpm.rampTo(preset.bpm, 2)
    transport.swing = GENRES[preset.genre].swing
  }

  setVolume(value: number): void {
    this.volume = value
    if (this.built && this.playing) this.master.gain.rampTo(value, 0.15)
  }

  setDensity(value: number): void {
    this.density = value
  }

  /**
   * Shuffle: re-roll tempo, key, scale and instruments within the genre's ranges,
   * then rebuild the voices so a fresh take sounds genuinely different, not just
   * re-sequenced. Returns the new tempo and key so the UI can stay in sync.
   */
  skip(): { bpm: number; pitchClass: number } | null {
    if (!this.playing || !this.current) return null

    const [lo, hi] = this.genre.tempoRange
    const bpm = Math.round(lo + Math.random() * (hi - lo))
    this.bpm = bpm
    Tone.getTransport().bpm.rampTo(bpm, 0.6)

    this.pitchClass = Math.floor(Math.random() * 12)
    this.scale = this.genre.scales[Math.floor(Math.random() * this.genre.scales.length)]
    this.timbres = makeTimbres(this.genre.id)
    this.kit = makeKit(this.genre.id)

    this.teardownVoices()
    this.buildVoices()
    this.sequencer?.prime()
    return { bpm, pitchClass: this.pitchClass }
  }

  /** Seed the per-track state from a preset, then randomize its instruments. */
  private loadTrackState(preset: Preset): void {
    this.current = preset
    this.genre = GENRES[preset.genre]
    this.scale = preset.scale
    this.bpm = preset.bpm
    const presetRoot = Tone.Frequency(preset.root).toMidi()
    this.pitchClass = pitchClass(presetRoot)
    this.octaveBase = presetRoot - this.pitchClass
    this.timbres = makeTimbres(this.genre.id)
    this.kit = makeKit(this.genre.id)
  }

  /** What's playing right now — genre, key, scale, tempo and the instruments. */
  getTrackInfo(): TrackInfo {
    return {
      genre: this.genre.id,
      groove: this.genre.groove,
      bpm: this.bpm,
      pitchClass: this.pitchClass,
      scale: this.scale,
      instruments: {
        chords: this.timbres.chord.label,
        bass: this.timbres.bass.label,
        lead: this.timbres.lead.label,
      },
    }
  }

  setSpace(value: number): void {
    this.space = value
    if (this.built) this.reverb.wet.rampTo(this.reverbMin + this.space * (this.reverbMax - this.reverbMin), 0.4)
  }

  setTempo(bpm: number): void {
    if (this.built) Tone.getTransport().bpm.rampTo(bpm, 0.1)
  }

  setSwing(value: number): void {
    if (this.built) Tone.getTransport().swing = value
  }

  /** Transpose to a pitch class (0 = C … 11 = B) in the current register. */
  setKey(pitchClass: number): void {
    this.pitchClass = pitchClass
    this.sequencer?.setRoot(this.octaveBase + pitchClass)
  }

  setMute(layer: Layer, muted: boolean): void {
    if (muted) this.muted.add(layer)
    else this.muted.delete(layer)
    this.voiceFor(layer)?.setMuted(muted)
  }

  /** Normalized spectrum energy for the visual. Sampled fresh each call. */
  getEnergy(): Energy {
    if (!this.built || !this.playing) {
      this.energy.level = this.energy.bass = this.energy.mid = this.energy.high = 0
      return this.energy
    }
    const values = this.analyser.getValue() as Float32Array
    const norm = (db: number) => Math.min(1, Math.max(0, (db - DB_FLOOR) / DB_RANGE))
    let bass = 0
    let mid = 0
    let high = 0
    for (let i = 0; i < BASS_BINS; i++) bass += norm(values[i])
    for (let i = BASS_BINS; i < MID_BINS; i++) mid += norm(values[i])
    for (let i = MID_BINS; i < values.length; i++) high += norm(values[i])
    this.energy.bass = bass / BASS_BINS
    this.energy.mid = mid / (MID_BINS - BASS_BINS)
    this.energy.high = high / (values.length - MID_BINS)
    this.energy.level = (this.energy.bass + this.energy.mid + this.energy.high) / 3
    return this.energy
  }

  // ── Internals ────────────────────────────────────────────────────────

  /** Sidechain duck — called by the sequencer on every kick. */
  private duck = (time: number): void => {
    if (this.pumpDepth <= 0) return
    const g = this.pump.gain
    g.cancelScheduledValues(time)
    g.setValueAtTime(1, time)
    g.linearRampToValueAtTime(1 - this.pumpDepth, time + 0.012)
    g.linearRampToValueAtTime(1, time + this.pumpRecovery)
  }

  /** Arrangement-driven filter sweep, 0 (muffled) .. 1 (fully open). */
  private setFilterOpenness = (openness: number, ramp: number): void => {
    if (!this.built) return
    this.warmth.frequency.rampTo(this.baseWarmth * (0.32 + 0.68 * openness), ramp)
  }

  private applyGenreFx(preset: Preset, ramp: number): void {
    if (!this.built) return
    const fx = GENRES[preset.genre].fx
    this.baseWarmth = preset.warmth
    this.reverbMin = fx.reverbMin
    this.reverbMax = fx.reverbMax
    this.pumpDepth = fx.pump
    this.pumpRecovery = fx.pumpRecovery
    this.chorus.wet.rampTo(fx.chorusWet, ramp)
    this.warmth.frequency.rampTo(preset.warmth, ramp)
    this.reverb.wet.rampTo(this.reverbMin + this.space * (this.reverbMax - this.reverbMin), ramp)
  }

  private voiceFor(layer: Layer): { setMuted(m: boolean): void } | null {
    switch (layer) {
      case 'drums':
        return this.drums
      case 'chords':
        return this.chords
      case 'bass':
        return this.bass
      case 'lead':
        return this.melody
    }
  }

  private buildVoices(): void {
    const rootMidi = this.octaveBase + this.pitchClass

    this.drums = new Drums(this.bus, this.kit)
    this.chords = new Chords(this.bus, this.timbres.chord)
    this.bass = new Bass(this.bus, this.timbres.bass)
    this.melody = new Melody(this.bus, this.timbres.lead)

    for (const layer of this.muted) this.voiceFor(layer)?.setMuted(true)

    this.sequencer = new Sequencer({
      genre: this.genre,
      drums: this.drums,
      chords: this.chords,
      bass: this.bass,
      melody: this.melody,
      rootMidi,
      scale: this.scale,
      getDensity: () => this.density,
      isMuted: (layer) => this.muted.has(layer),
      emit: this.emit,
      duck: this.duck,
      setFilterOpenness: this.setFilterOpenness,
      onSection: this.emitSection,
    })
    this.sequencer.start()
  }

  private teardownVoices(): void {
    this.sequencer?.stop()
    this.drums?.dispose()
    this.chords?.dispose()
    this.bass?.dispose()
    this.melody?.dispose()
    this.sequencer = null
    this.drums = null
    this.chords = null
    this.bass = null
    this.melody = null
  }

  /** Release everything. Used on unmount. */
  dispose(): void {
    if (this.stopTimer !== null) window.clearTimeout(this.stopTimer)
    this.teardownVoices()
    if (this.built) {
      Tone.getTransport().stop()
      Tone.getTransport().cancel()
      this.bus.dispose()
      this.pump.dispose()
      this.chorus.dispose()
      this.warmth.dispose()
      this.reverb.dispose()
      this.comp.dispose()
      this.limiter.dispose()
      this.master.dispose()
      this.analyser.dispose()
    }
    this.listeners.clear()
    this.sectionListeners.clear()
  }
}
