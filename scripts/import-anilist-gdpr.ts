/**
 * Importiert AniList-GDPR-Export 1:1 (jede Staffel separat, keine Zusammenführung).
 *
 * Usage: npx tsx scripts/import-anilist-gdpr.ts <csv-path> [memberName]
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  mapAllGdprEntries,
  type AnilistGdprListEntry,
  type AnilistMediaNode,
} from "../src/lib/anilist/gdpr-import";
import {
  serializeMemberStatuses,
  statusShowsEpisodeProgress,
  type AnimeStatus,
  type MemberStatuses,
} from "../src/lib/statuses";

function loadEnv(): Record<string, string> {
  try {
    const raw = readFileSync(".env.local", "utf8");
    const env: Record<string, string> = {};
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnv();

// Lokales Zertifikatsproblem (Windows) — nur für dieses Import-Skript
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const ANILIST_URL = "https://graphql.anilist.co";
const MEMBER_NAME = process.argv[3] ?? "Ricardo";
const CSV_PATH =
  process.argv[2] ?? "C:\\Users\\rcrdh\\Downloads\\gdpr_data.csv";

const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const MEDIA_QUERY = `
query ($ids: [Int], $perPage: Int) {
  Page(page: 1, perPage: $perPage) {
    media(id_in: $ids, type: ANIME) {
      id
      idMal
      title { romaji english }
      episodes
      duration
      genres
      status
    }
  }
}
`;

async function fetchMediaBatch(ids: number[]): Promise<AnilistMediaNode[]> {
  const response = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: MEDIA_QUERY,
      variables: { ids, perPage: ids.length },
    }),
  });
  if (!response.ok) throw new Error(`AniList API ${response.status}`);
  const payload = (await response.json()) as {
    data?: { Page?: { media?: AnilistMediaNode[] } };
    errors?: { message: string }[];
  };
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((e) => e.message).join("; "));
  }
  return payload.data?.Page?.media ?? [];
}

function parseCsvLists(csvPath: string): AnilistGdprListEntry[] {
  const out = execSync(`python scripts/parse-gdpr-lists.py "${csvPath}"`, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    cwd: process.cwd(),
  });
  return JSON.parse(out.trim()) as AnilistGdprListEntry[];
}

function parseCsvStatistics(csvPath: string) {
  const out = execSync(`python scripts/parse-gdpr-statistics.py "${csvPath}"`, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    cwd: process.cwd(),
  });
  return JSON.parse(out.trim()) as {
    count: number;
    minutesWatched: number;
    progress: number;
  };
}

function buildMemberEntry(
  status: AnimeStatus,
  episodesWatched: number,
  rewatchCount: number,
): MemberStatuses[string] {
  const entry: MemberStatuses[string] = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (statusShowsEpisodeProgress(status) || status === "completed") {
    entry.episodesWatched = episodesWatched;
  }
  if (status === "rewatching") {
    entry.rewatchCount = rewatchCount;
  }
  return entry;
}

function buildWatchedBy(statuses: MemberStatuses): string[] {
  return Object.entries(statuses)
    .filter(([, e]) => e.status === "completed" || e.status === "rewatching")
    .map(([name]) => name);
}

async function main() {
  console.log(`CSV: ${CSV_PATH}`);
  console.log(`Mitglied: ${MEMBER_NAME} (1:1, keine Staffel-Zusammenführung)`);

  const listEntries = parseCsvLists(CSV_PATH);
  console.log(`Listen-Einträge in CSV: ${listEntries.length}`);

  const ids = [...new Set(listEntries.map((e) => e.series_id))];
  const mediaById = new Map<number, AnilistMediaNode>();

  for (let i = 0; i < ids.length; i += 50) {
    const batch = ids.slice(i, i + 50);
    for (const m of await fetchMediaBatch(batch)) {
      mediaById.set(m.id, m);
    }
    console.log(`  AniList ${Math.min(i + 50, ids.length)}/${ids.length}`);
    await new Promise((r) => setTimeout(r, 350));
  }

  const importRows = mapAllGdprEntries(listEntries, mediaById);
  console.log(`Importierbare Einträge: ${importRows.length}`);

  const { data: existingRows, error: fetchError } = await supabase
    .from("anime")
    .select("*");
  if (fetchError) throw new Error(fetchError.message);

  let cleared = 0;
  for (const row of existingRows ?? []) {
    const statuses =
      row.member_statuses && typeof row.member_statuses === "object"
        ? { ...(row.member_statuses as MemberStatuses) }
        : {};
    const ratings =
      row.ratings && typeof row.ratings === "object"
        ? { ...(row.ratings as Record<string, number>) }
        : {};

    if (!(MEMBER_NAME in statuses) && !(MEMBER_NAME in ratings)) continue;

    delete statuses[MEMBER_NAME];
    delete ratings[MEMBER_NAME];
    cleared++;

    const { error } = await supabase
      .from("anime")
      .update({
        member_statuses: serializeMemberStatuses(statuses),
        ratings,
        watched_by: buildWatchedBy(statuses),
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
  }
  console.log(`${MEMBER_NAME}: ${cleared} alte Einträge geleert`);

  let created = 0;
  let updated = 0;
  let dbRows = (await supabase.from("anime").select("*")).data ?? [];

  for (const item of importRows) {
    const match =
      dbRows.find((r) => r.anilist_id === item.anilistId) ??
      (item.malId ? dbRows.find((r) => r.mal_id === item.malId) : undefined);

    const memberEntry = buildMemberEntry(
      item.status,
      item.episodesWatched,
      item.rewatchCount,
    );
    const now = new Date().toISOString();

    if (match) {
      const statuses =
        match.member_statuses && typeof match.member_statuses === "object"
          ? { ...(match.member_statuses as MemberStatuses) }
          : {};
      const ratings =
        match.ratings && typeof match.ratings === "object"
          ? { ...(match.ratings as Record<string, number>) }
          : {};

      statuses[MEMBER_NAME] = { ...memberEntry, updatedAt: now };
      if (item.rating) ratings[MEMBER_NAME] = item.rating;
      else delete ratings[MEMBER_NAME];

      const { data, error } = await supabase
        .from("anime")
        .update({
          title: item.title,
          title_english: item.titleEnglish,
          series_key: item.seriesKey,
          anilist_id: item.anilistId,
          mal_id: item.malId,
          episodes: item.episodes,
          episode_duration_min: item.episodeDurationMin,
          total_duration_min: item.totalDurationMin,
          genres: item.genres,
          mal_status: item.malStatus,
          member_statuses: serializeMemberStatuses(statuses),
          ratings,
          watched_by: buildWatchedBy(statuses),
        })
        .eq("id", match.id)
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      dbRows = dbRows.map((r) => (r.id === match.id ? data : r));
      updated++;
    } else {
      const statuses: MemberStatuses = {
        [MEMBER_NAME]: { ...memberEntry, updatedAt: now },
      };
      const ratings: Record<string, number> = {};
      if (item.rating) ratings[MEMBER_NAME] = item.rating;

      const { data, error } = await supabase
        .from("anime")
        .insert({
          title: item.title,
          title_english: item.titleEnglish,
          series_key: item.seriesKey,
          anilist_id: item.anilistId,
          mal_id: item.malId,
          episodes: item.episodes,
          episode_duration_min: item.episodeDurationMin,
          total_duration_min: item.totalDurationMin,
          genres: item.genres,
          mal_status: item.malStatus,
          member_statuses: serializeMemberStatuses(statuses),
          ratings,
          watched_by: buildWatchedBy(statuses),
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);
      dbRows.push(data);
      created++;
    }
  }

  const completed = importRows.filter((r) => r.status === "completed").length;
  const watching = importRows.filter((r) => r.status === "watching").length;

  const profileAnimeStats = parseCsvStatistics(CSV_PATH);
  const { error: memberError } = await supabase
    .from("members")
    .update({ profile_stats: { anime: profileAnimeStats } })
    .eq("name", MEMBER_NAME);
  if (memberError) throw new Error(memberError.message);

  console.log(`Fertig: ${created} neu, ${updated} aktualisiert`);
  console.log(
    `${MEMBER_NAME} AniList-Profil: ${profileAnimeStats.count} Serien | ${profileAnimeStats.progress} Folgen | ${profileAnimeStats.minutesWatched} Min | ${profileAnimeStats.minutesWatched / 60} Std.`,
  );
  console.log(`Listenstatus: ${completed} completed, ${watching} watching (${importRows.length} Einträge)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
