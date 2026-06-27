"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, LogOut, Sparkles, Tv } from "lucide-react";
import { AnimeForm } from "@/components/AnimeForm";
import { AnimeList } from "@/components/AnimeList";
import { FilterTabs } from "@/components/FilterTabs";
import { SearchBar } from "@/components/SearchBar";
import { SortTabs } from "@/components/SortTabs";
import { UserSelector } from "@/components/UserSelector";
import {
  addAnime,
  fetchAnimeList,
  subscribeToAnimeChanges,
  updateWatchedBy,
} from "@/lib/supabase/anime-service";
import {
  fetchMembers,
  registerMember,
  subscribeToMemberChanges,
} from "@/lib/supabase/member-service";
import {
  clearCurrentUser,
  loadCurrentUser,
  saveCurrentUser,
} from "@/lib/storage";
import {
  sortAnimeList,
  sortMembersByName,
  type AnimeEntry,
  type FilterOption,
  type Member,
  type SortOption,
} from "@/lib/types";

function getInitialUser(): string | null {
  return loadCurrentUser();
}

export function WatchlistApp() {
  const [currentUser, setCurrentUser] = useState<string | null>(getInitialUser);
  const [members, setMembers] = useState<Member[]>([]);
  const [animeList, setAnimeList] = useState<AnimeEntry[]>([]);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [list, memberList] = await Promise.all([
          fetchAnimeList(),
          fetchMembers(),
        ]);
        if (!cancelled) {
          setAnimeList(list);
          setMembers(memberList);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Verbindung zu Supabase fehlgeschlagen.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadData();

    const unsubscribeAnime = subscribeToAnimeChanges(() => {
      void loadData();
    });
    const unsubscribeMembers = subscribeToMemberChanges(() => {
      void loadData();
    });

    return () => {
      cancelled = true;
      unsubscribeAnime();
      unsubscribeMembers();
    };
  }, []);

  async function handleJoin(name: string) {
    setIsJoining(true);
    setJoinError(null);

    try {
      await registerMember(name);
      const memberList = await fetchMembers();
      setMembers(memberList);
      setCurrentUser(name);
      saveCurrentUser(name);
    } catch (err) {
      setJoinError(
        err instanceof Error ? err.message : "Name konnte nicht gespeichert werden.",
      );
    } finally {
      setIsJoining(false);
    }
  }

  function handleLogout() {
    setCurrentUser(null);
    clearCurrentUser();
  }

  async function handleAddAnime(title: string) {
    try {
      const entry = await addAnime(title);
      setAnimeList((prev) => [entry, ...prev]);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anime konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleToggleWatch(animeId: string, memberName: string) {
    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    const hasWatched = anime.watchedBy.includes(memberName);
    const nextWatchedBy = hasWatched
      ? anime.watchedBy.filter((name) => name !== memberName)
      : [...anime.watchedBy, memberName];

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId ? { ...entry, watchedBy: nextWatchedBy } : entry,
      ),
    );

    try {
      await updateWatchedBy(animeId, nextWatchedBy);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Fortschritt konnte nicht gespeichert werden.",
      );
    }
  }

  const sortedMembers = useMemo(() => sortMembersByName(members), [members]);

  const filteredList = useMemo(() => {
    if (!currentUser) return [];

    let list = animeList.filter((anime) => {
      const watchedByMe = anime.watchedBy.includes(currentUser);

      switch (filter) {
        case "watched-by-me":
          return watchedByMe;
        case "unwatched":
          return !watchedByMe;
        default:
          return true;
      }
    });

    if (search.trim()) {
      const query = search.trim().toLowerCase();
      list = list.filter((anime) =>
        anime.title.toLowerCase().includes(query),
      );
    }

    return sortAnimeList(list, sort);
  }, [animeList, currentUser, filter, search, sort]);

  const stats = useMemo(() => {
    if (!currentUser) return { total: 0, watched: 0, unwatched: 0 };

    const watched = animeList.filter((a) =>
      a.watchedBy.includes(currentUser),
    ).length;

    return {
      total: animeList.length,
      watched,
      unwatched: animeList.length - watched,
    };
  }, [animeList, currentUser]);

  if (!currentUser) {
    return (
      <UserSelector
        members={sortedMembers}
        onJoin={handleJoin}
        isSubmitting={isJoining}
        error={joinError}
      />
    );
  }

  return (
    <div className="min-h-screen">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-xl bg-violet-600/15 px-3 py-1 text-xs font-medium text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Gemeinsame Watchlist · Live
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-bold text-white sm:text-3xl">
                <Tv className="h-7 w-7 text-violet-400" />
                Anime Watchlist
              </h1>
              <p className="mt-1 text-slate-400">
                Eingeloggt als{" "}
                <span className="font-medium text-violet-300">{currentUser}</span>
                {" · "}
                {sortedMembers.length} in der Gruppe
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              Wechseln
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gesamt", value: stats.total },
              { label: "Gesehen", value: stats.watched },
              { label: "Offen", value: stats.unwatched },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-3 text-center"
              >
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </header>

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Verbindungsfehler</p>
              <p className="mt-1 text-red-300/90">{error}</p>
            </div>
          </div>
        )}

        <section className="mb-8 space-y-4">
          <AnimeForm onAdd={handleAddAnime} />
          <SearchBar value={search} onChange={setSearch} />
          <FilterTabs active={filter} onChange={setFilter} />
          <SortTabs active={sort} onChange={setSort} />
        </section>

        <section>
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <AnimeList
              animeList={filteredList}
              members={sortedMembers}
              currentUser={currentUser}
              onToggleWatch={handleToggleWatch}
            />
          )}
        </section>

        <p className="mt-8 text-center text-xs text-slate-600">
          Namen alphabetisch · Sortierung wählbar · Suche nach Titel
        </p>
      </div>
    </div>
  );
}
