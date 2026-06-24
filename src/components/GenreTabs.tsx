import { GENRES, type GenreId } from '../audio/genres'

interface GenreTabsProps {
  current: GenreId
  onSelect: (genre: GenreId) => void
}

export function GenreTabs({ current, onSelect }: GenreTabsProps) {
  return (
    <div className="genre-tabs" role="tablist" aria-label="Genre">
      {Object.values(GENRES).map((genre) => (
        <button
          key={genre.id}
          type="button"
          role="tab"
          aria-selected={genre.id === current}
          className="genre-tab"
          data-active={genre.id === current}
          title={genre.blurb}
          onClick={() => onSelect(genre.id)}
        >
          {genre.name}
        </button>
      ))}
    </div>
  )
}
