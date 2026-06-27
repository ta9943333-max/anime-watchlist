import { Users } from "lucide-react";
import { FRIENDS, type Friend } from "@/lib/types";

type UserSelectorProps = {
  onSelect: (user: Friend) => void;
};

export function UserSelector({ onSelect }: UserSelectorProps) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Anime Watchlist</h1>
          <p className="mt-2 text-sm text-slate-400">
            Wer bist du? Wähle dein Profil, um die gemeinsame Liste zu
            bearbeiten.
          </p>
        </div>

        <div className="grid gap-3">
          {FRIENDS.map((friend) => (
            <button
              key={friend}
              type="button"
              onClick={() => onSelect(friend)}
              className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-4 text-left transition-all hover:border-violet-500/50 hover:bg-violet-600/10"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-emerald-400 text-sm font-bold text-slate-950">
                {friend.charAt(0)}
              </span>
              <span className="text-lg font-medium text-white group-hover:text-violet-200">
                {friend}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
