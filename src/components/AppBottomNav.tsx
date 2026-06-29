"use client";

import { BarChart3, Compass, Library, User } from "lucide-react";
import type { ViewTab } from "@/lib/types";

type AppBottomNavProps = {
  active: ViewTab;
  onChange: (tab: ViewTab) => void;
};

const NAV_ITEMS: {
  id: ViewTab;
  label: string;
  icon: typeof Library;
}[] = [
  { id: "list", label: "Bibliothek", icon: Library },
  { id: "discover", label: "Entdecken", icon: Compass },
  { id: "leaderboard", label: "Charts", icon: BarChart3 },
  { id: "profile", label: "Profil", icon: User },
];

export function AppBottomNav({ active, onChange }: AppBottomNavProps) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto flex h-[var(--nav-height)] max-w-[var(--content-max-width)] items-stretch justify-around px-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl transition ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition ${
                  isActive ? "bg-[var(--accent-muted)]" : ""
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 2} />
              </span>
              <span className="text-[10px] font-semibold tracking-wide">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
