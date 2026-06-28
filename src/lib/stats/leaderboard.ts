import {
  FINISHED_STATUSES,
  getMemberStatus,
  getMemberStatusUpdatedAt,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import { getAverageRating, type AnimeEntry, type Member } from "@/lib/types";

export type MemberLeaderboardStats = {
  name: string;
  completedCount: number;
  episodesWatched: number;
  totalMinutes: number;
  totalHours: number;
  daysWatched: number;
  averageRating: number;
  ratedCount: number;
  topGenres: { genre: string; count: number }[];
  thisMonth: {
    completedCount: number;
    titles: string[];
    totalMinutes: number;
  };
};

export type AnimeRatingStats = {
  id: string;
  title: string;
  average: number;
  count: number;
  genres: string[];
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
  let episodesWatched = 0;
  let totalMinutes = 0;
  let ratingSum = 0;
  let ratedCount = 0;
  const genreCounts = new Map<string, number>();
  const monthTitles: string[] = [];
  let monthMinutes = 0;
  let monthCompleted = 0;

  for (const anime of animeList) {
    const rating = anime.ratings[memberName];
    if (typeof rating === "number" && rating > 0) {
      ratingSum += rating;
      ratedCount += 1;
    }

    const status = getMemberStatus(anime.memberStatuses, memberName);
    if (!FINISHED_STATUSES.includes(status)) continue;

    const weight = getFinishedWeight(status);
    completedCount += weight;
    episodesWatched += (anime.episodes ?? 0) * weight;

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
    episodesWatched: Math.round(episodesWatched),
    totalMinutes: Math.round(totalMinutes),
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    daysWatched: Math.round((totalMinutes / 60 / 24) * 10) / 10,
    averageRating: ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0,
    ratedCount,
    topGenres,
    thisMonth: {
      completedCount: Math.round(monthCompleted * 10) / 10,
      titles: monthTitles,
      totalMinutes: Math.round(monthMinutes),
    },
  };
}

export function buildAnimeRatingRanking(
  animeList: AnimeEntry[],
): AnimeRatingStats[] {
  return animeList
    .map((anime) => {
      const { average, count } = getAverageRating(anime.ratings);
      return {
        id: anime.id,
        title: anime.title,
        average,
        count,
        genres: anime.genres,
      };
    })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.average - a.average || b.count - a.count);
}

export function buildLeaderboard(
  members: Member[],
  animeList: AnimeEntry[],
): MemberLeaderboardStats[] {
  return members
    .map((member) => computeMemberStats(member.name, animeList))
    .sort((a, b) => b.completedCount - a.completedCount);
}

export type MemberProfileGroup = {
  status: AnimeStatus;
  label: string;
  items: { id: string; title: string; rating: number }[];
};

export type MemberProfile = {
  stats: MemberLeaderboardStats;
  groups: MemberProfileGroup[];
};

export function buildMemberProfile(
  name: string,
  animeList: AnimeEntry[],
): MemberProfile {
  const stats = computeMemberStats(name, animeList);
  const grouped = new Map<
    AnimeStatus,
    { id: string; title: string; rating: number }[]
  >();

  for (const anime of animeList) {
    const status = getMemberStatus(anime.memberStatuses, name);
    if (status === "none") continue;
    const list = grouped.get(status) ?? [];
    list.push({
      id: anime.id,
      title: anime.title,
      rating: anime.ratings[name] ?? 0,
    });
    grouped.set(status, list);
  }

  const groups: MemberProfileGroup[] = STATUS_OPTIONS.filter(
    (option) => option.value !== "none" && grouped.has(option.value),
  ).map((option) => ({
    status: option.value,
    label: option.label,
    items: (grouped.get(option.value) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title, "de", { sensitivity: "base" }),
    ),
  }));

  return { stats, groups };
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
