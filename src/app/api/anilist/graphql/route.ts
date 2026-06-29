import { NextResponse } from "next/server";
import { anilistGraphql } from "@/lib/anilist/graphql";
import { getAnilistSession } from "@/lib/anilist/session";

export async function POST(request: Request) {
  const session = await getAnilistSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { query?: string; variables?: Record<string, unknown> };
  try {
    body = (await request.json()) as {
      query?: string;
      variables?: Record<string, unknown>;
    };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.query?.trim()) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  try {
    const result = await anilistGraphql(
      body.query,
      body.variables,
      session.accessToken,
    );
    if (result.errors?.length) {
      return NextResponse.json(
        { errors: result.errors },
        { status: 400 },
      );
    }
    return NextResponse.json({ data: result.data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GraphQL proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
