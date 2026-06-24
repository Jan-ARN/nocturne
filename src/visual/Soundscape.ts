import type { Palette } from '../presets/presets'
import type { NoteEvent } from '../audio/events'

interface Blob {
  /** Position in normalized 0..1 space. */
  x: number
  y: number
  vx: number
  vy: number
  /** Radius as a fraction of the smaller canvas dimension. */
  radius: number
  color: string
  /** Phase offset so blobs pulse out of sync. */
  phase: number
}

interface Pulse {
  x: number
  y: number
  /** 0..1, counts down to 0 as the pulse fades. */
  life: number
  intensity: number
  big: boolean
}

const BLOB_COUNT = 5

/**
 * Slow drifting gradient field rendered on a 2D canvas. Blobs wander and breathe;
 * each note fires a soft expanding pulse. Cheap by design — a handful of radial
 * gradients per frame — and it parks itself the moment audio stops.
 */
export class Soundscape {
  private readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private palette: Palette
  private readonly reducedMotion: boolean

  private blobs: Blob[] = []
  private pulses: Pulse[] = []

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
    // Paint one frame so there's something on screen before play.
    this.draw()
  }

  private seedBlobs(): void {
    const { blobs } = this.palette
    // Deterministic-ish spread so blobs start nicely distributed.
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

  pulse(event: NoteEvent): void {
    if (this.pulses.length > 48) return
    this.pulses.push({
      x: 0.15 + Math.random() * 0.7,
      y: 0.15 + Math.random() * 0.7,
      life: 1,
      intensity: event.intensity,
      big: event.kind === 'texture',
    })
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.lastTime = performance.now()
    this.loop(this.lastTime)
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
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.width = Math.max(1, Math.round(rect.width))
    this.height = Math.max(1, Math.round(rect.height))
    this.canvas.width = this.width * this.dpr
    this.canvas.height = this.height * this.dpr
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    if (!this.running) this.draw()
  }

  private loop = (now: number): void => {
    if (!this.running) return
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    this.update(dt)
    this.draw()
    this.rafId = requestAnimationFrame(this.loop)
  }

  private update(dt: number): void {
    for (const b of this.blobs) {
      b.x += b.vx * dt
      b.y += b.vy * dt
      // Gentle bounce so blobs stay loosely centered.
      if (b.x < 0.1 || b.x > 0.9) b.vx *= -1
      if (b.y < 0.1 || b.y > 0.9) b.vy *= -1
      b.x = Math.min(0.95, Math.max(0.05, b.x))
      b.y = Math.min(0.95, Math.max(0.05, b.y))
    }
    for (const p of this.pulses) {
      p.life -= dt / (p.big ? 2.6 : 1.8)
    }
    this.pulses = this.pulses.filter((p) => p.life > 0)
  }

  private draw(): void {
    const { ctx, width, height, palette } = this
    const min = Math.min(width, height)
    const t = this.lastTime / 1000

    // Backdrop: a soft radial gradient, slowly shifting its center. Held still
    // when the user prefers reduced motion.
    const sway = this.reducedMotion ? 0 : 0.06
    const cx = width * (0.5 + Math.sin(t * 0.05) * sway)
    const cy = height * (0.5 + Math.cos(t * 0.04) * sway)
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(width, height))
    bg.addColorStop(0, palette.background[0])
    bg.addColorStop(1, palette.background[1])
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, width, height)

    // Blobs, blended additively so overlaps glow.
    ctx.globalCompositeOperation = 'lighter'
    for (const b of this.blobs) {
      const breathe = this.reducedMotion ? 1 : 1 + Math.sin(t * 0.3 + b.phase) * 0.15
      const r = b.radius * min * 0.6 * breathe
      const x = b.x * width
      const y = b.y * height
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, hexToRgba(b.color, 0.5))
      grad.addColorStop(0.6, hexToRgba(b.color, 0.12))
      grad.addColorStop(1, hexToRgba(b.color, 0))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }

    // Note pulses — soft expanding rings of light.
    for (const p of this.pulses) {
      const eased = 1 - p.life
      const baseR = (p.big ? 0.32 : 0.2) * min
      const r = baseR * (0.4 + eased * 1.1)
      const alpha = p.life * p.life * (0.35 + p.intensity * 0.4)
      const x = p.x * width
      const y = p.y * height
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
      grad.addColorStop(0, hexToRgba(palette.pulse, alpha))
      grad.addColorStop(0.5, hexToRgba(palette.pulse, alpha * 0.3))
      grad.addColorStop(1, hexToRgba(palette.pulse, 0))
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }
    ctx.globalCompositeOperation = 'source-over'
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
