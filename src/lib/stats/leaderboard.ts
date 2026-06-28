import {
  FINISHED_STATUSES,
  getMemberStatus,
  getMemberStatusUpdatedAt,
  getMemberProgressEpisodes,
  getMemberProgressMinutes,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import {
  getAverageRating,
  getDisplayTitle,
  type AnimeEntry,
  type LeaderboardPeriod,
  type Member,
} from "@/lib/types";

export type PeriodStats = {
  completedCount: number;
  episodesWatched: number;
  totalMinutes: number;
  totalHours: number;
  titles: string[];
};

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
  byPeriod: Record<LeaderboardPeriod, PeriodStats>;
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

function getPeriodStart(period: LeaderboardPeriod, now = new Date()): Date | null {
  if (period === "all") return null;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case "today":
      return startOfToday;
    case "week": {
      const start = new Date(startOfToday);
      const day = start.getDay();
      const diff = day === 0 ? 6 : day - 1;
      start.setDate(start.getDate() - diff);
      return start;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return null;
  }
}

export function isInLeaderboardPeriod(
  isoDate: string | null,
  period: LeaderboardPeriod,
  now = new Date(),
): boolean {
  if (period === "all") return true;
  if (!isoDate) return false;

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) {
    return false;
  }

  const start = getPeriodStart(period, now);
  return start ? date >= start : false;
}

function emptyPeriodStats(): PeriodStats {
  return {
    completedCount: 0,
    episodesWatched: 0,
    totalMinutes: 0,
    totalHours: 0,
    titles: [],
  };
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
  const byPeriod: Record<LeaderboardPeriod, PeriodStats> = {
    today: emptyPeriodStats(),
    week: emptyPeriodStats(),
    month: emptyPeriodStats(),
    year: emptyPeriodStats(),
    all: emptyPeriodStats(),
  };

  const periods: LeaderboardPeriod[] = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];

  for (const anime of animeList) {
    const rating = anime.ratings[memberName];
    if (typeof rating === "number" && rating > 0) {
      ratingSum += rating;
      ratedCount += 1;
    }

    const status = getMemberStatus(anime.memberStatuses, memberName);
    const progressEpisodes = getMemberProgressEpisodes(
      anime.memberStatuses,
      memberName,
      anime.episodes,
    );
    const progressMinutes = getMemberProgressMinutes(
      anime.memberStatuses,
      memberName,
      anime.episodes,
      anime.episodeDurationMin,
      anime.totalDurationMin,
    );

    if (progressEpisodes <= 0 && progressMinutes <= 0) continue;

    const displayTitle = getDisplayTitle(anime);
    const updatedAt = getMemberStatusUpdatedAt(anime.memberStatuses, memberName);

    if (FINISHED_STATUSES.includes(status)) {
      const weight = getFinishedWeight(status);
      const minutes = anime.totalDurationMin ?? progressMinutes;
      const episodes = (anime.episodes ?? progressEpisodes) * weight;
      const weightedMinutes = minutes * weight;

      completedCount += weight;
      episodesWatched += episodes;
      totalMinutes += weightedMinutes;

      for (const genre of anime.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + weight);
      }

      for (const period of periods) {
        if (!isInLeaderboardPeriod(updatedAt, period)) continue;

        const bucket = byPeriod[period];
        bucket.completedCount += weight;
        bucket.episodesWatched += episodes;
        bucket.totalMinutes += weightedMinutes;
        bucket.titles.push(displayTitle);
      }
      continue;
    }

    episodesWatched += progressEpisodes;
    totalMinutes += progressMinutes;

    for (const genre of anime.genres) {
      genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }

    for (const period of periods) {
      if (!isInLeaderboardPeriod(updatedAt, period)) continue;

      const bucket = byPeriod[period];
      bucket.episodesWatched += progressEpisodes;
      bucket.totalMinutes += progressMinutes;
      if (!bucket.titles.includes(displayTitle)) {
        bucket.titles.push(displayTitle);
      }
    }
  }

  for (const period of periods) {
    const bucket = byPeriod[period];
    bucket.completedCount = Math.round(bucket.completedCount * 10) / 10;
    bucket.episodesWatched = Math.round(bucket.episodesWatched);
    bucket.totalMinutes = Math.round(bucket.totalMinutes);
    bucket.totalHours = Math.round((bucket.totalMinutes / 60) * 10) / 10;
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
    averageRating:
      ratedCount > 0 ? Math.round((ratingSum / ratedCount) * 10) / 10 : 0,
    ratedCount,
    topGenres,
    byPeriod,
  };
}

export function buildLeaderboardForPeriod(
  members: Member[],
  animeList: AnimeEntry[],
  period: LeaderboardPeriod,
): MemberLeaderboardStats[] {
  return members
    .map((member) => computeMemberStats(member.name, animeList))
    .sort(
      (a, b) =>
        b.byPeriod[period].completedCount - a.byPeriod[period].completedCount,
    );
}

export function buildHoursRankingForPeriod(
  members: Member[],
  animeList: AnimeEntry[],
  period: LeaderboardPeriod,
): MemberLeaderboardStats[] {
  return members
    .map((member) => computeMemberStats(member.name, animeList))
    .sort(
      (a, b) =>
        b.byPeriod[period].totalMinutes - a.byPeriod[period].totalMinutes,
    );
}

export function buildAnimeRatingRanking(
  animeList: AnimeEntry[],
): AnimeRatingStats[] {
  return animeList
    .map((anime) => {
      const { average, count } = getAverageRating(anime.ratings);
      return {
        id: anime.id,
        title: getDisplayTitle(anime),
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
  return buildLeaderboardForPeriod(members, animeList, "all");
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
      title: getDisplayTitle(anime),
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

export type MonthlyRecapMember = {
  name: string;
  completedCount: number;
  episodesWatched: number;
  totalHours: number;
  titles: string[];
};

export type MonthlyRecap = {
  year: number;
  month: number;
  label: string;
  totalCompleted: number;
  totalHours: number;
  members: MonthlyRecapMember[];
  topMember: MonthlyRecapMember | null;
  favorite: { title: string; average: number; count: number } | null;
};

function isInMonth(isoDate: string | null, year: number, month: number): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime()) || date.getFullYear() <= 1970) return false;
  return date.getFullYear() === year && date.getMonth() === month;
}

export function buildMonthlyRecap(
  members: Member[],
  animeList: AnimeEntry[],
  year: number,
  month: number,
): MonthlyRecap {
  const recapMembers: MonthlyRecapMember[] = members.map((member) => {
    let completedCount = 0;
    let episodesWatched = 0;
    let totalMinutes = 0;
    const titles: string[] = [];

    for (const anime of animeList) {
      const status = getMemberStatus(anime.memberStatuses, member.name);
      if (!FINISHED_STATUSES.includes(status)) continue;
      const updatedAt = getMemberStatusUpdatedAt(
        anime.memberStatuses,
        member.name,
      );
      if (!isInMonth(updatedAt, year, month)) continue;

      const weight = getFinishedWeight(status);
      const progressMinutes = getMemberProgressMinutes(
        anime.memberStatuses,
        member.name,
        anime.episodes,
        anime.episodeDurationMin,
        anime.totalDurationMin,
      );
      const minutes = anime.totalDurationMin ?? progressMinutes;

      completedCount += weight;
      episodesWatched += (anime.episodes ?? 0) * weight;
      totalMinutes += minutes * weight;
      titles.push(getDisplayTitle(anime));
    }

    return {
      name: member.name,
      completedCount: Math.round(completedCount * 10) / 10,
      episodesWatched: Math.round(episodesWatched),
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      titles,
    };
  });

  recapMembers.sort((a, b) => b.completedCount - a.completedCount);

  const favoriteCandidates = animeList
    .filter((anime) =>
      members.some((member) => {
        const status = getMemberStatus(anime.memberStatuses, member.name);
        if (!FINISHED_STATUSES.includes(status)) return false;
        return isInMonth(
          getMemberStatusUpdatedAt(anime.memberStatuses, member.name),
          year,
          month,
        );
      }),
    )
    .map((anime) => {
      const { average, count } = getAverageRating(anime.ratings);
      const finishers = members.filter((member) => {
        const status = getMemberStatus(anime.memberStatuses, member.name);
        if (!FINISHED_STATUSES.includes(status)) return false;
        return isInMonth(
          getMemberStatusUpdatedAt(anime.memberStatuses, member.name),
          year,
          month,
        );
      }).length;
      return { title: getDisplayTitle(anime), average, count, finishers };
    })
    .sort(
      (a, b) =>
        b.average - a.average ||
        b.count - a.count ||
        b.finishers - a.finishers,
    );

  const favorite = favoriteCandidates[0]
    ? {
        title: favoriteCandidates[0].title,
        average: favoriteCandidates[0].average,
        count: favoriteCandidates[0].count,
      }
    : null;

  const totalCompleted =
    Math.round(
      recapMembers.reduce((sum, member) => sum + member.completedCount, 0) * 10,
    ) / 10;
  const totalHours =
    Math.round(
      recapMembers.reduce((sum, member) => sum + member.totalHours, 0) * 10,
    ) / 10;

  const topMember =
    recapMembers.find((member) => member.completedCount > 0) ?? null;

  const label = new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month, 1));

  return {
    year,
    month,
    label,
    totalCompleted,
    totalHours,
    members: recapMembers,
    topMember,
    favorite,
  };
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

export const LEADERBOARD_PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  year: "Year",
  all: "All-time",
};
