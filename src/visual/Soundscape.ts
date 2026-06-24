import type { Palette } from '../presets/presets'
import type { NoteEvent, NoteKind, Energy } from '../audio/events'
import type { VisualStyle } from '../audio/genres'

interface Blob {
  x: number
  y: number
  vx: number
  vy: number
  /** Radius as a fraction of the smaller canvas dimension. */
  radius: number
  color: string
  phase: number
}

interface Pulse {
  x: number
  y: number
  life: number
  maxLife: number
  /** Peak radius as a fraction of the smaller canvas dimension. */
  radiusFactor: number
  alphaScale: number
  intensity: number
}

const BLOB_COUNT = 5
const MAX_PULSES = 22

// Per-kind pulse character: where it lands, how big, how bright, how long.
const PULSE_STYLE: Record<NoteKind, { rf: number; alpha: number; life: number }> = {
  kick: { rf: 0.5, alpha: 0.55, life: 0.85 },
  snare: { rf: 0.32, alpha: 0.45, life: 0.7 },
  chord: { rf: 0.72, alpha: 0.24, life: 1.6 },
  melody: { rf: 0.17, alpha: 0.5, life: 1.0 },
}

/**
 * Slow drifting gradient field on a 2D canvas. Blobs wander and breathe; each
 * musical hit fires a soft pulse — the kick thumps from the center, melody notes
 * sparkle up top. Cheap by design: every gradient is painted only within its own
 * bounding box (no full-canvas overdraw), and the loop parks when audio stops.
 */
export class Soundscape {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private palette: Palette
  private readonly reducedMotion: boolean

  private blobs: Blob[] = []
  private pulses: Pulse[] = []

  // Per-genre flavor: how fast blobs drift, and whether to draw the synthwave grid.
  private speedScale = 1
  private gridEnabled = false

  // Audio-reactive: sampled spectrum, smoothed for the visual.
  private sampler: (() => Energy) | null = null
  private eLevel = 0
  private eBass = 0
  private eHigh = 0

  private width = 0
  private height = 0
  private dpr = 1

  private rafId: number | null = null
  private lastTime = 0
  private running = false
  private readonly resizeObserver: ResizeObserver

  constructor(canvas: HTMLCanvasElement, palette: Palette, reducedMotion: boolean) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas context unavailable')
    this.ctx = ctx
    this.palette = palette
    this.reducedMotion = reducedMotion

    this.seedBlobs()
    this.resize()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(canvas)
    this.draw()
  }

  private seedBlobs(): void {
    const { blobs } = this.palette
    this.blobs = Array.from({ length: BLOB_COUNT }, (_, i) => {
      const angle = (i / BLOB_COUNT) * Math.PI * 2
      const speed = this.reducedMotion ? 0 : 0.012
      return {
        x: 0.5 + Math.cos(angle) * 0.28,
        y: 0.5 + Math.sin(angle) * 0.28,
        vx: Math.cos(angle * 1.7) * speed,
        vy: Math.sin(angle * 2.3) * speed,
        radius: 0.4 + (i % 3) * 0.12,
        color: blobs[i % blobs.length],
        phase: (i / BLOB_COUNT) * Math.PI * 2,
      }
    })
  }

  setPalette(palette: Palette): void {
    this.palette = palette
    this.blobs.forEach((b, i) => {
      b.color = palette.blobs[i % palette.blobs.length]
    })
    if (!this.running) this.draw()
  }

  /** Provide a source of live spectrum energy to react to. */
  setSampler(sampler: () => Energy): void {
    this.sampler = sampler
  }

  /** Adjust visual character to match the genre. */
  applyGenre(style: VisualStyle): void {
    this.speedScale = style.drift
    this.gridEnabled = !!style.grid
    if (!this.running) this.draw()
  }

  pulse(event: NoteEvent): void {
    if (this.pulses.length >= MAX_PULSES) return
    const style = PULSE_STYLE[event.kind]
    let x: number
    let y: number
    switch (event.kind) {
      case 'kick':
        x = 0.5 + (Math.random() - 0.5) * 0.16
        y = 0.62 + (Math.random() - 0.5) * 0.16
        break
      case 'chord':
        x = 0.5
        y = 0.48
        break
      case 'melody':
        x = 0.15 + Math.random() * 0.7
        y = 0.15 + Math.random() * 0.35
        break
      default:
        x = 0.2 + Math.random() * 0.6
        y = 0.3 + Math.random() * 0.4
    }
    this.pulses.push({
      x,
      y,
      life: style.life,
      maxLife: style.life,
      radiusFactor: style.rf,
      alphaScale: style.alpha,
      intensity: event.intensity,
    })
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.rafId = requestAnimationFrame(this.loop)
  }

  stop(): void {
    this.running = false
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  dispose(): void {
    this.stop()
    this.resizeObserver.disconnect()
  }

  private resize(): void {
    const rect = this.canvas.getBoundingClientRect()
    // A soft gradient field doesn't need full retina density; cap to keep the
    // fill rate low on big/high-DPR screens.
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.width = Math.max(1, Math.round(rect.width))
    this.height = Math.max(1, Math.round(rect.height))
    this.canvas.width = Math.round(this.width * this.dpr)
    this.canvas.height = Math.round(this.height * this.dpr)
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    if (!this.running) this.draw()
  }

  private loop = (now: number): void => {
    if (!this.running) return
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.sampleEnergy()
    this.update(dt)
    this.draw()
    this.rafId = requestAnimationFrame(this.loop)
  }

  /** Pull and smooth the latest spectrum energy. */
  private sampleEnergy(): void {
    if (!this.sampler) return
    const e = this.sampler()
    // Asymmetric smoothing: snap up fast on transients, ease back down.
    this.eLevel += (e.level - this.eLevel) * (e.level > this.eLevel ? 0.5 : 0.12)
    this.eBass += (e.bass - this.eBass) * (e.bass > this.eBass ? 0.6 : 0.15)
    this.eHigh += (e.high - this.eHigh) * (e.high > this.eHigh ? 0.5 : 0.15)
  }

  private update(dt: number): void {
    for (const b of this.blobs) {
      b.x += b.vx * dt * this.speedScale
      b.y += b.vy * dt * this.speedScale
      if (b.x < 0.1 || b.x > 0.9) b.vx *= -1
      if (b.y < 0.1 || b.y > 0.9) b.vy *= -1
      b.x = Math.min(0.95, Math.max(0.05, b.x))
      b.y = Math.min(0.95, Math.max(0.05, b.y))
    }
    for (const p of this.pulses) p.life -= dt
    this.pulses = this.pulses.filter((p) => p.life > 0)
  }

  /** Paint a radial gradient, but only within its own bounding box. */
  private glow(x: number, y: number, r: number, stops: Array<[number, string]>): void {
    const { ctx, width, height } = this
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    for (const [offset, color] of stops) g.addColorStop(offset, color)
    ctx.fillStyle = g
    const x0 = Math.max(0, x - r)
    const y0 = Math.max(0, y - r)
    const x1 = Math.min(width, x + r)
    const y1 = Math.min(height, y + r)
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
  }

  private draw(): void {
    const { ctx, width, height, palette } = this
    const min = Math.min(width, height)
    const t = this.lastTime / 1000

    const sway = this.reducedMotion ? 0 : 0.06
    const cx = width * (0.5 + Math.sin(t * 0.05) * sway)
    const cy = height * (0.5 + Math.cos(t * 0.04) * sway)
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height))
    bg.addColorStop(0, palette.background[0])
    bg.addColorStop(1, palette.background[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    ctx.globalCompositeOperation = 'lighter'

    // Bass swells the blobs; overall level lifts their brightness.
    const pump = 1 + this.eBass * 0.5
    for (const b of this.blobs) {
      const breathe = (this.reducedMotion ? 1 : 1 + Math.sin(t * 0.3 + b.phase) * 0.15) * pump
      const r = b.radius * min * 0.55 * breathe
      const core = 0.5 + this.eLevel * 0.35
      this.glow(b.x * width, b.y * height, r, [
        [0, hexToRgba(b.color, core)],
        [0.6, hexToRgba(b.color, 0.12)],
        [1, hexToRgba(b.color, 0)],
      ])
    }

    for (const p of this.pulses) {
      const ratio = p.life / p.maxLife // 1 → 0
      const r = p.radiusFactor * min * (0.5 + (1 - ratio) * 0.85)
      const alpha = ratio * ratio * p.alphaScale * (0.5 + p.intensity * 0.5)
      this.glow(p.x * width, p.y * height, r, [
        [0, hexToRgba(palette.pulse, alpha)],
        [0.5, hexToRgba(palette.pulse, alpha * 0.3)],
        [1, hexToRgba(palette.pulse, 0)],
      ])
    }

    ctx.globalCompositeOperation = 'source-over'

    if (this.gridEnabled) this.drawGrid(t)
  }

  /** A faint scrolling perspective grid — the synthwave horizon. */
  private drawGrid(t: number): void {
    const { ctx, width, height, palette } = this
    const horizon = height * 0.64
    const vpX = width / 2
    const speed = this.reducedMotion ? 0 : t * 0.25

    ctx.save()
    ctx.strokeStyle = hexToRgba(palette.accent, 0.12 + this.eHigh * 0.3)
    ctx.lineWidth = 1

    // Receding horizontal lines, spacing growing toward the viewer.
    for (let i = 1; i <= 10; i++) {
      const f = ((i + speed) % 10) / 10
      const y = horizon + (height - horizon) * f * f
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.globalAlpha = f
      ctx.stroke()
    }

    // Vertical lines fanning out from the vanishing point.
    ctx.globalAlpha = 1
    for (let i = -7; i <= 7; i++) {
      const x = vpX + i * (width / 7)
      ctx.beginPath()
      ctx.moveTo(vpX, horizon)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    ctx.restore()
  }
}

/** Expand #rgb / #rrggbb to an rgba() string at the given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  let h = hex.replace('#', '')
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
