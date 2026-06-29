/**
 * Exakte Zeitumrechnung — keine Schätzungen, keine „ca.“-Rundung.
 * Basis immer ganze Minuten (wie AniList minutesWatched).
 */

/** Stunden als exakter Dezimalwert (Minuten ÷ 60). */
export function minutesToHours(minutes: number): number {
  return minutes / 60;
}

/** Tage als exakter Dezimalwert (Minuten ÷ 1.440). */
export function minutesToDays(minutes: number): number {
  return minutes / 1440;
}

/**
 * Anzeige-Stunden: nur so viele Nachkommastellen wie nötig (max. 2).
 * 85.338 Min → 1422,3 Std.
 */
export function formatHoursFromMinutes(minutes: number): string {
  const hours = minutesToHours(minutes);
  return formatPreciseNumber(hours, 2);
}

/** Anzeige-Tage aus Minuten. 85.338 Min → 59,26 Tage */
export function formatDaysFromMinutes(minutes: number): string {
  const days = minutesToDays(minutes);
  return formatPreciseNumber(days, 2);
}

export function formatPreciseNumber(value: number, maxDecimals: number): string {
  if (!Number.isFinite(value)) return "0";
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  const text = rounded.toFixed(maxDecimals);
  return text.replace(/\.?0+$/, "");
}

/** AniList: Minuten = Fortschritt (Folgen) × Episodenlänge — nur Ganzzahlen. */
export function anilistMinutesFromProgress(
  progressEpisodes: number,
  episodeDurationMin: number,
): number {
  if (progressEpisodes <= 0 || episodeDurationMin <= 0) return 0;
  return progressEpisodes * episodeDurationMin;
}
