import * as Tone from 'tone'
import { buildScalePool, type ScaleName } from './scales'
import {
  developMotif,
  generateArrangement,
  generateMotif,
  generateProgression,
  modeOf,
  type ChordSpec,
  type Mode,
  type Motif,
  type Section,
} from './composer'
import type { Genre, GrooveId, Layer } from './genres'
import { pickDrumPattern, type DrumPattern } from './patterns'
import type { Drums } from './voices/Drums'
import type { Chords } from './voices/Chords'
import type { Bass } from './voices/Bass'
import type { Melody } from './voices/Melody'
import type { NoteEvent } from './events'

export interface SequencerSources {
  genre: Genre
  drums: Drums
  chords: Chords
  bass: Bass
  melody: Melody
  /** MIDI note of the key root (bass register). Can change live via setRoot. */
  rootMidi: number
  /** Scale → harmonic mode + melody ladder. Fixed per track; Shuffle builds a new sequencer. */
  scale: ScaleName
  getDensity: () => number
  isMuted: (layer: Layer) => boolean
  emit: (event: NoteEvent) => void
  duck: (time: number) => void
  setFilterOpenness: (openness: number, ramp: number) => void
  onSection: (name: string) => void
}

const CHORD_OCTAVE = 12
const MELODY_LOW = 24
const MELODY_OCTAVES = 2

// Regenerate harmony, theme and drum skeleton every phrase; develop the theme bar by bar.
const PHRASE_BARS = 8

const STEPS = Array.from({ length: 16 }, (_, i) => i)
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

// Clave: 3-2 son clave.
const CLAVE_STEPS = new Set([0, 3, 6, 10, 12])
// A few conga tumbao variants; the composer picks one per phrase. step → offset.
const CONGA_VARIANTS: Record<number, number>[] = [
  { 3: 7, 6: 0, 7: 12, 10: 7, 11: 12, 14: 0 },
  { 2: 0, 5: 7, 7: 12, 10: 0, 13: 7, 14: 12 },
  { 3: 12, 6: 7, 10: 0, 11: 7, 14: 12, 15: 0 },
]
// Rolling sub-bass pattern for breakbeat. step → note duration.
const DNB_BASS: Record<number, Tone.Unit.Time> = { 0: '4n', 6: '8n', 10: '8n', 11: '16n' }

type ArpDir = 'up' | 'down' | 'updown'

/**
 * The groove. A 16-step bar drives the drums; a measure loop walks a procedurally
 * generated arrangement and asks the composer for fresh, voiced progressions and a
 * developing melodic theme every phrase. Rhythm is dispatched on the genre's
 * *groove* (beats / four-on-floor / arp / breakbeat / ambient), so genres are
 * mostly data. Because the material — structure, harmony, theme, percussion,
 * instruments — all regenerates, and Shuffle re-rolls tempo/key/scale/patches, a
 * long session never settles into the same loop.
 */
export class Sequencer {
  private measureLoop: Tone.Loop | null = null
  private stepSeq: Tone.Sequence<number> | null = null
  private root: number
  private readonly scale: ScaleName
  private bar = 0

  private readonly mode: Mode
  private readonly groove: GrooveId
  private progression: ChordSpec[]
  private theme: Motif
  private motif: Motif
  private drumPattern: DrumPattern
  private conga: Record<number, number>
  private arpDir: ArpDir = 'up'

  private arrangement: Section[]
  private arrBars: number
  private arrPos = 0
  private section: Section
  private sectionName = ''
  private lastBarOfSection = false

  private chordMidis: number[] = []
  private bassRoot = 0
  private melodyPool: number[] = []
  private chordToneIdx: number[] = []
  private arpNotes: number[] = []
  private arpIndex = 0
  private readonly melodyOctave: number

  constructor(private readonly src: SequencerSources) {
    this.root = src.rootMidi
    this.scale = src.scale
    this.mode = modeOf(src.scale)
    this.groove = src.genre.groove
    this.melodyOctave = pick([0, 0, 12])
    this.progression = generateProgression(this.mode, src.genre.harmony, 4)
    this.theme = generateMotif(this.poolSize(), src.getDensity(), this.maxNotes())
    this.motif = this.theme
    this.drumPattern = pickDrumPattern(src.genre.id)
    this.conga = pick(CONGA_VARIANTS)
    this.arrangement = generateArrangement(true)
    this.arrBars = this.totalBars(this.arrangement)
    this.section = this.arrangement[0]
    this.rebuildPool()
    this.buildChord(this.progression[0])
  }

  setRoot(rootMidi: number): void {
    this.root = rootMidi
    this.rebuildPool()
  }

  /**
   * Voice the opening chord/bass right now. Called just after a fresh Sequencer is
   * built on Shuffle, so the new track is instantly audible.
   */
  prime(): void {
    const t = Tone.now() + 0.03
    const dur: Tone.Unit.Time = this.groove === 'beats' ? '2n' : '1m'
    if (!this.src.isMuted('chords')) this.src.chords.trigger(this.chordMidis, t, 0.45, dur)
    if (!this.src.isMuted('bass')) this.src.bass.trigger(this.bassRoot, t, 0.7, dur)
    this.src.emit({ kind: 'chord', intensity: 0.7 })
  }

  private poolSize(): number {
    return buildScalePool(0, this.scale, MELODY_OCTAVES).length
  }

  private maxNotes(): number {
    switch (this.groove) {
      case 'ambient': return 3
      case 'beats': return 4
      default: return 6
    }
  }

  /** Note length for a motif hit, by groove. */
  private motifDur(): Tone.Unit.Time {
    switch (this.groove) {
      case 'four': return '8n'
      case 'breaks': return '8n'
      case 'ambient': return '2n'
      default: return '4n'
    }
  }

  private rebuildPool(): void {
    this.melodyPool = buildScalePool(this.root + MELODY_LOW + this.melodyOctave, this.scale, MELODY_OCTAVES)
  }

  private buildChord(chord: ChordSpec): void {
    this.chordMidis = chord.offsets.map((o) => this.root + CHORD_OCTAVE + o)
    this.bassRoot = this.root + chord.rootOffset

    const pcs = new Set(chord.pitchClasses)
    this.chordToneIdx = []
    for (let i = 0; i < this.melodyPool.length; i++) {
      if (pcs.has((((this.melodyPool[i] - this.root) % 12) + 12) % 12)) this.chordToneIdx.push(i)
    }

    const arp = new Set<number>()
    const arpBase = this.root + MELODY_LOW + this.melodyOctave
    for (const o of chord.offsets) {
      const pc = ((o % 12) + 12) % 12
      arp.add(arpBase + pc)
      arp.add(arpBase + 12 + pc)
    }
    this.arpNotes = [...arp].sort((a, b) => a - b)
  }

  private totalBars(arr: Section[]): number {
    return arr.reduce((n, s) => n + s.bars, 0)
  }

  private sectionHere(): { section: Section; isLast: boolean } {
    let p = this.arrPos
    for (const section of this.arrangement) {
      if (p < section.bars) return { section, isLast: p === section.bars - 1 }
      p -= section.bars
    }
    return { section: this.arrangement[0], isLast: false }
  }

  start(): void {
    this.measureLoop = new Tone.Loop((time) => this.onMeasure(time), '1m').start(0)
    this.stepSeq = new Tone.Sequence<number>((time, step) => this.onStep(time, step), STEPS, '16n').start(0)
  }

  // ── Per-bar: arrangement + freshly composed harmony ──────────────────
  private onMeasure(time: number): void {
    if (this.arrPos >= this.arrBars) {
      this.arrangement = generateArrangement(false)
      this.arrBars = this.totalBars(this.arrangement)
      this.arrPos = 0
    }

    const { section, isLast } = this.sectionHere()
    this.section = section
    this.lastBarOfSection = isLast
    if (section.name !== this.sectionName) {
      this.sectionName = section.name
      this.src.setFilterOpenness(section.filter, 2.5)
      this.src.onSection(section.name)
    }

    if (this.bar % PHRASE_BARS === 0) {
      this.progression = generateProgression(this.mode, this.src.genre.harmony, 4)
      this.theme = generateMotif(this.poolSize(), this.density(), this.maxNotes())
      this.drumPattern = pickDrumPattern(this.src.genre.id)
      this.conga = pick(CONGA_VARIANTS)
      this.arpDir = pick<ArpDir>(['up', 'down', 'updown'])
    }
    this.motif = developMotif(this.theme, this.bar % PHRASE_BARS, this.poolSize())

    this.buildChord(this.progression[this.bar % this.progression.length])
    const half = Tone.Time('2n').toSeconds()
    const playChords = section.chords && !this.src.isMuted('chords')
    const playBass = section.bass && !this.src.isMuted('bass')

    switch (this.groove) {
      case 'beats':
        if (playChords) {
          this.src.chords.trigger(this.chordMidis, time, 0.42)
          this.src.chords.trigger(this.chordMidis, time + half, 0.3)
        }
        if (playBass) {
          this.src.bass.trigger(this.bassRoot, time, 0.72)
          this.src.bass.trigger(this.bassRoot, time + half, 0.55)
        }
        break
      case 'four':
        if (playChords) this.src.chords.trigger(this.chordMidis, time, 0.2, '1m')
        if (playBass) this.src.bass.trigger(this.bassRoot, time, 0.72, '1m')
        break
      case 'arp':
        if (playChords) this.src.chords.trigger(this.chordMidis, time, 0.32, '1m')
        // bass handled per-step
        break
      case 'breaks':
        if (playChords) this.src.chords.trigger(this.chordMidis, time, 0.26, '1m')
        // bass handled per-step
        break
      case 'ambient':
        if (playChords) {
          this.src.chords.trigger(this.chordMidis, time, 0.34, '1m')
          this.src.chords.trigger(this.chordMidis, time + half, 0.22, '2n')
        }
        if (playBass) this.src.bass.trigger(this.bassRoot, time, 0.5, '1m')
        break
    }

    if (playChords) this.emitDraw('chord', 0.5, time)
    this.bar++
    this.arrPos++
  }

  private allows(layer: Layer): boolean {
    return this.section[layer] && !this.src.isMuted(layer)
  }

  private density(): number {
    return clamp(this.src.getDensity() * this.section.intensity)
  }

  // ── Per-step rhythm, dispatched on groove ────────────────────────────
  private onStep(time: number, step: number): void {
    switch (this.groove) {
      case 'beats': this.stepBeats(time, step); break
      case 'four': this.stepFour(time, step); break
      case 'arp': this.stepArp(time, step); break
      case 'breaks': this.stepBreaks(time, step); break
      case 'ambient': this.stepAmbient(time, step); break
    }
  }

  /** Fire the kick if the current pattern wants it on this step (incl. ghosts). */
  private patternKick(time: number, step: number, baseVel: number): void {
    const p = this.drumPattern
    if (p.kick.includes(step)) {
      const vel = baseVel + Math.random() * 0.13
      this.src.drums.kick(time, vel)
      this.src.duck(time)
      if (step === 0 || step === 8) this.emitDraw('kick', vel, time)
    } else if (p.ghostKick.includes(step) && Math.random() < 0.5) {
      this.src.drums.kick(time, baseVel * 0.7)
      this.src.duck(time)
    }
  }

  private patternSnare(time: number, vel: number, draw = true): void {
    this.src.drums.snare(time, vel)
    if (draw) this.emitDraw('snare', vel, time)
  }

  // Boom-bap / lo-fi / trip-hop.
  private stepBeats(time: number, step: number): void {
    const d = this.density()
    const perc = this.src.genre.perc
    if (this.allows('drums')) {
      this.patternKick(time, step, 0.82)
      if (this.section.snare && this.drumPattern.snare.includes(step)) {
        this.patternSnare(time + 0.012, 0.6 + Math.random() * 0.15)
      } else if (this.section.snare && (step === 7 || step === 14) && d > 0.6 && Math.random() < 0.3) {
        this.src.drums.snare(time, 0.18)
      }
      if (step % 2 === 0 || Math.random() < (d - 0.25) * 0.9) {
        const accent = step % 4 === 0
        this.src.drums.hat(time + Math.random() * 0.006, clamp((accent ? 0.5 : 0.32) * (0.7 + Math.random() * 0.5)))
      }
      if (perc.clave && CLAVE_STEPS.has(step) && Math.random() < 0.3) {
        this.src.drums.clave(time, 0.18 + Math.random() * 0.1)
      }
      this.maybeFill(time, step)
    }
    this.playMotif(time, step)
  }

  // Organic house / techno.
  private stepFour(time: number, step: number): void {
    const d = this.density()
    const perc = this.src.genre.perc
    if (this.allows('drums')) {
      this.patternKick(time, step, 0.8)
      if (this.section.snare && this.drumPattern.snare.includes(step)) {
        this.patternSnare(time, 0.38 + Math.random() * 0.12)
      }
      if (perc.openHat && step % 4 === 2) this.src.drums.openHat(time, 0.4)
      if (perc.shaker && (step % 2 === 0 || Math.random() < 0.4 + d * 0.5)) {
        const accent = step % 2 === 1
        this.src.drums.shaker(time + Math.random() * 0.006, clamp((accent ? 0.4 : 0.24) * (0.7 + Math.random() * 0.5)))
      }
      if (perc.conga) {
        const cg = this.conga[step]
        if (cg !== undefined && (d > 0.3 || Math.random() < 0.5)) {
          this.src.drums.conga(this.root + 12 + cg, time + Math.random() * 0.008, 0.45 + Math.random() * 0.2)
        }
      }
      if (perc.clave && CLAVE_STEPS.has(step) && d > 0.4) {
        this.src.drums.clave(time, 0.3 + Math.random() * 0.12)
      }
      if (!perc.shaker && (step % 2 === 0)) {
        this.src.drums.hat(time, clamp(0.28 * (0.8 + Math.random() * 0.4)))
      }
      this.maybeFill(time, step)
    }
    this.playMotif(time, step)
  }

  // Synthwave / dreamwave — driven by a continuous arpeggio.
  private stepArp(time: number, step: number): void {
    const d = this.density()
    const perc = this.src.genre.perc
    if (this.allows('drums')) {
      this.patternKick(time, step, 0.85)
      if (this.section.snare && this.drumPattern.snare.includes(step)) {
        this.patternSnare(time, 0.7 + Math.random() * 0.12)
      }
      if (perc.openHat && step % 4 === 2) this.src.drums.openHat(time, 0.3)
      if (step % 2 === 0 || Math.random() < (d - 0.3) * 0.8) {
        const accent = step % 4 === 0
        this.src.drums.hat(time, clamp((accent ? 0.4 : 0.26) * (0.8 + Math.random() * 0.4)))
      }
    }
    if (this.allows('bass') && step % 2 === 0) {
      this.src.bass.trigger(this.bassRoot, time, 0.7, '8n')
    }
    if (this.allows('lead') && this.arpNotes.length > 0) {
      const note = this.arpNotes[this.arpStep()]
      this.arpIndex++
      const accent = step % 4 === 0
      const vel = (accent ? 0.5 : 0.34) + Math.random() * 0.08
      this.src.melody.trigger(note, time, vel, '16n')
      if (step % 4 === 0) this.emitDraw('melody', vel, time)
    }
  }

  // Liquid drum & bass — breakbeat + rolling sub.
  private stepBreaks(time: number, step: number): void {
    const perc = this.src.genre.perc
    if (this.allows('drums')) {
      this.patternKick(time, step, 0.82)
      if (this.section.snare && this.drumPattern.snare.includes(step)) {
        this.patternSnare(time, 0.62 + Math.random() * 0.14)
      }
      // Fast, accented 16th hats with the occasional open "ride".
      const accent = step % 4 === 0
      this.src.drums.hat(time + Math.random() * 0.004, clamp((accent ? 0.42 : 0.24) * (0.8 + Math.random() * 0.4)))
      if (perc.openHat && step % 4 === 2 && Math.random() < 0.6) this.src.drums.openHat(time, 0.22)
      if (perc.shaker && step % 2 === 1) this.src.drums.shaker(time, 0.18 + Math.random() * 0.1)
      this.maybeFill(time, step)
    }
    if (this.allows('bass')) {
      const dur = DNB_BASS[step]
      if (dur !== undefined) this.src.bass.trigger(this.bassRoot, time, 0.78, dur)
    }
    this.playMotif(time, step)
  }

  // Beatless ambient — only the lead sparkles over the pads.
  private stepAmbient(time: number, step: number): void {
    this.playMotif(time, step)
  }

  private arpStep(): number {
    const n = this.arpNotes.length
    const i = this.arpIndex
    switch (this.arpDir) {
      case 'down':
        return (n - 1 - (i % n) + n) % n
      case 'updown': {
        const period = Math.max(1, 2 * (n - 1))
        const j = i % period
        return j < n ? j : period - j
      }
      default:
        return i % n
    }
  }

  /** Play the current (developed) motif's note for this step. */
  private playMotif(time: number, step: number): void {
    if (!this.allows('lead') || this.melodyPool.length === 0) return
    const note = this.motif.notes.find((n) => n.step === step)
    if (!note) return
    let idx = note.pool
    if ((step === 0 || step === 8) && this.chordToneIdx.length > 0) {
      idx = this.chordToneIdx.reduce((best, c) => (Math.abs(c - idx) < Math.abs(best - idx) ? c : best), this.chordToneIdx[0])
    }
    const midi = this.melodyPool[Math.max(0, Math.min(this.melodyPool.length - 1, idx))]
    this.src.melody.trigger(midi, time + 0.005, note.vel, this.motifDur())
    if (step === 0 || step === 8) this.emitDraw('melody', note.vel, time)
  }

  /** A short snare roll into the next section on the final bar. */
  private maybeFill(time: number, step: number): void {
    if (!this.lastBarOfSection || step < 13) return
    this.src.drums.snare(time, 0.22 + (step - 13) * 0.13)
  }

  private emitDraw(kind: NoteEvent['kind'], intensity: number, time: number): void {
    Tone.getDraw().schedule(() => this.src.emit({ kind, intensity }), time)
  }

  stop(): void {
    this.measureLoop?.stop()
    this.measureLoop?.dispose()
    this.stepSeq?.stop()
    this.stepSeq?.dispose()
    this.measureLoop = null
    this.stepSeq = null
  }
}
