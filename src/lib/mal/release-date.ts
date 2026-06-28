export type AnimeReleaseFields = {
  airedFrom: string | null;
  airedTo: string | null;
  broadcastDay: string | null;
  broadcastTime: string | null;
  malSeason: string | null;
  malYear: number | null;
  malStatus: string | null;
};

const BERLIN_TZ = "Europe/Berlin";
const JST_TZ = "Asia/Tokyo";

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatSeasonLabel(season: string | null, year: number | null): string | null {
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
  if (!info.airedFrom) return null;
  return parseBroadcastDateTime(info.airedFrom, info.broadcastTime);
}

export function getCountdownParts(target: Date, now = new Date()): {
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

export function formatAnimeRelease(info: AnimeReleaseFields): string | null {
  const premiere = getPremiereDate(info);
  const seasonLabel = formatSeasonLabel(info.malSeason, info.malYear);
  const now = new Date();

  if (
    info.malStatus === "Currently Airing" &&
    premiere &&
    premiere <= now &&
    seasonLabel
  ) {
    const schedule =
      info.broadcastDay && info.broadcastTime
        ? ` · ${info.broadcastDay}s ${info.broadcastTime} JST`
        : "";
    return `Began ${seasonLabel}${schedule}`;
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

  if (seasonLabel && info.malStatus === "Not yet aired") {
    return seasonLabel;
  }

  if (seasonLabel) {
    return seasonLabel;
  }

  return null;
}

export function isUpcomingRelease(info: AnimeReleaseFields): boolean {
  const premiere = getPremiereDate(info);
  if (premiere && premiere > new Date()) return true;
  return info.malStatus === "Not yet aired";
}
