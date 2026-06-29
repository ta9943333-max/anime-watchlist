"use client";

import Link from "next/link";
import { useAnilistSession } from "@/hooks/use-anilist-session";

export default function HomePage() {
  const { user, loading } = useAnilistSession();

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[rgb(var(--color-primary))] border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user.name}
        </h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HomeCard
            href={`/user/${encodeURIComponent(user.name)}/animelist/watching`}
            title="My Anime List"
            description="Watching, Planning, Completed — live from AniList"
          />
          <HomeCard
            href="/search/anime"
            title="Search"
            description={`Browse ${new Date().getFullYear()} season anime`}
          />
          <HomeCard
            href="/group"
            title="Group Watchlist"
            description="Shared list for friends & family"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="mb-3 text-3xl font-bold text-white">Track your anime</h1>
      <p className="mb-8 text-[rgb(var(--color-text-light))]">
        Log in with your AniList account for a 1:1 experience — live lists,
        scores, and progress synced directly with AniList.
      </p>
      <a href="/api/anilist/auth/authorize" className="btn-anilist-primary text-base">
        Login with AniList
      </a>
      <p className="mt-6 text-sm text-[rgb(var(--color-text-lighter))]">
        Or use the{" "}
        <Link href="/group" className="text-[rgb(var(--color-primary))] hover:underline">
          group watchlist
        </Link>{" "}
        without AniList login.
      </p>
    </div>
  );
}

function HomeCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="surface-card block p-5 transition hover:ring-2 hover:ring-[rgb(var(--color-primary))]"
    >
      <h2 className="mb-1 font-semibold text-white">{title}</h2>
      <p className="text-sm text-[rgb(var(--color-text-light))]">{description}</p>
    </Link>
  );
}
