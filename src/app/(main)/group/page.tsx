import { WatchlistApp } from "@/components/WatchlistApp";

export const metadata = {
  title: "Group Watchlist",
};

export default function GroupWatchlistPage() {
  return (
    <div className="-mx-4 -mt-6">
      <WatchlistApp embedded />
    </div>
  );
}
