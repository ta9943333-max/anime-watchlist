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
  { value: "watching", label: "Watching", color: "text-[#3db4f2] bg-[#3db4f2]/15 border-[#3db4f2]/30" },
  {
    value: "completed",
    label: "Completed",
    color: "text-[#32b8c6] bg-[#32b8c6]/15 border-[#32b8c6]/30",
  },
  {
    value: "rewatching",
    label: "Rewatching",
    color: "text-[#4dc9b0] bg-[#4dc9b0]/15 border-[#4dc9b0]/30",
  },
  {
    value: "planning",
    label: "Planning",
    color: "text-[#a259ff] bg-[#a259ff]/15 border-[#a259ff]/30",
  },
  {
    value: "considering",
    label: "Considering",
    color: "text-[#c77dff] bg-[#c77dff]/15 border-[#c77dff]/30",
  },
  {
    value: "paused",
    label: "Paused",
    color: "text-[#fab005] bg-[#fab005]/15 border-[#fab005]/30",
  },
  {
    value: "dropped",
    label: "Dropped",
    color: "text-[#ed4245] bg-[#ed4245]/15 border-[#ed4245]/30",
  },
  {
    value: "skipping",
    label: "Skipping",
    color: "text-slate-400 bg-slate-700/40 border-slate-600/40",
  },
];

import {
  getExactRuntime,
  minutesForEpisodesWatched,
} from "@/lib/anime/runtime";

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
      if (resolved != null && resolved > 0) {
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
  episodeDurationMin: number | null = null,
  totalDurationMin: number | null = null,
): number {
  const status = getMemberStatus(statuses, memberName);
  const runtime = getExactRuntime({
    episodes: totalEpisodes,
    episodeDurationMin,
    totalDurationMin,
  });
  if (!runtime) return 0;

  if (status === "rewatching") {
    return runtime.episodes * getMemberRewatchCount(statuses, memberName);
  }

  if (FINISHED_STATUSES.includes(status)) {
    return runtime.episodes;
  }

  const progress = getMemberEpisodesWatched(statuses, memberName);
  if (statusShowsEpisodeProgress(status) && progress != null) {
    return Math.min(Math.floor(progress), runtime.episodes);
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
  const status = getMemberStatus(statuses, memberName);
  if (status === "none") return 0;

  const runtime = getExactRuntime({
    episodes: totalEpisodes,
    episodeDurationMin,
    totalDurationMin,
  });
  if (!runtime) return 0;

  if (status === "rewatching") {
    return runtime.totalDurationMin * getMemberRewatchCount(statuses, memberName);
  }

  if (status === "completed") {
    return runtime.totalDurationMin;
  }

  const watchedEps = getMemberProgressEpisodes(
    statuses,
    memberName,
    totalEpisodes,
    episodeDurationMin,
    totalDurationMin,
  );
  if (watchedEps <= 0) return 0;

  if (statusShowsEpisodeProgress(status)) {
    return minutesForEpisodesWatched(watchedEps, runtime);
  }

  return 0;
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
