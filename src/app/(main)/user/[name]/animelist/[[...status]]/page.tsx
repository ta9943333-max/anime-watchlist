import { AniListListView } from "@/components/anilist/AniListListView";
import { mediaListStatusFromSlug } from "@/lib/anilist/types";

type PageProps = {
  params: Promise<{ name: string; status?: string[] }>;
};

export default async function UserAnimeListPage({ params }: PageProps) {
  const { name, status: statusParts } = await params;
  const statusSlug = statusParts?.[0];
  const status = mediaListStatusFromSlug(statusSlug);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">{decodeURIComponent(name)}</h1>
        <p className="text-sm text-[rgb(var(--color-text-light))]">Anime List</p>
      </div>
      <AniListListView
        userName={decodeURIComponent(name)}
        status={status ?? "CURRENT"}
      />
    </div>
  );
}
