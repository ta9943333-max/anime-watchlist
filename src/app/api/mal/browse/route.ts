import { NextResponse } from "next/server";
import { mapJikanAnime, type JikanAnime } from "@/lib/mal/map-anime";

type JikanPagination = {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
  items: {
    count: number;
    total: number;
    per_page: number;
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 25), 1), 50);
  const orderBy = searchParams.get("order_by") ?? "popularity";
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  try {
    const url = new URL("https://api.jikan.moe/v4/anime");
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("order_by", orderBy);
    url.searchParams.set("sort", sort);
    url.searchParams.set("sfw", "true");

    const response = await fetch(url.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Jikan API error" },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as {
      data: JikanAnime[];
      pagination: JikanPagination;
    };

    const pagination = payload.pagination;
    const results = (payload.data ?? []).map(mapJikanAnime);

    return NextResponse.json({
      results,
      pagination: {
        currentPage: pagination.current_page,
        lastVisiblePage: pagination.last_visible_page,
        hasNextPage: pagination.has_next_page,
        total: pagination.items.total,
        perPage: pagination.items.per_page,
        count: pagination.items.count,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to browse anime" },
      { status: 500 },
    );
  }
}
