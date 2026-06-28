# Alle aus Supabase ausloggen / Gruppe zurücksetzen
# - Löscht alle members
# - Setzt member_statuses + watched_by auf allen Anime zurück
# Ausführen: powershell -ExecutionPolicy Bypass -File scripts/reset-group.ps1

$ErrorActionPreference = "Stop"

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
$lines = Get-Content $envFile
$baseUrl = ($lines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' }) -replace '^NEXT_PUBLIC_SUPABASE_URL=', ''
$apiKey = ($lines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' }) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=', ''

$readHeaders = @{
  apikey        = $apiKey
  Authorization = "Bearer $apiKey"
}

$writeHeaders = @{
  apikey         = $apiKey
  Authorization  = "Bearer $apiKey"
  "Content-Type" = "application/json"
  Prefer         = "return=minimal"
}

function Get-AllRows([string]$path) {
  @((Invoke-RestMethod -Uri "$baseUrl/rest/v1/$path" -Headers $readHeaders))
}

Write-Host "=== Gruppe zuruecksetzen ==="

$members = Get-AllRows "members?select=id,name"
Write-Host "Loesche $($members.Count) Mitglieder..."
foreach ($member in $members) {
  Invoke-RestMethod -Method Delete -Uri "$baseUrl/rest/v1/members?id=eq.$($member.id)" -Headers $writeHeaders | Out-Null
  Write-Host "  - $($member.name)"
}

$animeList = Get-AllRows "anime?select=id,title"
Write-Host "Setze Status auf $($animeList.Count) Anime zurueck..."
$clearBody = '{"member_statuses":{},"watched_by":[]}'

foreach ($anime in $animeList) {
  Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/anime?id=eq.$($anime.id)" -Headers $writeHeaders -Body $clearBody | Out-Null
  Write-Host "  - $($anime.title)"
}

Write-Host ""
Write-Host "Fertig. Alle muessen sich neu einloggen und Status neu setzen."
