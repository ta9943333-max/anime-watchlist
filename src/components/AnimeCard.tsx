import { Check } from "lucide-react";
import { ProgressBar } from "@/components/ProgressBar";
import { sortMembersByName, type AnimeEntry, type Member } from "@/lib/types";

type AnimeCardProps = {
  anime: AnimeEntry;
  members: Member[];
  currentUser: string;
  onToggleWatch: (animeId: string, memberName: string) => void;
};

export function AnimeCard({
  anime,
  members,
  currentUser,
  onToggleWatch,
}: AnimeCardProps) {
  const sortedMembers = sortMembersByName(members);
  const watchedCount = anime.watchedBy.length;
  const isWatchedByMe = anime.watchedBy.includes(currentUser);

  return (
    <article
      className={`rounded-xl border p-5 transition-all ${
        isWatchedByMe
          ? "border-emerald-500/30 bg-emerald-950/20"
          : "border-slate-800/80 bg-slate-900/50"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{anime.title}</h3>
        {isWatchedByMe && (
          <span className="shrink-0 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-400">
            Gesehen
          </span>
        )}
      </div>

      <ProgressBar value={watchedCount} max={members.length} />

      <div className="mt-5 flex flex-wrap gap-3">
        {sortedMembers.map((member) => {
          const isChecked = anime.watchedBy.includes(member.name);
          const isCurrentUser = member.name === currentUser;

          return (
            <label
              key={member.id}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all ${
                isChecked
                  ? "border-violet-500/40 bg-violet-600/15 text-violet-200"
                  : "border-slate-800 bg-slate-950/50 text-slate-400 hover:border-slate-700"
              } ${isCurrentUser ? "ring-1 ring-violet-500/30" : ""}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggleWatch(anime.id, member.name)}
                className="peer sr-only"
              />
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border transition-all ${
                  isChecked
                    ? "border-violet-500 bg-violet-500 text-white"
                    : "border-slate-600 bg-slate-900"
                }`}
              >
                {isChecked && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className="font-medium">{member.name}</span>
              {isCurrentUser && (
                <span className="text-xs text-violet-400">(Du)</span>
              )}
            </label>
          );
        })}
      </div>
    </article>
  );
}
