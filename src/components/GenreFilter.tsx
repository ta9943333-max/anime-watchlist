"use client";

import { getAllGenres } from "@/lib/stats/leaderboard";
import type { AnimeEntry } from "@/lib/types";

type GenreFilterProps = {
  animeList: AnimeEntry[];
  selectedGenre: string | null;
  onChange: (genre: string | null) => void;
};

export function GenreFilter({
  animeList,
  selectedGenre,
  onChange,
}: GenreFilterProps) {
  const genres = getAllGenres(animeList);

  if (genres.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Genre
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
            selectedGenre === null
              ? "bg-pink-600 text-white shadow-lg shadow-pink-900/30"
              : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white"
          }`}
        >
          All genres
        </button>
        {genres.map((genre) => (
          <button
            key={genre}
            type="button"
            onClick={() => onChange(genre === selectedGenre ? null : genre)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              selectedGenre === genre
                ? "bg-pink-600 text-white shadow-lg shadow-pink-900/30"
                : "bg-slate-800/60 text-slate-300 hover:bg-slate-700/80 hover:text-white"
            }`}
          >
            {genre}
          </button>
        ))}
      </div>
    </div>
  );
}
