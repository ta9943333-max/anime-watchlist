import { getStatusMeta, type AnimeStatus } from "@/lib/statuses";

type StatusBadgeProps = {
  status: AnimeStatus;
  compact?: boolean;
};

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const meta = getStatusMeta(status);

  if (status === "none") {
    return (
      <span className="rounded-lg border border-slate-800 px-2 py-1 text-xs text-slate-500">
        None
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-1 text-xs font-medium ${meta.color}`}
    >
      {meta.label}
    </span>
  );
}
