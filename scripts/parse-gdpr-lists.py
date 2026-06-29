"""Extract lists JSON from AniList GDPR CSV."""
import csv
import json
import sys

path = sys.argv[1]
with open(path, encoding="utf-8-sig") as f:
    row = next(csv.DictReader(f))
print(json.dumps(json.loads(row["lists"])))
