"""Extract user.statistics.anime from AniList GDPR CSV."""
import csv
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8-sig") as f:
    row = next(csv.DictReader(f))
stats = json.loads(row["user.statistics"])
print(json.dumps(stats["anime"]))
