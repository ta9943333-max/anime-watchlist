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
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function significantWords(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

export function scoreSearchMatch(
  query: string,
  item: MalSearchResult,
): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  const titles = [item.titleEnglish, item.title].filter(
    (title): title is string => Boolean(title?.trim()),
  );

  let best = 0;

  for (const title of titles) {
    const normalizedTitle = normalize(title);
    if (!normalizedTitle) continue;

    const englishBonus = title === item.titleEnglish?.trim() ? 50 : 0;

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
        best = Math.max(best, 7_000 + matched * 20);
      } else if (ratio >= 0.75) {
        best = Math.max(best, 5_500 + matched * 10);
      } else {
        best = Math.max(best, ratio * 2_500);
      }
    }
  }

  if (item.score && item.score > 0) {
    best += item.score * 10;
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
        : `title:${normalize(item.titleEnglish ?? item.title)}`;

    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, item);
      continue;
    }

    const existingScore = scoreSearchMatch(query, existing);
    const nextScore = scoreSearchMatch(query, item);
    if (nextScore > existingScore || (!existing.imageUrl && item.imageUrl)) {
      seen.set(key, { ...existing, ...item, title: item.title || existing.title });
    }
  }

  return [...seen.values()]
    .map((item, index) => ({
      item,
      score: scoreSearchMatch(query, item) - index * 0.01,
    }))
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.item);
}
