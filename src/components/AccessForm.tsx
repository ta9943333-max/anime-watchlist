"use client";

import { FormEvent, useEffect, useState } from "react";
import { Lock, Tv, User } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type AccessInfo = {
  mode: "open" | "site" | "member";
  names: string[];
};

export function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [info, setInfo] = useState<AccessInfo | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void fetch("/api/access")
      .then((res) => res.json())
      .then((data: AccessInfo) => {
        setInfo(data);
        if (data.mode === "member" && data.names.length > 0) {
          setName((current) => current || data.names[0]);
        }
      })
      .catch(() => setInfo({ mode: "site", names: [] }));
  }, []);

  const isMemberMode = info?.mode === "member";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isMemberMode ? { name, password } : { password },
        ),
      });

      if (!response.ok) {
        setError(
          isMemberMode
            ? "Name oder Passwort ist falsch."
            : "Falsches Passwort.",
        );
        return;
      }

      const from = searchParams.get("from") || "/";
      router.replace(from);
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400">
            <Tv className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-white">Anime Watchlist</h1>
          <p className="mt-2 text-sm text-slate-400">
            {isMemberMode
              ? "Wähle deinen Namen und gib dein persönliches Passwort ein."
              : "Private Gruppe — Passwort eingeben, um fortzufahren."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isMemberMode && (
            <div>
              <label
                htmlFor="access-name"
                className="mb-2 block text-sm text-slate-400"
              >
                Name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <select
                  id="access-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-white outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
                >
                  {info?.names.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="access-password"
              className="mb-2 block text-sm text-slate-400"
            >
              {isMemberMode ? "Dein Passwort" : "Gruppen-Passwort"}
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                id="access-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Passwort …"
                autoFocus
                className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-4 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          <button
            type="submit"
            disabled={!password.trim() || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isSubmitting ? "Prüfe …" : "Eintreten"}
          </button>
        </form>
      </div>
    </div>
  );
}
