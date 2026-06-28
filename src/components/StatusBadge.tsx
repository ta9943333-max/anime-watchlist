import { getStatusMeta, type AnimeStatus } from "@/lib/statuses";

type StatusBadgeProps = {
  status: AnimeStatus;
  compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const meta = getStatusMeta(status);
  const sizing = compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-1 text-xs";

  if (status === "none") {
    return (
      <span
        className={`rounded-lg border border-slate-800 text-slate-500 ${sizing}`}
      >
        None
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-medium ${sizing} ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}
