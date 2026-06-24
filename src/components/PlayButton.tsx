interface PlayButtonProps {
  playing: boolean
  busy: boolean
  onToggle: () => void
}

export function PlayButton({ playing, busy, onToggle }: PlayButtonProps) {
  return (
    <button
      type="button"
      className="play-button"
      onClick={onToggle}
      aria-pressed={playing}
      aria-label={playing ? 'Stop' : 'Play'}
      data-state={busy ? 'busy' : playing ? 'playing' : 'idle'}
    >
      <span className="play-button__ring" aria-hidden="true" />
      <span className="play-button__icon" aria-hidden="true">
        {playing ? (
          <svg viewBox="0 0 24 24" width="34" height="34">
            <rect x="6" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" fill="currentColor" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="34" height="34">
            <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
          </svg>
        )}
      </span>
    </button>
  )
}
