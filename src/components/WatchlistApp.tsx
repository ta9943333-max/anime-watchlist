"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Compass, List, LogOut, Sparkles, Trophy, Tv } from "lucide-react";
import { AnimeForm } from "@/components/AnimeForm";
import { AnimeList } from "@/components/AnimeList";
import { FilterTabs } from "@/components/FilterTabs";
import { FolderSection } from "@/components/FolderSection";
import { GenreFilter } from "@/components/GenreFilter";
import { Leaderboard } from "@/components/Leaderboard";
import { MalDiscover } from "@/components/MalDiscover";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { MonthlyRecapModal } from "@/components/MonthlyRecapModal";
import { SearchBar } from "@/components/SearchBar";
import { SortTabs } from "@/components/SortTabs";
import { UserSelector } from "@/components/UserSelector";
import {
  applyDiscoverStatusToMemberStatuses,
  clearDiscoverStatus,
  getDiscoverStatusSyncs,
} from "@/lib/discover-status";
import {
  addOrMergeAnime,
  deleteAnime,
  enrichMissingMalMetadata,
  fetchAnimeList,
  moveAnimeToFolder,
  renameAnime,
  subscribeToAnimeChanges,
  updateMemberStatuses,
  updateRatings,
} from "@/lib/supabase/anime-service";
import {
  createFolder,
  deleteFolder,
  fetchFolders,
  subscribeToFolderChanges,
} from "@/lib/supabase/folder-service";
import {
  fetchAllowedMemberNames,
  fetchMembers,
  registerMember,
  subscribeToMemberChanges,
} from "@/lib/supabase/member-service";
import {
  clearCurrentUser,
  getRecapMonthToShow,
  hasSeenRecap,
  loadCurrentUser,
  markRecapSeen,
  saveCurrentUser,
} from "@/lib/storage";
import { buildMonthlyRecap, type MonthlyRecap } from "@/lib/stats/leaderboard";
import {
  getMemberStatus,
  getMemberEpisodesWatched,
  getMemberProgressEpisodes,
  getMemberProgressMinutes,
  isFinishedStatus,
  setMemberStatus,
  setMemberEpisodesWatched,
  setMemberRewatchCount,
  statusShowsEpisodeProgress,
  type AnimeStatus,
} from "@/lib/statuses";
import {
  applyAnimeFilters,
  mergeAnimeLists,
  sortMembersByName,
  type AddAnimePayload,
  type AnimeEntry,
  type FilterOption,
  type Folder,
  type Member,
  type SortOption,
  type ViewTab,
} from "@/lib/types";

function getInitialUser(): string | null {
  return loadCurrentUser();
}

export function WatchlistApp() {
  const [currentUser, setCurrentUser] = useState<string | null>(getInitialUser);
  const [members, setMembers] = useState<Member[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [animeList, setAnimeList] = useState<AnimeEntry[]>([]);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [isSyncingMal, setIsSyncingMal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [allowedNames, setAllowedNames] = useState<string[] | null>(null);
  const [accessMode, setAccessMode] = useState<"open" | "site" | "member">(
    "open",
  );
  const [profileName, setProfileName] = useState<string | null>(null);
  const [recap, setRecap] = useState<MonthlyRecap | null>(null);
  const recapCheckedRef = useRef(false);
  const discoverSyncInFlightRef = useRef<Set<string>>(new Set());
  const [folderSetupNeeded, setFolderSetupNeeded] = useState(false);
  const didAutoSyncRef = useRef(false);
  const skipRemoteSyncUntilRef = useRef(0);

  function markLocalWrite() {
    skipRemoteSyncUntilRef.current = Date.now() + 2000;
  }

  function shouldSkipRemoteSync() {
    return Date.now() < skipRemoteSyncUntilRef.current;
  }

  useEffect(() => {
    if (recapCheckedRef.current) return;
    if (!currentUser || isLoading || members.length === 0) return;

    const target = getRecapMonthToShow();
    recapCheckedRef.current = true;

    if (!target || hasSeenRecap(target.year, target.month)) return;

    const built = buildMonthlyRecap(
      members,
      animeList,
      target.year,
      target.month,
    );
    if (built.totalCompleted > 0) {
      setRecap(built);
    } else {
      markRecapSeen(target.year, target.month);
    }
  }, [currentUser, isLoading, members, animeList]);

  useEffect(() => {
    if (!currentUser) return;

    const syncs = getDiscoverStatusSyncs(animeList, currentUser).filter(
      (sync) => !discoverSyncInFlightRef.current.has(sync.animeId),
    );
    if (syncs.length === 0) return;

    let cancelled = false;

    void (async () => {
      markLocalWrite();
      for (const sync of syncs) {
        if (cancelled) return;
        discoverSyncInFlightRef.current.add(sync.animeId);
        try {
          await updateMemberStatuses(sync.animeId, sync.memberStatuses);
          clearDiscoverStatus(currentUser, sync.malId, sync.anilistId);
          setAnimeList((prev) =>
            prev.map((anime) =>
              anime.id === sync.animeId
                ? { ...anime, memberStatuses: sync.memberStatuses }
                : anime,
            ),
          );
        } catch {
          discoverSyncInFlightRef.current.delete(sync.animeId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [animeList, currentUser]);

  useEffect(() => {
    void fetch("/api/access")
      .then((res) => res.json())
      .then(async (data: { mode: "open" | "site" | "member"; member: string | null }) => {
        setAccessMode(data.mode);
        if (data.mode === "member" && data.member) {
          setCurrentUser(data.member);
          saveCurrentUser(data.member);
          try {
            await registerMember(data.member);
          } catch {
            // Mitglied existiert bereits oder ist nicht freigeschaltet
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        const [list, memberList, allowed] = await Promise.all([
          fetchAnimeList(),
          fetchMembers(),
          fetchAllowedMemberNames(),
        ]);

        let folderList: Folder[] = [];
        try {
          folderList = await fetchFolders();
          if (!cancelled) setFolderSetupNeeded(false);
        } catch {
          if (!cancelled) setFolderSetupNeeded(true);
        }

        if (!cancelled) {
          setAnimeList((prev) => mergeAnimeLists(prev, list));
          setMembers(memberList);
          setAllowedNames(allowed);
          setFolders(folderList);
          setError(null);
        }

        if (!cancelled && !didAutoSyncRef.current) {
          const missing = list.filter(
            (anime) => !anime.totalDurationMin || !anime.airedFrom,
          );
          if (missing.length > 0) {
            didAutoSyncRef.current = true;
            setIsSyncingMal(true);
            void enrichMissingMalMetadata(list)
              .then((enriched) => {
                if (!cancelled) {
                  setAnimeList((prev) => mergeAnimeLists(prev, enriched));
                }
              })
              .catch(() => {})
              .finally(() => {
                if (!cancelled) setIsSyncingMal(false);
              });
          }
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
      if (shouldSkipRemoteSync()) return;
      void loadData();
    });
    const unsubscribeMembers = subscribeToMemberChanges(() => {
      if (shouldSkipRemoteSync()) return;
      void loadData();
    });
    const unsubscribeFolders = subscribeToFolderChanges(() => {
      if (shouldSkipRemoteSync()) return;
      void loadData();
    });

    return () => {
      cancelled = true;
      unsubscribeAnime();
      unsubscribeMembers();
      unsubscribeFolders();
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

  async function handleLogout() {
    if (accessMode === "member") {
      try {
        await fetch("/api/access", { method: "DELETE" });
      } catch {
        // ignorieren
      }
      clearCurrentUser();
      window.location.href = "/access";
      return;
    }

    setCurrentUser(null);
    setOpenFolderId(null);
    clearCurrentUser();
  }

  async function handleAddAnime(payload: AddAnimePayload) {
    try {
      markLocalWrite();
      const { entry, merged } = await addOrMergeAnime(payload, animeList);
      let savedEntry = entry;

      if (currentUser) {
        const withDiscoverStatus = applyDiscoverStatusToMemberStatuses(
          entry.memberStatuses,
          currentUser,
          payload.malId ?? null,
          payload.anilistId ?? null,
        );
        if (withDiscoverStatus !== entry.memberStatuses) {
          markLocalWrite();
          await updateMemberStatuses(entry.id, withDiscoverStatus);
          savedEntry = { ...entry, memberStatuses: withDiscoverStatus };
          clearDiscoverStatus(
            currentUser,
            payload.malId ?? null,
            payload.anilistId ?? null,
          );
        }
      }

      setAnimeList((prev) => {
        if (merged) {
          return prev.map((item) =>
            item.id === savedEntry.id ? savedEntry : item,
          );
        }
        if (prev.some((item) => item.id === savedEntry.id)) {
          return prev.map((item) =>
            item.id === savedEntry.id ? savedEntry : item,
          );
        }
        return [savedEntry, ...prev];
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anime konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleAddAnimeToFolder(payload: AddAnimePayload, folderId: string) {
    try {
      const { entry, merged } = await addOrMergeAnime(
        { ...payload, folderId },
        animeList,
      );
      setAnimeList((prev) => {
        if (merged) {
          return prev.map((item) => (item.id === entry.id ? entry : item));
        }
        if (prev.some((item) => item.id === entry.id)) {
          return prev;
        }
        return [entry, ...prev];
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Anime konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleSyncMal() {
    setIsSyncingMal(true);
    try {
      const enriched = await enrichMissingMalMetadata(animeList);
      setAnimeList(enriched);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "MAL-Daten konnten nicht geladen werden.",
      );
    } finally {
      setIsSyncingMal(false);
    }
  }

  async function handleCreateFolder(name: string) {
    try {
      const folder = await createFolder(name);
      setFolders((prev) => [...prev, folder]);
      setOpenFolderId(folder.id);
      setFolderSetupNeeded(false);
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Ordner konnte nicht erstellt werden.";
      if (message.includes("Ordner-Tabelle fehlt")) {
        setFolderSetupNeeded(true);
      }
      setError(message);
    }
  }

  async function handleDeleteFolder(folderId: string) {
    await deleteFolder(folderId);
    setFolders((prev) => prev.filter((f) => f.id !== folderId));
    setAnimeList((prev) =>
      prev.map((a) => (a.folderId === folderId ? { ...a, folderId: null } : a)),
    );
    setOpenFolderId(null);
  }

  async function handleMoveToFolder(animeId: string, folderId: string | null) {
    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId ? { ...entry, folderId } : entry,
      ),
    );

    try {
      await moveAnimeToFolder(animeId, folderId);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error ? err.message : "Verschieben fehlgeschlagen.",
      );
    }
  }

  async function handleDeleteAnime(animeId: string) {
    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    setAnimeList((prev) => prev.filter((entry) => entry.id !== animeId));

    try {
      await deleteAnime(animeId);
      setError(null);
    } catch (err) {
      setAnimeList((prev) => [anime, ...prev]);
      setError(
        err instanceof Error ? err.message : "Anime konnte nicht gelöscht werden.",
      );
      throw err;
    }
  }

  async function handleRenameAnime(animeId: string, title: string) {
    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId ? { ...entry, title } : entry,
      ),
    );

    try {
      const updated = await renameAnime(animeId, title);
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? updated : entry)),
      );
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Anime konnte nicht umbenannt werden.",
      );
      throw err;
    }
  }

  async function handleRateAnime(animeId: string, rating: number) {
    if (!currentUser) return;

    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    const nextRatings = { ...anime.ratings };
    if (rating > 0) {
      nextRatings[currentUser] = rating;
    } else {
      delete nextRatings[currentUser];
    }

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId ? { ...entry, ratings: nextRatings } : entry,
      ),
    );

    try {
      await updateRatings(animeId, nextRatings);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Bewertung konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleSetEpisodesWatched(
    animeId: string,
    episodesWatched: number,
  ) {
    if (!currentUser) return;

    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    markLocalWrite();
    const nextStatuses = setMemberEpisodesWatched(
      anime.memberStatuses,
      currentUser,
      episodesWatched,
    );

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId
          ? { ...entry, memberStatuses: nextStatuses }
          : entry,
      ),
    );

    try {
      await updateMemberStatuses(animeId, nextStatuses);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Episoden-Fortschritt konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleSetRewatchCount(animeId: string, rewatchCount: number) {
    if (!currentUser) return;

    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    markLocalWrite();
    const nextStatuses = setMemberRewatchCount(
      anime.memberStatuses,
      currentUser,
      rewatchCount,
    );
    if (nextStatuses === anime.memberStatuses) return;

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId
          ? { ...entry, memberStatuses: nextStatuses }
          : entry,
      ),
    );

    try {
      await updateMemberStatuses(animeId, nextStatuses);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Rewatch-Anzahl konnte nicht gespeichert werden.",
      );
    }
  }

  async function handleSetMyStatus(animeId: string, status: AnimeStatus) {
    if (!currentUser) return;

    const anime = animeList.find((entry) => entry.id === animeId);
    if (!anime) return;

    const previousStatus = getMemberStatus(anime.memberStatuses, currentUser);
    let episodesWatched: number | undefined;
    if (
      statusShowsEpisodeProgress(status) &&
      isFinishedStatus(previousStatus) &&
      anime.episodes != null
    ) {
      episodesWatched = anime.episodes;
    } else if (statusShowsEpisodeProgress(status)) {
      episodesWatched =
        getMemberEpisodesWatched(anime.memberStatuses, currentUser) ?? 0;
    }

    markLocalWrite();
    const nextStatuses = setMemberStatus(
      anime.memberStatuses,
      currentUser,
      status,
      episodesWatched,
    );

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId
          ? { ...entry, memberStatuses: nextStatuses }
          : entry,
      ),
    );

    try {
      await updateMemberStatuses(animeId, nextStatuses);
      setError(null);
    } catch (err) {
      setAnimeList((prev) =>
        prev.map((entry) => (entry.id === animeId ? anime : entry)),
      );
      setError(
        err instanceof Error
          ? err.message
          : "Status konnte nicht gespeichert werden.",
      );
    }
  }

  const sortedMembers = useMemo(() => sortMembersByName(members), [members]);

  const filterOptions = useMemo(
    () => ({
      currentUser: currentUser ?? "",
      filter,
      search,
      sort,
      genre: selectedGenre,
    }),
    [currentUser, filter, search, sort, selectedGenre],
  );

  const openFolderAnime = useMemo(() => {
    if (!currentUser || !openFolderId) return [];

    return applyAnimeFilters(animeList, {
      ...filterOptions,
      scope: "folder",
      folderId: openFolderId,
    });
  }, [animeList, currentUser, filterOptions, openFolderId]);

  const allAnimeList = useMemo(() => {
    if (!currentUser) return [];

    return applyAnimeFilters(animeList, {
      ...filterOptions,
      scope: "all",
    });
  }, [animeList, currentUser, filterOptions]);

  const stats = useMemo(() => {
    if (!currentUser) {
      return { series: 0, episodes: 0, hours: 0, days: 0 };
    }

    let series = 0;
    let episodes = 0;
    let minutes = 0;

    for (const anime of animeList) {
      const status = getMemberStatus(anime.memberStatuses, currentUser);
      const watchedEps = getMemberProgressEpisodes(
        anime.memberStatuses,
        currentUser,
        anime.episodes,
      );
      const watchedMins = getMemberProgressMinutes(
        anime.memberStatuses,
        currentUser,
        anime.episodes,
        anime.episodeDurationMin,
        anime.totalDurationMin,
      );

      if (watchedEps <= 0 && watchedMins <= 0) continue;

      if (isFinishedStatus(status)) {
        series += 1;
      }

      episodes += watchedEps;
      minutes += watchedMins;
    }

    return {
      series,
      episodes,
      hours: Math.round((minutes / 60) * 10) / 10,
      days: Math.round((minutes / 60 / 24) * 10) / 10,
    };
  }, [animeList, currentUser]);

  if (!currentUser) {
    return (
      <UserSelector
        members={sortedMembers}
        allowedNames={allowedNames}
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

      <div
        className={
          viewTab === "leaderboard"
            ? "relative mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12"
            : "relative w-full px-3 py-6 sm:px-4 sm:py-8 lg:px-5"
        }
      >
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
                <button
                  type="button"
                  onClick={() => setProfileName(currentUser)}
                  className="font-medium text-violet-300 underline-offset-2 hover:underline"
                >
                  {currentUser}
                </button>
                {" · "}
                {sortedMembers.length} in der Gruppe
              </p>
            </div>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400 transition hover:border-slate-700 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              {accessMode === "member" ? "Logout" : "Wechseln"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Serien", value: stats.series },
              { label: "Folgen", value: stats.episodes },
              { label: "Stunden", value: stats.hours },
              { label: "Tage", value: stats.days },
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

        <div className="mb-8 flex gap-2">
          <button
            type="button"
            onClick={() => setViewTab("list")}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              viewTab === "list"
                ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <List className="h-4 w-4" />
            Watchlist
          </button>
          <button
            type="button"
            onClick={() => setViewTab("discover")}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              viewTab === "discover"
                ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Compass className="h-4 w-4" />
            Discover
          </button>
          <button
            type="button"
            onClick={() => setViewTab("leaderboard")}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
              viewTab === "leaderboard"
                ? "border-violet-500/50 bg-violet-600/20 text-violet-200"
                : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-white"
            }`}
          >
            <Trophy className="h-4 w-4" />
            Leaderboard
          </button>
        </div>

        {viewTab === "leaderboard" ? (
          isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            </div>
          ) : (
            <Leaderboard
              members={sortedMembers}
              animeList={animeList}
              currentUser={currentUser}
              isSyncingMal={isSyncingMal}
              onSyncMal={() => void handleSyncMal()}
              onOpenProfile={setProfileName}
            />
          )
        ) : viewTab === "discover" ? (
          <MalDiscover
            animeList={animeList}
            currentUser={currentUser}
            onAdd={handleAddAnime}
            onSetMyStatus={handleSetMyStatus}
            onSetEpisodesWatched={handleSetEpisodesWatched}
            onSetRewatchCount={handleSetRewatchCount}
          />
        ) : (
          <>
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
          <SearchBar value={search} onChange={setSearch} />
          <FilterTabs active={filter} onChange={setFilter} />
          <GenreFilter
            animeList={animeList}
            selectedGenre={selectedGenre}
            onChange={setSelectedGenre}
          />
          <SortTabs active={sort} onChange={setSort} />
          {(filter !== "all" || selectedGenre) && (
            <p className="text-xs text-slate-500">
              Gefiltert
              {filter !== "all" && " nach Status"}
              {filter !== "all" && selectedGenre && " und"}
              {selectedGenre && ` nach Genre „${selectedGenre}"`}
              .
            </p>
          )}
        </section>

        {folderSetupNeeded && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            Ordner benötigen einmalig SQL in Supabase: Datei{" "}
            <code className="text-amber-100">supabase/migrations/add_folders.sql</code>{" "}
            im SQL Editor ausführen.
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : (
          <>
            <FolderSection
              folders={folders}
              animeList={animeList}
              openFolderId={openFolderId}
              openFolderAnime={openFolderAnime}
              members={sortedMembers}
              currentUser={currentUser}
              onOpenFolder={setOpenFolderId}
              onCreateFolder={handleCreateFolder}
              onDeleteFolder={handleDeleteFolder}
              onAddAnimeToFolder={handleAddAnimeToFolder}
              onSetMyStatus={handleSetMyStatus}
              onSetEpisodesWatched={handleSetEpisodesWatched}
              onSetRewatchCount={handleSetRewatchCount}
              onMoveToFolder={handleMoveToFolder}
              onRenameAnime={handleRenameAnime}
              onDeleteAnime={handleDeleteAnime}
              onRateAnime={handleRateAnime}
              onOpenProfile={setProfileName}
            />

            {!openFolderId && (
              <section className="w-full">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-white">Alle Anime</h2>
                  <p className="text-sm text-slate-500">
                    Komplette Liste · {allAnimeList.length} Einträge
                  </p>
                </div>

                <div className="mb-5">
                  <AnimeForm onAdd={handleAddAnime} />
                </div>

                <AnimeList
                  animeList={allAnimeList}
                  members={sortedMembers}
                  folders={folders}
                  currentUser={currentUser}
                  onSetMyStatus={handleSetMyStatus}
                  onSetEpisodesWatched={handleSetEpisodesWatched}
                  onSetRewatchCount={handleSetRewatchCount}
                  onMoveToFolder={handleMoveToFolder}
                  onRenameAnime={handleRenameAnime}
                  onDeleteAnime={handleDeleteAnime}
                  onRateAnime={handleRateAnime}
                  onOpenProfile={setProfileName}
                />
              </section>
            )}
          </>
        )}
          </>
        )}
      </div>

      {profileName && (
        <MemberProfileModal
          name={profileName}
          animeList={animeList}
          isCurrentUser={profileName === currentUser}
          onClose={() => setProfileName(null)}
        />
      )}

      {recap && currentUser && (
        <MonthlyRecapModal
          recap={recap}
          currentUser={currentUser}
          onClose={() => {
            markRecapSeen(recap.year, recap.month);
            setRecap(null);
          }}
        />
      )}
    </div>
  );
}
