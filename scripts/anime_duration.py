#!/usr/bin/env python3
"""
Durchsucht MyAnimeList über die kostenlose Jikan API (v4, kein API-Key)
und berechnet die Gesamtlaufzeit einer Anime-Liste in Stunden.

Rate-Limit: 1 Sekunde Pause zwischen Anfragen.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path

JIKAN_BASE = "https://api.jikan.moe/v4/anime"
REQUEST_DELAY_SEC = 1

# Anime-Namen hier eintragen oder per Datei übergeben (siehe --file)
ANIME_NAMES = [
    "Attack on Titan",
    "Steins;Gate",
    "Frieren: Beyond Journey's End",
    "Death Note",
    "Fullmetal Alchemist: Brotherhood",
]


@dataclass
class AnimeDurationResult:
    query: str
    title: str | None
    mal_id: int | None
    episodes: int | None
    episode_duration_min: float | None
    total_duration_min: float | None
    total_hours: float | None
    error: str | None = None


def parse_mal_duration(
    duration: str | None,
    episodes: int | None,
) -> tuple[float | None, float | None]:
    """Parst Jikan-Dauerstrings wie '24 min per ep' oder '1 hr 30 min'."""
    if not duration:
        return None, None

    per_ep = re.search(r"(\d+)\s*min per ep", duration, re.IGNORECASE)
    if per_ep and episodes:
        episode_min = float(per_ep.group(1))
        return episode_min, episode_min * episodes

    hr_min = re.search(r"(?:(\d+)\s*hr)?\s*(?:(\d+)\s*min)?", duration, re.IGNORECASE)
    if hr_min:
        hours = float(hr_min.group(1) or 0)
        mins = float(hr_min.group(2) or 0)
        total = hours * 60 + mins
        if total > 0:
            return total, total

    min_only = re.search(r"(\d+)\s*min", duration, re.IGNORECASE)
    if min_only:
        total = float(min_only.group(1))
        return total, total

    return None, None


def search_anime(query: str) -> dict | None:
    params = urllib.parse.urlencode({"q": query.strip(), "limit": 1})
    url = f"{JIKAN_BASE}?{params}"
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "anime-watchlist-duration-script/1.0"},
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.load(response)

    data = payload.get("data") or []
    return data[0] if data else None


def fetch_duration(query: str) -> AnimeDurationResult:
    try:
        anime = search_anime(query)
    except urllib.error.HTTPError as exc:
        return AnimeDurationResult(
            query=query,
            title=None,
            mal_id=None,
            episodes=None,
            episode_duration_min=None,
            total_duration_min=None,
            total_hours=None,
            error=f"HTTP {exc.code}: {exc.reason}",
        )
    except urllib.error.URLError as exc:
        return AnimeDurationResult(
            query=query,
            title=None,
            mal_id=None,
            episodes=None,
            episode_duration_min=None,
            total_duration_min=None,
            total_hours=None,
            error=f"Netzwerkfehler: {exc.reason}",
        )

    if anime is None:
        return AnimeDurationResult(
            query=query,
            title=None,
            mal_id=None,
            episodes=None,
            episode_duration_min=None,
            total_duration_min=None,
            total_hours=None,
            error="Kein Treffer gefunden",
        )

    episodes = anime.get("episodes")
    episode_min, total_min = parse_mal_duration(anime.get("duration"), episodes)
    total_hours = round(total_min / 60, 2) if total_min is not None else None

    return AnimeDurationResult(
        query=query,
        title=anime.get("title"),
        mal_id=anime.get("mal_id"),
        episodes=episodes,
        episode_duration_min=episode_min,
        total_duration_min=total_min,
        total_hours=total_hours,
    )


def load_names_from_file(path: Path) -> list[str]:
    names: list[str] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            names.append(stripped)
    return names


def format_minutes(minutes: float | None) -> str:
    if minutes is None:
        return "—"
    return f"{minutes:.0f} min"


def print_results(results: list[AnimeDurationResult]) -> None:
    print()
    print(f"{'Suchbegriff':<35} {'Treffer':<35} {'Ep.':>5} {'Gesamt':>12} {'Stunden':>8}")
    print("-" * 100)

    total_hours_sum = 0.0
    known_count = 0

    for result in results:
        if result.error:
            print(
                f"{result.query:<35} {'—':<35} {'—':>5} {'—':>12} {'—':>8}  "
                f"({result.error})"
            )
            continue

        episodes = str(result.episodes) if result.episodes is not None else "?"
        total = format_minutes(result.total_duration_min)
        hours = f"{result.total_hours:.2f}" if result.total_hours is not None else "—"
        title = (result.title or "—")[:35]

        print(
            f"{result.query:<35} {title:<35} {episodes:>5} {total:>12} {hours:>8}"
        )

        if result.total_hours is not None:
            total_hours_sum += result.total_hours
            known_count += 1

    print("-" * 100)
    print(
        f"Summe ({known_count} Anime mit Laufzeit): "
        f"{total_hours_sum:.2f} Stunden ({total_hours_sum / 24:.2f} Tage)"
    )


def main() -> int:
    names = list(ANIME_NAMES)

    if len(sys.argv) >= 2 and sys.argv[1] == "--file":
        if len(sys.argv) < 3:
            print("Verwendung: python anime_duration.py --file pfad/zur/liste.txt")
            return 1
        file_path = Path(sys.argv[2])
        if not file_path.is_file():
            print(f"Datei nicht gefunden: {file_path}")
            return 1
        names = load_names_from_file(file_path)
    elif len(sys.argv) > 1:
        names = sys.argv[1:]

    if not names:
        print("Keine Anime-Namen angegeben.")
        return 1

    print(f"Jikan API – {len(names)} Anime, {REQUEST_DELAY_SEC}s Pause pro Anfrage\n")

    results: list[AnimeDurationResult] = []
    for index, name in enumerate(names):
        print(f"[{index + 1}/{len(names)}] Suche: {name} …")
        results.append(fetch_duration(name))

        if index < len(names) - 1:
            time.sleep(REQUEST_DELAY_SEC)

    print_results(results)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
