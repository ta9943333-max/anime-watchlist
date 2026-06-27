"use client";

import { FormEvent, useState } from "react";
import { UserPlus, Users } from "lucide-react";
import type { Member } from "@/lib/types";

type UserSelectorProps = {
  members: Member[];
  onJoin: (name: string) => Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
};

export function UserSelector({
  members,
  onJoin,
  isSubmitting = false,
  error,
}: UserSelectorProps) {
  const [name, setName] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isSubmitting) return;
    await onJoin(trimmed);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Users className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Anime Watchlist</h1>
          <p className="mt-2 text-sm text-slate-400">
            Gib deinen Namen ein — jeder in der Gruppe kann sich selbst
            eintragen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="member-name" className="mb-2 block text-sm text-slate-400">
              Dein Name
            </label>
            <input
              id="member-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="z. B. Alex, Ben, Mia …"
              maxLength={30}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <UserPlus className="h-4 w-4" />
            {isSubmitting ? "Wird gespeichert …" : "Los geht's"}
          </button>
        </form>

        {members.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
              Bereits dabei (A → Z)
            </p>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => void onJoin(member.name)}
                  disabled={isSubmitting}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300 transition hover:border-violet-500/40 hover:text-white disabled:opacity-40"
                >
                  {member.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
