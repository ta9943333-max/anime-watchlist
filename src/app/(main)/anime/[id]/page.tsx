import { AniListMediaPage } from "@/components/anilist/AniListMediaPage";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnimeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const mediaId = Number(id);
  if (!mediaId || mediaId <= 0) {
    return <p className="py-16 text-center text-[rgb(var(--color-red))]">Invalid ID</p>;
  }
  return <AniListMediaPage mediaId={mediaId} />;
}
