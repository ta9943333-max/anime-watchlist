/** AniList score formats — internal storage is always 0–100 (percent). */

export type ScoreFormat =
  | "POINT_100"
  | "POINT_10_DECIMAL"
  | "POINT_10"
  | "POINT_5"
  | "POINT_3";

export const DEFAULT_SCORE_FORMAT: ScoreFormat = "POINT_10";

/** UI input (user format) → DB percent 0–100 */
export function userScoreToPercent(
  value: number,
  format: ScoreFormat = DEFAULT_SCORE_FORMAT,
): number {
  switch (format) {
    case "POINT_100":
      return Math.min(100, Math.max(0, value));
    case "POINT_10_DECIMAL":
    case "POINT_10":
      return Math.min(100, Math.max(0, value * 10));
    case "POINT_5":
      return Math.min(100, Math.max(0, value * 20));
    case "POINT_3":
      if (value >= 3) return 85;
      if (value >= 2) return 60;
      return 35;
    default:
      return Math.min(100, Math.max(0, value * 10));
  }
}

/** DB percent → display string in user format */
export function percentToDisplayScore(
  percent: number,
  format: ScoreFormat = DEFAULT_SCORE_FORMAT,
): string {
  const p = Math.min(100, Math.max(0, percent));
  switch (format) {
    case "POINT_100":
      return String(Math.round(p));
    case "POINT_10_DECIMAL":
      return (p / 10).toFixed(1);
    case "POINT_10":
      return String(Math.round(p / 10));
    case "POINT_5":
      return String(Math.round(p / 20));
    case "POINT_3":
      if (p >= 75) return "3";
      if (p >= 50) return "2";
      return "1";
    default:
      return (p / 10).toFixed(1);
  }
}

/** Legacy 1–10 integer ratings in DB → percent */
export function legacyTenScaleToPercent(rating: number): number {
  return Math.min(100, Math.max(0, rating * 10));
}

export function percentToLegacyTenScale(percent: number): number {
  return Math.min(10, Math.max(0, Math.round(percent / 10)));
}
