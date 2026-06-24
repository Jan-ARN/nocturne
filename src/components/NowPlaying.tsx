import type { TrackInfo } from '../audio/AudioEngine'
import { GENRES } from '../audio/genres'
import { KEY_NAMES, SCALE_LABELS } from '../audio/scales'

interface NowPlayingProps {
  info: TrackInfo | null
  section: string
}

/**
 * Makes the diversity visible: which genre, key, scale and tempo are playing, and
 * — crucially — which instruments this particular take drew. Seeing "Rhodes ·
 * Reece · Glass" change on every Shuffle is half the point.
 */
export function NowPlaying({ info, section }: NowPlayingProps) {
  if (!info) {
    return (
      <div className="nowplaying nowplaying--idle">
        <span className="nowplaying__hint">Press play to begin</span>
      </div>
    )
  }

  const { instruments } = info
  return (
    <div className="nowplaying" aria-live="polite">
      <div className="nowplaying__meta">
        <span className="nowplaying__genre">{GENRES[info.genre].name}</span>
        <span className="nowplaying__dot" aria-hidden="true">·</span>
        <span>{KEY_NAMES[info.pitchClass]} {SCALE_LABELS[info.scale]}</span>
        <span className="nowplaying__dot" aria-hidden="true">·</span>
        <span>{info.bpm} BPM</span>
        {section && (
          <>
            <span className="nowplaying__dot" aria-hidden="true">·</span>
            <span className="nowplaying__section">{section}</span>
          </>
        )}
      </div>
      <div className="nowplaying__instruments">
        <span className="chip"><span className="chip__role">keys</span>{instruments.chords}</span>
        <span className="chip"><span className="chip__role">bass</span>{instruments.bass}</span>
        <span className="chip"><span className="chip__role">lead</span>{instruments.lead}</span>
      </div>
    </div>
  )
}
