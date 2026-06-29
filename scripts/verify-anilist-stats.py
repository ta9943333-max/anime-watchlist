"""Verify AniList statistics match CSV."""
import csv
import json
import ssl
import urllib.request

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

path = r"c:\Users\rcrdh\Downloads\gdpr_data.csv"
with open(path, encoding="utf-8-sig") as f:
    row = next(csv.DictReader(f))
lists = json.loads(row["lists"])
stats = json.loads(row["user.statistics"])

ids = list({e["series_id"] for e in lists})
media_by_id = {}

for i in range(0, len(ids), 50):
    batch = ids[i : i + 50]
    query = """
    query ($ids: [Int], $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(id_in: $ids, type: ANIME) { id episodes duration }
      }
    }
    """
    body = json.dumps({"query": query, "variables": {"ids": batch, "perPage": len(batch)}}).encode()
    req = urllib.request.Request(
        "https://graphql.anilist.co",
        data=body,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        data = json.loads(resp.read())
    for m in data["data"]["Page"]["media"]:
        media_by_id[m["id"]] = m

progress_sum = sum(e.get("progress") or 0 for e in lists)
minutes_progress_x_duration = 0
minutes_completed_full = 0
completed_entries = 0
counting_entries = 0

for e in lists:
    m = media_by_id.get(e["series_id"])
    progress = e.get("progress") or 0
    if m and m.get("duration"):
        minutes_progress_x_duration += progress * m["duration"]
    status = e["status"]
    if status == 2:
        completed_entries += 1
        if m and m.get("duration"):
            eps = m.get("episodes") or progress
            minutes_completed_full += eps * m["duration"]
    if status in (2, 6):
        counting_entries += 1

print("CSV statistics:", stats["anime"])
print("sum(progress):", progress_sum)
print("sum(progress*duration):", minutes_progress_x_duration)
print("completed status count:", completed_entries)
print("completed+repeating:", counting_entries)
print("completed full runtime sum:", minutes_completed_full)
