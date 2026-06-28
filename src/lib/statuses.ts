export type AnimeStatus =
  | "none"
  | "watching"
  | "completed"
  | "rewatching"
  | "planning"
  | "considering"
  | "paused"
  | "dropped"
  | "skipping";

export type MemberStatusEntry = {
  status: AnimeStatus;
  updatedAt: string;
  episodesWatched?: number;
  rewatchCount?: number;
};

export const EPISODE_PROGRESS_STATUSES: AnimeStatus[] = [
  "watching",
  "dropped",
  "paused",
  "considering",
  "planning",
];

export function statusShowsEpisodeProgress(status: AnimeStatus): boolean {
  return EPISODE_PROGRESS_STATUSES.includes(status);
}

export function statusShowsRewatchCount(status: AnimeStatus): boolean {
  return status === "rewatching";
}

export type MemberStatuses = Record<string, MemberStatusEntry>;

export const STATUS_OPTIONS: {
  value: AnimeStatus;
  label: string;
  color: string;
}[] = [
  { value: "none", label: "None", color: "text-slate-500 bg-slate-800/60" },
  {
    value: "watching",
    label: "Watching",
    color: "text-violet-300 bg-violet-600/20 border-violet-500/30",
  },
  {
    value: "completed",
    label: "Completed",
    color: "text-emerald-300 bg-emerald-600/20 border-emerald-500/30",
  },
  {
    value: "rewatching",
    label: "Rewatching",
    color: "text-teal-300 bg-teal-600/20 border-teal-500/30",
  },
  {
    value: "planning",
    label: "Planning",
    color: "text-blue-300 bg-blue-600/20 border-blue-500/30",
  },
  {
    value: "considering",
    label: "Considering",
    color: "text-amber-300 bg-amber-600/20 border-amber-500/30",
  },
  {
    value: "paused",
    label: "Paused",
    color: "text-orange-300 bg-orange-600/20 border-orange-500/30",
  },
  {
    value: "dropped",
    label: "Dropped",
    color: "text-red-300 bg-red-600/20 border-red-500/30",
  },
  {
    value: "skipping",
    label: "Skipping",
    color: "text-slate-400 bg-slate-700/40 border-slate-600/40",
  },
];

export const FINISHED_STATUSES: AnimeStatus[] = ["completed", "rewatching"];

export function getStatusMeta(status: AnimeStatus) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status) ?? STATUS_OPTIONS[0]
  );
}

function isValidStatus(value: string): value is AnimeStatus {
  return STATUS_OPTIONS.some((option) => option.value === value);
}

export function normalizeMemberStatuses(raw: unknown): MemberStatuses {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const result: MemberStatuses = {};

  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === "string" && isValidStatus(value) && value !== "none") {
      result[name] = { status: value, updatedAt: new Date(0).toISOString() };
      continue;
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entry = value as {
        status?: string;
        updatedAt?: string;
        episodesWatched?: number;
        rewatchCount?: number;
      };
      if (entry.status && isValidStatus(entry.status) && entry.status !== "none") {
        const normalized: MemberStatusEntry = {
          status: entry.status,
          updatedAt: entry.updatedAt ?? new Date().toISOString(),
        };
        if (
          typeof entry.episodesWatched === "number" &&
          entry.episodesWatched >= 0
        ) {
          normalized.episodesWatched = entry.episodesWatched;
        }
        if (
          typeof entry.rewatchCount === "number" &&
          entry.rewatchCount >= 1
        ) {
          normalized.rewatchCount = Math.floor(entry.rewatchCount);
        }
        result[name] = normalized;
      }
    }
  }

  return result;
}

export function getMemberStatus(
  statuses: MemberStatuses,
  memberName: string,
): AnimeStatus {
  return statuses[memberName]?.status ?? "none";
}

export function getMemberStatusUpdatedAt(
  statuses: MemberStatuses,
  memberName: string,
): string | null {
  return statuses[memberName]?.updatedAt ?? null;
}

export function getMemberEpisodesWatched(
  statuses: MemberStatuses,
  memberName: string,
): number | null {
  const value = statuses[memberName]?.episodesWatched;
  return typeof value === "number" && value >= 0 ? value : null;
}

export function getMemberRewatchCount(
  statuses: MemberStatuses,
  memberName: string,
): number {
  const value = statuses[memberName]?.rewatchCount;
  return typeof value === "number" && value >= 1 ? Math.floor(value) : 1;
}

export function setMemberStatus(
  statuses: MemberStatuses,
  memberName: string,
  status: AnimeStatus,
  episodesWatched?: number | null,
): MemberStatuses {
  const next = { ...statuses };

  if (status === "none") {
    delete next[memberName];
  } else {
    const previous = statuses[memberName];
    const entry: MemberStatusEntry = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (statusShowsEpisodeProgress(status)) {
      const resolved =
        episodesWatched != null
          ? episodesWatched
          : previous?.episodesWatched != null
            ? previous.episodesWatched
            : undefined;
      if (resolved != null && resolved >= 0) {
        entry.episodesWatched = resolved;
      }
    }
    if (statusShowsRewatchCount(status)) {
      entry.rewatchCount = Math.max(1, previous?.rewatchCount ?? 1);
    }
    next[memberName] = entry;
  }

  return next;
}

export function setMemberEpisodesWatched(
  statuses: MemberStatuses,
  memberName: string,
  episodesWatched: number,
): MemberStatuses {
  const current = statuses[memberName];
  if (!current || !statusShowsEpisodeProgress(current.status)) {
    return statuses;
  }

  return {
    ...statuses,
    [memberName]: {
      ...current,
      episodesWatched: Math.max(0, episodesWatched),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function setMemberRewatchCount(
  statuses: MemberStatuses,
  memberName: string,
  rewatchCount: number,
): MemberStatuses {
  const current = statuses[memberName];
  if (!current || !statusShowsRewatchCount(current.status)) {
    return statuses;
  }

  return {
    ...statuses,
    [memberName]: {
      ...current,
      rewatchCount: Math.max(1, Math.floor(rewatchCount)),
      updatedAt: new Date().toISOString(),
    },
  };
}

export function getMemberProgressEpisodes(
  statuses: MemberStatuses,
  memberName: string,
  totalEpisodes: number | null,
): number {
  const status = getMemberStatus(statuses, memberName);
  const total = totalEpisodes ?? 0;

  if (status === "rewatching") {
    return total * getMemberRewatchCount(statuses, memberName);
  }

  if (FINISHED_STATUSES.includes(status)) {
    return total;
  }

  const progress = getMemberEpisodesWatched(statuses, memberName);
  if (statusShowsEpisodeProgress(status) && progress != null) {
    return total > 0 ? Math.min(progress, total) : progress;
  }

  return 0;
}

export function getMemberProgressMinutes(
  statuses: MemberStatuses,
  memberName: string,
  totalEpisodes: number | null,
  episodeDurationMin: number | null,
  totalDurationMin: number | null,
): number {
  const watchedEps = getMemberProgressEpisodes(
    statuses,
    memberName,
    totalEpisodes,
  );
  if (watchedEps <= 0) return 0;

  const perEpisode =
    episodeDurationMin ??
    (totalDurationMin && totalEpisodes
      ? totalDurationMin / totalEpisodes
      : null) ??
    0;

  return Math.round(watchedEps * perEpisode);
}

export function countFinishedMembers(
  statuses: MemberStatuses,
  memberNames: string[],
): number {
  return memberNames.filter((name) =>
    FINISHED_STATUSES.includes(getMemberStatus(statuses, name)),
  ).length;
}

export function isFinishedStatus(status: AnimeStatus): boolean {
  return FINISHED_STATUSES.includes(status);
}

export function migrateWatchedByToStatuses(
  watchedBy: string[],
  existing: MemberStatuses,
): MemberStatuses {
  const next = { ...existing };

  for (const name of watchedBy) {
    if (!next[name]) {
      next[name] = {
        status: "completed",
        updatedAt: new Date(0).toISOString(),
      };
    }
  }

  return next;
}

export function serializeMemberStatuses(
  statuses: MemberStatuses,
): Record<string, MemberStatusEntry> {
  return statuses;
}
