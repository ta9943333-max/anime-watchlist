"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, Search, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAnilistSession } from "@/hooks/use-anilist-session";

export function AniListNav() {
  const pathname = usePathname();
  const { user, logout } = useAnilistSession();

  const listHref = user
    ? `/user/${encodeURIComponent(user.name)}/animelist`
    : "/api/anilist/auth/authorize";

  return (
    <header className="sticky top-0 z-50 border-b border-[rgb(var(--color-foreground-grey))] bg-[rgb(var(--color-foreground))]">
      <div className="mx-auto flex h-14 max-w-[var(--content-max-width)] items-center gap-4 px-4">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-white hover:text-[rgb(var(--color-primary))] transition"
        >
          AniList
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <NavLink href="/" active={pathname === "/"} icon={Home} label="Home" />
          <NavLink
            href="/search/anime"
            active={pathname.startsWith("/search")}
            icon={Search}
            label="Search"
          />
          <NavLink
            href={listHref}
            active={pathname.includes("/animelist")}
            icon={Compass}
            label="List"
          />
          <NavLink
            href="/group"
            active={pathname.startsWith("/group")}
            icon={Users}
            label="Group"
          />
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={listHref}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[rgb(var(--color-foreground-grey))]"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgb(var(--color-primary))] text-xs font-bold text-white">
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="hidden text-sm font-medium text-white sm:inline">
                  {user.name}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void logout()}
                className="btn-anilist-ghost text-xs"
              >
                Logout
              </button>
            </div>
          ) : (
            <a href="/api/anilist/auth/authorize" className="btn-anilist-primary text-sm">
              Login
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 rounded px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-[rgba(var(--color-primary),0.2)] text-[rgb(var(--color-primary))]"
          : "text-[rgb(var(--color-text))] hover:bg-[rgb(var(--color-foreground-grey))] hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}
