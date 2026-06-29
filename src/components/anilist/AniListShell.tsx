import { AniListNav } from "@/components/anilist/AniListNav";

export function AniListShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))]">
      <AniListNav />
      <main className="anilist-app-shell px-4 py-6 pb-10">{children}</main>
    </div>
  );
}
