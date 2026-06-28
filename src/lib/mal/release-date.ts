export type AnimeReleaseFields = {
  airedFrom: string | null;
  airedTo: string | null;
  broadcastDay: string | null;
  broadcastTime: string | null;
  malSeason: string | null;
  malYear: number | null;
  malStatus: string | null;
  nextEpisode?: number | null;
  timeUntilAiring?: number | null;
  airingAt?: number | null;
  anilistStatus?: string | null;
};

export const NO_RELEASE_DATA = "No data yet";

const BERLIN_TZ = "Europe/Berlin";
const JST_TZ = "Asia/Tokyo";
const SEASON_START_MONTHS: Record<string, number> = {
  winter: 1,
  spring: 4,
  summer: 7,
  fall: 10,
};

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSeasonLabel(
  season: string | null,
  year: number | null,
): string | null {
  if (!season && !year) return null;
  if (season && year) return `${capitalize(season)} ${year}`;
  if (year) return String(year);
  return season ? capitalize(season) : null;
}

function parseBroadcastDateTime(
  airedFrom: string,
  broadcastTime: string | null,
): Date {
  const base = new Date(airedFrom);
  if (!broadcastTime || !/^\d{1,2}:\d{2}$/.test(broadcastTime)) {
    return base;
  }

  const [hours, minutes] = broadcastTime.split(":").map(Number);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(base);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return base;
  }

  const jstIso = `${year}-${month}-${day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+09:00`;
  return new Date(jstIso);
}

export function isPlaceholderPremiereDate(
  airedFrom: string,
  malSeason: string | null,
  malYear: number | null,
): boolean {
  const date = new Date(airedFrom);
  if (Number.isNaN(date.getTime())) return true;

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (day !== 1) return false;

  if (malSeason && malYear && year === malYear) {
    const seasonMonth = SEASON_START_MONTHS[malSeason.toLowerCase()];
    if (seasonMonth === month) return true;
  }

  return Object.values(SEASON_START_MONTHS).includes(month);
}

export function getConfirmedPremiereDate(
  info: AnimeReleaseFields,
): Date | null {
  if (!info.airedFrom) return null;
  if (
    isPlaceholderPremiereDate(
      info.airedFrom,
      info.malSeason,
      info.malYear,
    )
  ) {
    return null;
  }

  return parseBroadcastDateTime(info.airedFrom, info.broadcastTime);
}

export function formatPremiereDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function getPremiereDate(info: AnimeReleaseFields): Date | null {
  return getConfirmedPremiereDate(info);
}

function normalizeDayName(day: string): string {
  return day.toLowerCase().replace(/s$/, "");
}

function getJstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JST_TZ,
    weekday: "long",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    weekday: parts.find((part) => part.type === "weekday")?.value ?? "",
    year: parts.find((part) => part.type === "year")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    day: parts.find((part) => part.type === "day")?.value ?? "",
  };
}

export function getNextBroadcastDate(
  info: AnimeReleaseFields,
  now = new Date(),
): Date | null {
  if (!info.broadcastDay || !info.broadcastTime) return null;

  const targetDay = normalizeDayName(info.broadcastDay);
  const [hours, minutes] = info.broadcastTime.split(":").map(Number);

  for (let offset = 0; offset <= 14; offset += 1) {
    const probe = new Date(now.getTime() + offset * 86_400_000);
    const parts = getJstDateParts(probe);
    if (normalizeDayName(parts.weekday) !== targetDay) continue;

    const jstIso = `${parts.year}-${parts.month}-${parts.day}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+09:00`;
    const broadcast = new Date(jstIso);
    if (broadcast > now) return broadcast;
  }

  return null;
}

export function isCurrentlyAiring(info: AnimeReleaseFields): boolean {
  if (info.malStatus === "Currently Airing") return true;
  if (info.anilistStatus === "RELEASING") return true;
  if (info.nextEpisode != null && info.nextEpisode > 1) return true;
  return false;
}

export function isTrulyUpcoming(info: AnimeReleaseFields): boolean {
  if (isCurrentlyAiring(info)) return false;
  if (info.malStatus === "Finished Airing") return false;
  if (info.anilistStatus === "FINISHED") return false;
  if (info.anilistStatus === "RELEASING") return false;

  return (
    info.malStatus === "Not yet aired" ||
    info.anilistStatus === "NOT_YET_RELEASED" ||
    info.anilistStatus == null
  );
}

export function getCountdownTarget(
  info: AnimeReleaseFields,
  now = new Date(),
): { date: Date; label: string } | null {
  if (isCurrentlyAiring(info)) {
    if (
      info.nextEpisode &&
      info.timeUntilAiring != null &&
      info.timeUntilAiring > 0
    ) {
      return {
        date: new Date(now.getTime() + info.timeUntilAiring * 1000),
        label: `EP${info.nextEpisode} · TV (JP)`,
      };
    }

    if (
      info.nextEpisode &&
      info.airingAt &&
      info.airingAt * 1000 > now.getTime()
    ) {
      return {
        date: new Date(info.airingAt * 1000),
        label: `EP${info.nextEpisode} · TV (JP)`,
      };
    }

    const nextBroadcast = getNextBroadcastDate(info, now);
    if (nextBroadcast) {
      return { date: nextBroadcast, label: "Next ep · TV (JP)" };
    }

    return null;
  }

  if (
    info.nextEpisode === 1 &&
    info.timeUntilAiring != null &&
    info.timeUntilAiring > 0
  ) {
    return {
      date: new Date(now.getTime() + info.timeUntilAiring * 1000),
      label: "Premiere · TV (JP)",
    };
  }

  if (
    info.nextEpisode === 1 &&
    info.airingAt &&
    info.airingAt * 1000 > now.getTime()
  ) {
    return {
      date: new Date(info.airingAt * 1000),
      label: "Premiere · TV (JP)",
    };
  }

  const premiere = getConfirmedPremiereDate(info);
  if (premiere && premiere > now) {
    return { date: premiere, label: "Premiere · TV (JP)" };
  }

  return null;
}

export function getCountdownParts(
  target: Date,
  now = new Date(),
): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
} | null {
  const totalMs = target.getTime() - now.getTime();
  if (totalMs <= 0) return null;

  const days = Math.floor(totalMs / 86_400_000);
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);

  return { days, hours, minutes, seconds, totalMs };
}

export function formatCountdown(target: Date, now = new Date()): string | null {
  const parts = getCountdownParts(target, now);
  if (!parts) return null;

  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
  }
  if (parts.hours > 0) {
    return `${parts.hours}h ${parts.minutes}m ${parts.seconds}s`;
  }
  return `${parts.minutes}m ${parts.seconds}s`;
}

export function formatAnimeRelease(info: AnimeReleaseFields): string {
  const now = new Date();
  const seasonLabel = formatSeasonLabel(info.malSeason, info.malYear);
  const premiere = getConfirmedPremiereDate(info);

  if (isCurrentlyAiring(info)) {
    if (premiere && premiere <= now && seasonLabel) {
      const schedule =
        info.broadcastDay && info.broadcastTime
          ? ` · ${info.broadcastDay}s ${info.broadcastTime} JST`
          : "";
      return `Began ${seasonLabel}${schedule}`;
    }
    if (seasonLabel) return `Airing · ${seasonLabel}`;
    return "Currently airing";
  }

  if (premiere && premiere > now) {
    return formatPremiereDateTime(premiere);
  }

  if (premiere && premiere <= now && info.malStatus === "Finished Airing") {
    const end = info.airedTo ? formatShortDate(new Date(info.airedTo)) : null;
    return end
      ? `${formatShortDate(premiere)} – ${end}`
      : formatShortDate(premiere);
  }

  if (premiere) {
    return formatPremiereDateTime(premiere);
  }

  return NO_RELEASE_DATA;
}

export function isUpcomingRelease(info: AnimeReleaseFields): boolean {
  const premiere = getConfirmedPremiereDate(info);
  if (premiere && premiere > new Date()) return true;
  return isTrulyUpcoming(info);
}
