import {
  FINISHED_STATUSES,
  getMemberStatus,
  getMemberStatusUpdatedAt,
  type MemberStatuses,
} from "@/lib/statuses";
import type { AnimeEntry, Member } from "@/lib/types";

export type MemberLeaderboardStats = {
  name: string;
  completedCount: number;
  totalMinutes: number;
  totalHours: number;
  daysWatched: number;
  topGenres: { genre: string; count: number }[];
  thisMonth: {
    completedCount: number;
    titles: string[];
    totalMinutes: number;
  };
};

function getFinishedWeight(status: ReturnType<typeof getMemberStatus>): number {
  return status === "rewatching" ? 1.5 : status === "completed" ? 1 : 0;
}

function isInCurrentMonth(isoDate: string | null): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

function computeMemberStats(
  memberName: string,
  animeList: AnimeEntry[],
): MemberLeaderboardStats {
  let completedCount = 0;
  let totalMinutes = 0;
  const genreCounts = new Map<string, number>();
  const monthTitles: string[] = [];
  let monthMinutes = 0;
  let monthCompleted = 0;

  for (const anime of animeList) {
    const status = getMemberStatus(anime.memberStatuses, memberName);
    if (!FINISHED_STATUSES.includes(status)) continue;

    const weight = getFinishedWeight(status);
    completedCount += weight;

    const minutes = anime.totalDurationMin ?? 0;
    totalMinutes += minutes * weight;

    for (const genre of anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + weight);
    }

    const updatedAt = getMemberStatusUpdatedAt(anime.memberStatuses, memberName);
    if (isInCurrentMonth(updatedAt)) {
      monthCompleted += weight;
      monthTitles.push(anime.title);
      monthMinutes += minutes * weight;
    }
  }

  const topGenres = [...genreCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([genre, count]) => ({ genre, count }));

  return {
    name: memberName,
    completedCount: Math.round(completedCount * 10) / 10,
    totalMinutes: Math.round(totalMinutes),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    daysWatched: Math.round((totalMinutes / 60 / 24) * 10) / 10,
    topGenres,
    thisMonth: {
      completedCount: Math.round(monthCompleted * 10) / 10,
      titles: monthTitles,
      totalMinutes: Math.round(monthMinutes),
    },
  };
}

export function buildLeaderboard(
  members: Member[],
  animeList: AnimeEntry[],
): MemberLeaderboardStats[] {
  return members
    .map((member) => computeMemberStats(member.name, animeList))
    .sort((a, b) => b.completedCount - a.completedCount);
}

export function getTopGenreLeader(
  stats: MemberLeaderboardStats[],
  genre: string,
): MemberLeaderboardStats | null {
  let best: MemberLeaderboardStats | null = null;
  let bestCount = 0;

  for (const member of stats) {
    const entry = member.topGenres.find(
      (g) => g.genre.toLowerCase() === genre.toLowerCase(),
    );
    if (entry && entry.count > bestCount) {
      best = member;
      bestCount = entry.count;
    }
  }

  return bestCount > 0 ? best : null;
}

export function getAllGenres(animeList: AnimeEntry[]): string[] {
  const genres = new Set<string>();
  for (const anime of animeList) {
    for (const genre of anime.genres) {
      genres.add(genre);
    }
  }
  return [...genres].sort();
}
