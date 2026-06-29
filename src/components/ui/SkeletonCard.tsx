import { ANIME_CARD_GRID } from "@/components/AnimeLiveChartCard";

type SkeletonCardProps = {
  layout?: "poster" | "list";
};

export function SkeletonCard({ layout = "poster" }: SkeletonCardProps) {
  if (layout === "list") {
    return (
      <div className="surface-card flex overflow-hidden">
        <div className="anilist-skeleton h-[140px] w-[108px] shrink-0" />
        <div className="flex flex-1 flex-col gap-2 p-3">
          <div className="anilist-skeleton h-4 w-3/4" />
          <div className="anilist-skeleton h-3 w-1/2" />
          <div className="anilist-skeleton h-3 w-full" />
          <div className="anilist-skeleton h-3 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="anilist-skeleton aspect-[2/3] w-full" />
      <div className="space-y-2 p-2">
        <div className="anilist-skeleton h-3 w-4/5" />
        <div className="anilist-skeleton h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonCardGrid({
  count = 12,
  layout = "poster",
}: {
  count?: number;
  layout?: "poster" | "list";
}) {
  return (
    <div className={ANIME_CARD_GRID}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} layout={layout} />
      ))}
    </div>
  );
}
