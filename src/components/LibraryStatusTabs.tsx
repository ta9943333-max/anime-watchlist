"use client";

import { useMemo } from "react";
import { STATUS_OPTIONS, getMemberStatus } from "@/lib/statuses";
import type { AnimeEntry, FilterOption } from "@/lib/types";

type LibraryStatusTabsProps = {
  active: FilterOption;
  onChange: (filter: FilterOption) => void;
  animeList: AnimeEntry[];
  currentUser: string;
};

const LIBRARY_TABS: { value: FilterOption; label: string }[] = [
  { value: "all", label: "Alle" },
  ...STATUS_OPTIONS.filter((o) => o.value !== "none").map((o) => ({
    value: o.value as FilterOption,
    label: o.label,
  })),
  { value: "no-status", label: "Ohne Status" },
];

export function LibraryStatusTabs({
  active,
  onChange,
  animeList,
  currentUser,
}: LibraryStatusTabsProps) {
  const counts = useMemo(() => {
    const map = new Map<FilterOption, number>();
    map.set("all", animeList.length);
    let noStatus = 0;
    for (const status of STATUS_OPTIONS) {
      if (status.value === "none") continue;
      map.set(status.value as FilterOption, 0);
    }
    for (const anime of animeList) {
      const st = getMemberStatus(anime.memberStatuses, currentUser);
      if (st === "none") {
        noStatus += 1;
      } else {
        map.set(st as FilterOption, (map.get(st as FilterOption) ?? 0) + 1);
      }
    }
    map.set("no-status", noStatus);
    return map;
  }, [animeList, currentUser]);

  return (
    <div className="anilist-scroll-tabs -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {LIBRARY_TABS.map((tab) => {
        const isActive = active === tab.value;
        const count = counts.get(tab.value) ?? 0;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent)]/25"
                : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                isActive
                  ? "bg-white/20 text-white"
                  : "bg-[var(--background)] text-[var(--text-dim)]"
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
