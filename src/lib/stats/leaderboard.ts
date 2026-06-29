import {
  FINISHED_STATUSES,
  getMemberStatus,
  getMemberStatusUpdatedAt,
  getMemberRewatchCount,
  STATUS_OPTIONS,
  type AnimeStatus,
} from "@/lib/statuses";
import {
  formatWatchDays,
  formatWatchHours,
} from "@/lib/anime/runtime";
import {
  memberStatsFromAnilistProfile,
  type AnilistProfileStats,
} from "@/lib/anilist/profile-stats";
import {
  computeWatchContribution,
} from "@/lib/stats/watch-progress";
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
  profileStats?: AnilistProfileStats | null,
): MemberLeaderboardStats {
  if (profileStats?.anime) {
    const official = memberStatsFromAnilistProfile(profileStats.anime);
    const computed = computeMemberStatsFromList(memberName, animeList);
    return {
      ...computed,
      completedCount: official.completedCount,
      episodesWatched: official.episodesWatched,
      totalMinutes: official.totalMinutes,
      totalHours: official.totalHours,
      daysWatched: official.daysWatched,
      byPeriod: {
        ...computed.byPeriod,
        all: {
          ...computed.byPeriod.all,
          completedCount: official.completedCount,
          episodesWatched: official.episodesWatched,
          totalMinutes: official.totalMinutes,
          totalHours: official.totalHours,
        },
      },
    };
  }
  return computeMemberStatsFromList(memberName, animeList);
}

function computeMemberStatsFromList(
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
    const contribution = computeWatchContribution(anime, memberName);
    if (!contribution) continue;

    const progressEpisodes = contribution.episodes;
    const progressMinutes = contribution.minutes;

    if (progressEpisodes <= 0 && progressMinutes <= 0) continue;

    const displayTitle = getDisplayTitle(anime);
    const updatedAt = getMemberStatusUpdatedAt(anime.memberStatuses, memberName);

    if (FINISHED_STATUSES.includes(status)) {
      const times =
        status === "rewatching"
          ? getMemberRewatchCount(anime.memberStatuses, memberName)
          : 1;

      completedCount += times;
      episodesWatched += progressEpisodes;
      totalMinutes += progressMinutes;

      for (const genre of anime.genres) {
        genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + times);
      }

      for (const period of periods) {
        if (!isInLeaderboardPeriod(updatedAt, period)) continue;

        const bucket = byPeriod[period];
        bucket.completedCount += times;
        bucket.episodesWatched += progressEpisodes;
        bucket.totalMinutes += progressMinutes;
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
    bucket.totalHours = formatWatchHours(bucket.totalMinutes);
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
    totalHours: formatWatchHours(totalMinutes),
    daysWatched: formatWatchDays(totalMinutes),
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
    .map((member) =>
      computeMemberStats(member.name, animeList, member.profileStats),
    )
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
    .map((member) =>
      computeMemberStats(member.name, animeList, member.profileStats),
    )
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
  profileStats?: AnilistProfileStats | null,
): MemberProfile {
  const stats = computeMemberStats(name, animeList, profileStats);
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

      const contribution = computeWatchContribution(anime, member.name);
      if (!contribution) continue;

      const times =
        status === "rewatching"
          ? getMemberRewatchCount(anime.memberStatuses, member.name)
          : 1;

      completedCount += times;
      episodesWatched += contribution.episodes;
      totalMinutes += contribution.minutes;
      titles.push(getDisplayTitle(anime));
    }

    return {
      name: member.name,
      completedCount: Math.round(completedCount * 10) / 10,
      episodesWatched: Math.round(episodesWatched),
      totalHours: formatWatchHours(totalMinutes),
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
