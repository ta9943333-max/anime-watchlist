import { Film } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import type { AnimeEntry, Member } from "@/lib/types";

type AnimeListProps = {
  animeList: AnimeEntry[];
  members: Member[];
  currentUser: string;
  onToggleWatch: (animeId: string, memberName: string) => void;
};

export function AnimeList({
  animeList,
  members,
  currentUser,
  onToggleWatch,
}: AnimeListProps) {
  if (animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
        <Film className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-slate-400">Keine Anime in dieser Ansicht.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {animeList.map((anime) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          members={members}
          currentUser={currentUser}
          onToggleWatch={onToggleWatch}
        />
      ))}
    </div>
  );
}
