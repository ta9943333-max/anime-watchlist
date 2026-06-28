const SEASON_SUFFIX_PATTERNS = [
  /\s+R2\b.*$/i,
  /\s+(?:Season|S)\s*\d+.*$/i,
  /\s+\d+(?:st|nd|rd|th)\s+Season.*$/i,
  /\s+(?:Second|Third|Fourth|Final)\s+Season.*$/i,
  /\s+Part\s+\d+.*$/i,
  /\s+Cour\s+\d+.*$/i,
  /\s+:\s*.*?(?:R2|Rebellion R2|Revolution).*$/i,
];

export function pickDisplayTitle(
  title: string,
  titleEnglish?: string | null,
): string {
  const english = titleEnglish?.trim();
  if (english) return english;
  return title.trim();
}

export function extractSeriesKey(title: string): string {
  let key = title.trim();

  for (const pattern of SEASON_SUFFIX_PATTERNS) {
    key = key.replace(pattern, "");
  }

  const colonBase = key.match(/^([^:]+):/);
  if (colonBase) {
    const base = colonBase[1].trim();
    if (base.split(/\s+/).length <= 4) {
      key = base;
    }
  }

  return key
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function prettifySeriesKey(seriesKey: string): string {
  return seriesKey
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function mergeGenres(existing: string[], incoming: string[]): string[] {
  return [...new Set([...existing, ...incoming])].sort();
}

const SEQUEL_TITLE_PATTERNS = [
  /\s+R2\b/i,
  /\bR2:/i,
  /\s+II\b/i,
  /\s+2nd\s+Season/i,
  /\s+Season\s+[2-9]\d*/i,
  /\s+S[2-9]\b/i,
  /\s+Part\s+[2-9]/i,
  /\s+Cour\s+[2-9]/i,
  /\s+Final\s+Season/i,
  /\s+(?:Second|Third|Fourth)\s+Season/i,
];

/** True when the title looks like a later season (safe to merge episode counts). */
export function isLikelySeasonSequel(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  return SEQUEL_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
