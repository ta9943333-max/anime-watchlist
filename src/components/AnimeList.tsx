import { Film } from "lucide-react";
import { AnimeCard } from "@/components/AnimeCard";
import type { AnimeStatus } from "@/lib/statuses";
import type { AnimeEntry, Folder, Member } from "@/lib/types";

type AnimeListProps = {
  animeList: AnimeEntry[];
  members: Member[];
  folders: Folder[];
  currentUser: string;
  onSetMyStatus: (animeId: string, status: AnimeStatus) => void;
  onSetEpisodesWatched: (animeId: string, episodesWatched: number) => void;
  onMoveToFolder: (animeId: string, folderId: string | null) => void;
  onRenameAnime: (animeId: string, title: string) => Promise<void>;
  onDeleteAnime: (animeId: string) => Promise<void>;
  onRateAnime: (animeId: string, rating: number) => void;
  onOpenProfile: (name: string) => void;
  emptyMessage?: string;
};

export function AnimeList({
  animeList,
  members,
  folders,
  currentUser,
  onSetMyStatus,
  onSetEpisodesWatched,
  onMoveToFolder,
  onRenameAnime,
  onDeleteAnime,
  onRateAnime,
  onOpenProfile,
  emptyMessage = "Keine Anime in dieser Ansicht.",
}: AnimeListProps) {
  if (animeList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 py-16 text-center">
        <Film className="mb-3 h-10 w-10 text-slate-600" />
        <p className="text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {animeList.map((anime) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          members={members}
          folders={folders}
          currentUser={currentUser}
          onSetMyStatus={onSetMyStatus}
          onSetEpisodesWatched={onSetEpisodesWatched}
          onMoveToFolder={onMoveToFolder}
          onRenameAnime={onRenameAnime}
          onDeleteAnime={onDeleteAnime}
          onRateAnime={onRateAnime}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  );
}
