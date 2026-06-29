"use client";

import Link from "next/link";
import {
  MEDIA_LIST_STATUSES,
  MEDIA_LIST_STATUS_LABELS,
  type MediaListStatus,
} from "@/lib/anilist/types";

type AniListStatusTabsProps = {
  userName: string;
  active: MediaListStatus;
  counts?: Partial<Record<MediaListStatus, number>>;
};

export function AniListStatusTabs({
  userName,
  active,
  counts = {},
}: AniListStatusTabsProps) {
  return (
    <div className="anilist-scroll-tabs mb-5 flex gap-1 overflow-x-auto border-b border-[rgb(var(--color-foreground-grey))] pb-0">
      {MEDIA_LIST_STATUSES.map((status) => {
        const isActive = status === active;
        const count = counts[status];
        const href = `/user/${encodeURIComponent(userName)}/animelist/${MEDIA_LIST_STATUS_LABELS[status].toLowerCase()}`;
        return (
          <Link
            key={status}
            href={href}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              isActive
                ? "border-[rgb(var(--color-primary))] text-[rgb(var(--color-primary))]"
                : "border-transparent text-[rgb(var(--color-text-light))] hover:text-white"
            }`}
          >
            {MEDIA_LIST_STATUS_LABELS[status]}
            {count != null && (
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
