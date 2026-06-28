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
};

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
      const entry = value as { status?: string; updatedAt?: string };
      if (entry.status && isValidStatus(entry.status) && entry.status !== "none") {
        result[name] = {
          status: entry.status,
          updatedAt: entry.updatedAt ?? new Date().toISOString(),
        };
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

export function setMemberStatus(
  statuses: MemberStatuses,
  memberName: string,
  status: AnimeStatus,
): MemberStatuses {
  const next = { ...statuses };

  if (status === "none") {
    delete next[memberName];
  } else {
    next[memberName] = {
      status,
      updatedAt: new Date().toISOString(),
    };
  }

  return next;
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
