#!/usr/bin/env python3
"""
Liest Anime-Namen aus animes.txt und fragt die kostenlose AniList GraphQL-API ab.
Zeigt für laufende Serien (RELEASING) den Countdown bis zur nächsten Folge.
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path

ANILIST_URL = "https://graphql.anilist.co"
REQUEST_DELAY_SEC = 1
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_LIST_FILE = SCRIPT_DIR / "animes.txt"

SEARCH_QUERY = """
query ($search: String) {
  Page(page: 1, perPage: 1) {
    media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
      title {
        romaji
        english
      }
      status
      seasonYear
      startDate {
        year
        month
        day
      }
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
  }
}
"""


@dataclass
class AnimeResult:
    query: str
    title: str | None = None
    status: str | None = None
    season_year: int | None = None
    start_year: int | None = None
    start_month: int | None = None
    start_day: int | None = None
    episode: int | None = None
    time_until_airing: int | None = None
    error: str | None = None


def configure_stdout() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except (AttributeError, ValueError, OSError):
            pass


def load_anime_names(path: Path) -> list[str]:
    if not path.is_file():
        raise FileNotFoundError(f"Datei nicht gefunden: {path}")

    names: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            names.append(stripped)
    return names


def pick_title(title: dict | None) -> str | None:
    if not title:
        return None
    english = (title.get("english") or "").strip()
    romaji = (title.get("romaji") or "").strip()
    return english or romaji or None


def seconds_to_dhm(total_seconds: int) -> tuple[int, int, int]:
    if total_seconds < 0:
        total_seconds = 0
    days, remainder = divmod(total_seconds, 86_400)
    hours, remainder = divmod(remainder, 3_600)
    minutes, _ = divmod(remainder, 60)
    return days, hours, minutes


def format_date_hint(season_year: int | None, start_date: dict | None) -> str:
    if start_date:
        year = start_date.get("year")
        month = start_date.get("month")
        day = start_date.get("day")
        if year and month and day:
            return f"{day:02d}.{month:02d}.{year}"
        if year:
            return str(year)
    if season_year:
        return str(season_year)
    return "Unbekannt"


def search_anime(name: str) -> AnimeResult:
    payload = json.dumps({"query": SEARCH_QUERY, "variables": {"search": name}}).encode(
        "utf-8"
    )
    request = urllib.request.Request(
        ANILIST_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "anime-watchlist-countdown/1.0",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = json.load(response)
    except urllib.error.HTTPError as exc:
        return AnimeResult(query=name, error=f"HTTP {exc.code}: {exc.reason}")
    except urllib.error.URLError as exc:
        return AnimeResult(query=name, error=f"Netzwerkfehler: {exc.reason}")

    if body.get("errors"):
        message = body["errors"][0].get("message", "GraphQL-Fehler")
        return AnimeResult(query=name, error=message)

    media_list = body.get("data", {}).get("Page", {}).get("media") or []
    if not media_list:
        return AnimeResult(query=name, error="Kein Treffer bei AniList")

    media = media_list[0]
    next_ep = media.get("nextAiringEpisode") or {}
    start_date = media.get("startDate")

    return AnimeResult(
        query=name,
        title=pick_title(media.get("title")) or name,
        status=media.get("status"),
        season_year=media.get("seasonYear"),
        start_year=(start_date or {}).get("year"),
        start_month=(start_date or {}).get("month"),
        start_day=(start_date or {}).get("day"),
        episode=next_ep.get("episode"),
        time_until_airing=next_ep.get("timeUntilAiring"),
    )


def print_result(result: AnimeResult) -> None:
    display_name = result.title or result.query

    if result.error:
        print(f"❌ [{result.query}]: {result.error}")
        return

    if result.status != "RELEASING":
        date_hint = format_date_hint(
            result.season_year,
            {
                "year": result.start_year,
                "month": result.start_month,
                "day": result.start_day,
            },
        )
        status_label = result.status or "Unbekannt"
        print(
            f"📺 {display_name}: Läuft aktuell nicht "
            f"(Status: {status_label}, Datum/Jahr: {date_hint})"
        )
        return

    if result.time_until_airing is None or result.episode is None:
        date_hint = format_date_hint(
            result.season_year,
            {
                "year": result.start_year,
                "month": result.start_month,
                "day": result.start_day,
            },
        )
        print(
            f"⏸️  {display_name}: Status RELEASING, "
            f"aber keine nächste Folge bekannt (Jahr/Datum: {date_hint})"
        )
        return

    days, hours, minutes = seconds_to_dhm(int(result.time_until_airing))
    print(
        f"⏳ {display_name}: Folge {result.episode} erscheint in "
        f"{days} Tagen, {hours} Stunden und {minutes} Minuten"
    )


def main() -> int:
    configure_stdout()
    list_path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_LIST_FILE

    try:
        names = load_anime_names(list_path)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    if not names:
        print("Keine Anime-Namen in der Datei gefunden.", file=sys.stderr)
        return 1

    print(f"AniList Countdown – {len(names)} Anime, {REQUEST_DELAY_SEC}s Pause\n")

    for index, name in enumerate(names):
        print(f"[{index + 1}/{len(names)}] Suche: {name}")
        result = search_anime(name)
        print_result(result)
        print()

        if index < len(names) - 1:
            time.sleep(REQUEST_DELAY_SEC)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
