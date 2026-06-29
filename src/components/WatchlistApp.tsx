"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AlertCircle } from "lucide-react";
import { AppBottomNav } from "@/components/AppBottomNav";
import { AnimeForm } from "@/components/AnimeForm";
import { AnimeList } from "@/components/AnimeList";
import { FolderSection } from "@/components/FolderSection";
import { GenreFilter } from "@/components/GenreFilter";
import { Leaderboard } from "@/components/Leaderboard";
import { LibraryStatusTabs } from "@/components/LibraryStatusTabs";
import { SkeletonCardGrid } from "@/components/ui/SkeletonCard";
import { MemberProfileModal } from "@/components/MemberProfileModal";
import { MonthlyRecapModal } from "@/components/MonthlyRecapModal";
import { ProfileTab } from "@/components/ProfileTab";
import { SearchBar } from "@/components/SearchBar";
import { SortTabs } from "@/components/SortTabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserSelector } from "@/components/UserSelector";
import {
  applyDiscoverEntryToWatchlist,
  clearDiscoverEntry,
  clearAllDiscoverStatuses,
} from "@/lib/discover-status";
import {
  addOrMergeAnime,
  deleteAnime,
  enrichMissingMalMetadata,
  fetchAnimeList,
  moveAnimeToFolder,
  renameAnime,
  reconcileAnimeMetadata,
  ensureAnimeHasRuntime,
  resetAllWatchProgress,
  clearAllAnimeFromWatchlist,
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
  clearLocalProgressCache,
  saveCurrentUser,
} from "@/lib/storage";
import {
  clearAnimeListCache,
  loadAnimeListCache,
  saveAnimeListCache,
} from "@/lib/storage/anime-list-cache";
import { buildMonthlyRecap, type MonthlyRecap } from "@/lib/stats/leaderboard";
import { computeWatchContribution } from "@/lib/stats/watch-progress";
import { getExactRuntime } from "@/lib/anime/runtime";
import { memberStatsFromAnilistProfile } from "@/lib/anilist/profile-stats";
import {
  formatDaysFromMinutes,
  formatHoursFromMinutes,
} from "@/lib/time/precise";
import {
  getMemberStatus,
  getMemberEpisodesWatched,
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

const MalDiscover = dynamic(
  () => import("@/components/MalDiscover").then((m) => m.MalDiscover),
  {
    loading: () => <SkeletonCardGrid count={12} layout="poster" />,
    ssr: false,
  },
);

function getInitialUser(): string | null {
  return loadCurrentUser();
}

export function WatchlistApp({ embedded = false }: { embedded?: boolean } = {}) {
  const [currentUser, setCurrentUser] = useState<string | null>(getInitialUser);
  const [members, setMembers] = useState<Member[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [animeList, setAnimeList] = useState<AnimeEntry[]>(
    () => loadAnimeListCache() ?? [],
  );
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>("all");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [viewTab, setViewTab] = useState<ViewTab>("list");
  const [isSyncingMal, setIsSyncingMal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isLoading, setIsLoading] = useState(
    () => loadAnimeListCache() == null,
  );
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
  const [folderSetupNeeded, setFolderSetupNeeded] = useState(false);
  const skipRemoteSyncUntilRef = useRef(0);
  const reloadDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    const timer = window.setTimeout(() => {
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
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [currentUser, isLoading, members, animeList]);

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
        const listPromise = fetchAnimeList();
        const membersPromise = fetchMembers();
        const allowedPromise = fetchAllowedMemberNames();

        const list = await listPromise;
        if (!cancelled) {
          saveAnimeListCache(list);
          setAnimeList(list);
          setIsLoading(false);
        }

        const [memberList, allowed] = await Promise.all([
          membersPromise,
          allowedPromise,
        ]);

        let folderList: Folder[] = [];
        try {
          folderList = await fetchFolders();
          if (!cancelled) setFolderSetupNeeded(false);
        } catch {
          if (!cancelled) setFolderSetupNeeded(true);
        }

        if (
          list.length > 0 &&
          list.every(
            (anime) =>
              Object.keys(anime.memberStatuses).length === 0 &&
              Object.keys(anime.ratings).length === 0,
          )
        ) {
          clearLocalProgressCache();
          clearAnimeListCache();
          if (currentUser) clearAllDiscoverStatuses(currentUser);
        }

        if (!cancelled) {
          setMembers(memberList);
          setAllowedNames(allowed);
          setFolders(folderList);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Verbindung zu Supabase fehlgeschlagen.",
          );
          setIsLoading(false);
        }
      }
    }

    function scheduleReload() {
      if (shouldSkipRemoteSync()) return;
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
      }
      reloadDebounceRef.current = setTimeout(() => {
        reloadDebounceRef.current = null;
        void loadData();
      }, 400);
    }

    void loadData();

    const unsubscribeAnime = subscribeToAnimeChanges(scheduleReload);
    const unsubscribeMembers = subscribeToMemberChanges(scheduleReload);
    const unsubscribeFolders = subscribeToFolderChanges(scheduleReload);

    return () => {
      cancelled = true;
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
      }
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
        const applied = applyDiscoverEntryToWatchlist(
          entry.memberStatuses,
          entry.ratings,
          currentUser,
          payload.malId ?? null,
          payload.anilistId ?? null,
        );
        if (applied.changed) {
          markLocalWrite();
          if (applied.memberStatuses !== entry.memberStatuses) {
            await updateMemberStatuses(entry.id, applied.memberStatuses);
          }
          if (applied.ratings !== entry.ratings) {
            await updateRatings(entry.id, applied.ratings);
          }
          savedEntry = {
            ...entry,
            memberStatuses: applied.memberStatuses,
            ratings: applied.ratings,
          };
          clearDiscoverEntry(
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

  async function handleResetAllProgress() {
    if (
      !window.confirm(
        "Wirklich ALLEN Fortschritt für die ganze Gruppe zurücksetzen?\n\nStatus, Bewertungen und Stats werden gelöscht. Die Anime bleiben auf der Liste.",
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      markLocalWrite();
      const count = await resetAllWatchProgress();
      clearLocalProgressCache();
      if (currentUser) clearAllDiscoverStatuses(currentUser);
      recapCheckedRef.current = false;
      setRecap(null);
      const list = await fetchAnimeList();
      setAnimeList(list);
      setError(null);
      window.alert(
        `Fortschritt zurückgesetzt (${count} Anime). Ihr könnt jetzt von vorne tracken.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Fortschritt konnte nicht zurückgesetzt werden.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  async function handleClearWatchlist() {
    if (
      !window.confirm(
        "Wirklich die GESAMTE Watchlist löschen?\n\nAlle Anime und der Fortschritt aller werden entfernt.",
      )
    ) {
      return;
    }
    if (
      !window.confirm(
        "Letzte Warnung: Das kann nicht rückgängig gemacht werden. Alles löschen?",
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      markLocalWrite();
      const count = await clearAllAnimeFromWatchlist();
      clearLocalProgressCache();
      recapCheckedRef.current = false;
      setRecap(null);
      setAnimeList([]);
      setOpenFolderId(null);
      setError(null);
      window.alert(`${count} Anime gelöscht. Watchlist ist leer.`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Watchlist konnte nicht geleert werden.",
      );
    } finally {
      setIsResetting(false);
    }
  }

  async function handleSyncMal() {
    setIsSyncingMal(true);
    try {
      markLocalWrite();
      const reconciled = await reconcileAnimeMetadata(animeList);
      const enriched = await enrichMissingMalMetadata(reconciled);
      saveAnimeListCache(enriched);
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

    let runtimeAnime = anime;
    try {
      runtimeAnime = await ensureAnimeHasRuntime(anime);
    } catch {
      runtimeAnime = anime;
    }

    let nextStatuses = setMemberEpisodesWatched(
      runtimeAnime.memberStatuses,
      currentUser,
      episodesWatched,
    );

    if (
      nextStatuses === runtimeAnime.memberStatuses &&
      episodesWatched > 0 &&
      getMemberStatus(runtimeAnime.memberStatuses, currentUser) === "none"
    ) {
      nextStatuses = setMemberStatus(
        runtimeAnime.memberStatuses,
        currentUser,
        "watching",
        episodesWatched,
      );
    }

    const totalEps = runtimeAnime.episodes;
    if (
      totalEps &&
      totalEps > 0 &&
      episodesWatched >= totalEps &&
      getMemberStatus(nextStatuses, currentUser) !== "completed"
    ) {
      const currentStatus = getMemberStatus(nextStatuses, currentUser);
      if (statusShowsEpisodeProgress(currentStatus)) {
        try {
          const withRuntime = await ensureAnimeHasRuntime(runtimeAnime);
          if (getExactRuntime(withRuntime)) {
            runtimeAnime = withRuntime;
            nextStatuses = setMemberStatus(
              nextStatuses,
              currentUser,
              "completed",
              episodesWatched,
            );
          }
        } catch {
          // Fortschritt speichern, Auto-Completed nur mit verifizierter Laufzeit
        }
      }
    }

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId
          ? { ...entry, ...runtimeAnime, memberStatuses: nextStatuses }
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

    let runtimeAnime = anime;
    if (isFinishedStatus(status)) {
      try {
        markLocalWrite();
        runtimeAnime = await ensureAnimeHasRuntime(anime);
        if (runtimeAnime !== anime) {
          setAnimeList((prev) =>
            prev.map((entry) =>
              entry.id === animeId ? { ...entry, ...runtimeAnime } : entry,
            ),
          );
        }
        if (!getExactRuntime(runtimeAnime)) {
          setError(
            "Laufzeit konnte nicht von MyAnimeList geladen werden — Status nicht gespeichert.",
          );
          return;
        }
      } catch {
        setError(
          "Laufzeit konnte nicht geladen werden — Status nicht gespeichert.",
        );
        return;
      }
    } else if (statusShowsEpisodeProgress(status)) {
      try {
        runtimeAnime = await ensureAnimeHasRuntime(anime);
        if (runtimeAnime !== anime) {
          setAnimeList((prev) =>
            prev.map((entry) =>
              entry.id === animeId ? { ...entry, ...runtimeAnime } : entry,
            ),
          );
        }
      } catch {
        runtimeAnime = anime;
      }
    }

    const previousStatus = getMemberStatus(
      runtimeAnime.memberStatuses,
      currentUser,
    );
    let episodesWatched: number | undefined;
    if (
      statusShowsEpisodeProgress(status) &&
      isFinishedStatus(previousStatus) &&
      status === "watching" &&
      runtimeAnime.episodes != null
    ) {
      episodesWatched = runtimeAnime.episodes;
    } else if (statusShowsEpisodeProgress(status)) {
      const previous = getMemberEpisodesWatched(
        runtimeAnime.memberStatuses,
        currentUser,
      );
      if (previous != null && previous > 0) {
        episodesWatched = previous;
      }
    }

    markLocalWrite();
    const nextStatuses = setMemberStatus(
      runtimeAnime.memberStatuses,
      currentUser,
      status,
      episodesWatched,
    );

    setAnimeList((prev) =>
      prev.map((entry) =>
        entry.id === animeId
          ? { ...entry, ...runtimeAnime, memberStatuses: nextStatuses }
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
      return { series: 0, episodes: 0, hours: "0", days: "0" };
    }

    const member = members.find((m) => m.name === currentUser);
    if (member?.profileStats?.anime) {
      const official = memberStatsFromAnilistProfile(member.profileStats.anime);
      return {
        series: official.completedCount,
        episodes: official.episodesWatched,
        hours: official.totalHoursLabel,
        days: official.daysWatchedLabel,
      };
    }

    let series = 0;
    let episodes = 0;
    let minutes = 0;

    for (const anime of animeList) {
      const contribution = computeWatchContribution(anime, currentUser);
      if (!contribution) continue;

      if (contribution.countsAsFinishedSeries) {
        series += contribution.rewatchTimes;
        episodes += contribution.episodes;
        minutes += contribution.minutes;
        continue;
      }

      if (contribution.episodes <= 0 && contribution.minutes <= 0) continue;

      episodes += contribution.episodes;
      minutes += contribution.minutes;
    }

    return {
      series,
      episodes,
      hours: formatHoursFromMinutes(minutes),
      days: formatDaysFromMinutes(minutes),
    };
  }, [animeList, currentUser, members]);

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
    <div
      className={
        embedded
          ? "bg-[var(--background)] pb-nav-safe"
          : "min-h-screen bg-[var(--background)] pb-nav-safe"
      }
    >
      <div className="relative mx-auto w-full max-w-[var(--content-max-width)] px-2 py-3 sm:px-4 sm:py-4">
        {viewTab !== "profile" && (
          <header className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent)] text-sm font-black text-white">
                A
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight text-white">
                  {embedded
                    ? "Group Watchlist"
                    : viewTab === "list"
                      ? "Bibliothek"
                      : viewTab === "discover"
                        ? "Entdecken"
                        : "Charts"}
                </h1>
                <p className="text-xs text-[var(--text-muted)]">
                  {currentUser} · {sortedMembers.length} Mitglieder
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            {viewTab === "list" && (
              <div className="hidden grid-cols-4 gap-2 sm:grid">
                {[
                  { label: "Serien", value: stats.series },
                  { label: "Folgen", value: stats.episodes },
                  { label: "Std.", value: stats.hours },
                  { label: "Tage", value: stats.days },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-center"
                  >
                    <p className="text-sm font-bold tabular-nums text-white">
                      {stat.value}
                    </p>
                    <p className="text-[9px] text-[var(--text-dim)]">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
            </div>
          </header>
        )}

        {viewTab === "profile" ? (
          isLoading && animeList.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <ProfileTab
              name={currentUser}
              animeList={animeList}
              profileStats={
                members.find((m) => m.name === currentUser)?.profileStats ?? null
              }
              accessMode={accessMode}
              onLogout={() => void handleLogout()}
              onOpenMember={setProfileName}
            />
          )
        ) : viewTab === "leaderboard" ? (
          isLoading && animeList.length === 0 ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <Leaderboard
              members={sortedMembers}
              animeList={animeList}
              currentUser={currentUser}
              isSyncingMal={isSyncingMal}
              onSyncMal={() => void handleSyncMal()}
              onOpenProfile={setProfileName}
              onResetAllProgress={handleResetAllProgress}
              onClearWatchlist={handleClearWatchlist}
              isResetting={isResetting}
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
            onRateAnime={handleRateAnime}
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

        <section className="mb-4 space-y-3">
          <AnimeForm onAdd={handleAddAnime} />
          <SearchBar value={search} onChange={setSearch} />
          <LibraryStatusTabs
            active={filter}
            onChange={setFilter}
            animeList={animeList}
            currentUser={currentUser}
          />
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

        {isLoading && animeList.length === 0 ? (
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
              <section className="library-section w-full">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">
                      Alle Anime
                    </h2>
                    <p className="text-sm text-[var(--text-muted)]">
                      {allAnimeList.length} Einträge
                    </p>
                  </div>
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
          profileStats={
            members.find((m) => m.name === profileName)?.profileStats ?? null
          }
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

      <AppBottomNav active={viewTab} onChange={setViewTab} />
    </div>
  );
}
