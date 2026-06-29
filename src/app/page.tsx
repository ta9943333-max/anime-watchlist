"use client";

import dynamic from "next/dynamic";

const WatchlistApp = dynamic(
  () => import("@/components/WatchlistApp").then((mod) => mod.WatchlistApp),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
      </div>
    ),
  },
);

export default function HomePage() {
  return <WatchlistApp />;
}
