import { AniListShell } from "@/components/anilist/AniListShell";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AniListShell>{children}</AniListShell>;
}
