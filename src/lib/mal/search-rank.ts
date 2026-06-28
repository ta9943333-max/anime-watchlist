import type { MalSearchResult } from "@/lib/mal/jikan";

const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "at",
  "for",
  "and",
  "or",
  "no",
  "ni",
  "wa",
  "ga",
  "s",
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/(\w)[''\u2019]s\b/g, "$1s")
    .replace(/[''\u2019`]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function titleVariants(item: MalSearchResult): string[] {
  const titles = [item.titleEnglish, item.title, item.titleRomaji].filter(
    (title): title is string => Boolean(title?.trim()),
  );
  return [...new Set(titles.map((title) => title.trim()))];
}

function allSignificantWordsMatch(query: string, title: string): boolean {
  const queryWords = significantWords(query);
  if (queryWords.length === 0) return false;
  const normalizedTitle = normalize(title);
  return queryWords.every((word) => normalizedTitle.includes(word));
}

export function scoreSearchMatch(
  query: string,
  item: MalSearchResult,
): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  let best = 0;

  for (const title of titleVariants(item)) {
    const normalizedTitle = normalize(title);
    if (!normalizedTitle) continue;

    const englishBonus = title === item.titleEnglish?.trim() ? 100 : 0;

    if (normalizedTitle === normalizedQuery) {
      best = Math.max(best, 10_000 + englishBonus);
      continue;
    }

    if (normalizedTitle.startsWith(normalizedQuery)) {
      best = Math.max(best, 9_000 + englishBonus);
      continue;
    }

    if (normalizedQuery.startsWith(normalizedTitle)) {
      best = Math.max(best, 8_500 + englishBonus);
      continue;
    }

    if (allSignificantWordsMatch(normalizedQuery, title)) {
      best = Math.max(best, 8_800 + englishBonus);
      continue;
    }

    if (normalizedTitle.includes(normalizedQuery)) {
      best = Math.max(best, 8_000 + englishBonus);
      continue;
    }

    if (normalizedQuery.includes(normalizedTitle) && normalizedTitle.length >= 8) {
      best = Math.max(best, 7_500 + englishBonus);
      continue;
    }

    const queryWords = significantWords(normalizedQuery);
    const titleWords = significantWords(normalizedTitle);

    if (queryWords.length > 0) {
      const matched = queryWords.filter((word) =>
        titleWords.some(
          (titleWord) =>
            titleWord === word ||
            titleWord.startsWith(word) ||
            word.startsWith(titleWord),
        ),
      ).length;

      const ratio = matched / queryWords.length;
      if (ratio === 1) {
        best = Math.max(best, 7_000 + matched * 20 + englishBonus);
      } else if (ratio >= 0.75) {
        best = Math.max(best, 5_500 + matched * 10);
      } else {
        best = Math.max(best, ratio * 2_500);
      }
    }
  }

  if (item.score && item.score > 0) {
    best += Math.min(item.score * 10, 80);
  }

  return best;
}

export function rankSearchResults(
  query: string,
  items: MalSearchResult[],
): MalSearchResult[] {
  const seen = new Map<string, MalSearchResult>();

  for (const item of items) {
    const key =
      item.malId > 0
        ? `mal:${item.malId}`
        : item.anilistId
          ? `anilist:${item.anilistId}`
          : `title:${normalize(item.titleEnglish ?? item.title)}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const existingScore = scoreSearchMatch(query, existing);
    const nextScore = scoreSearchMatch(query, item);
    if (nextScore > existingScore || (!existing.imageUrl && item.imageUrl)) {
      seen.set(key, {
        ...existing,
        ...item,
        title: item.title || existing.title,
        titleEnglish: item.titleEnglish ?? existing.titleEnglish,
        titleRomaji: item.titleRomaji ?? existing.titleRomaji,
      });
    }
  }

  return [...seen.values()]
    .map((item, index) => ({
      item,
      score: scoreSearchMatch(query, item) - index * 0.001,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
