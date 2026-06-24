import * as Tone from 'tone'

// Seconds to fade a layer when it's muted or unmuted.
const MUTE_RAMP = 0.08
// Extra seconds to wait after the fade-out before freeing nodes, so the tail rings.
const DISPOSE_MARGIN = 0.2

/**
 * Base for the instrument voices. Owns the output gain and the mute/dispose
 * lifecycle; each subclass builds its synth nodes, connects them to `out`, and
 * lists them in disposeNodes() so they're released after the fade.
 */
export abstract class Voice {
  protected readonly out: Tone.Gain
  protected disposed = false
  private readonly level: number
  private readonly fadeOut: number

  constructor(dest: Tone.InputNode, level: number, fadeOut: number) {
    this.level = level
    this.fadeOut = fadeOut
    this.out = new Tone.Gain(level).connect(dest)
  }

  setMuted(muted: boolean): void {
    if (this.disposed) return
    this.out.gain.rampTo(muted ? 0 : this.level, MUTE_RAMP)
  }

  /** Release the nodes this voice created. */
  protected abstract disposeNodes(): void

  dispose(fade = this.fadeOut): void {
    if (this.disposed) return
    this.disposed = true
    this.out.gain.rampTo(0, fade)
    window.setTimeout(() => {
      this.disposeNodes()
      this.out.dispose()
    }, (fade + DISPOSE_MARGIN) * 1000)
  }
}
