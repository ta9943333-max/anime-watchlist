$ErrorActionPreference = "Stop"

$envFile = Join-Path (Join-Path $PSScriptRoot "..") ".env.local"
$lines = Get-Content $envFile
$baseUrl = ($lines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_URL=' }) -replace '^NEXT_PUBLIC_SUPABASE_URL=', ''
$apiKey = ($lines | Where-Object { $_ -match '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' }) -replace '^NEXT_PUBLIC_SUPABASE_ANON_KEY=', ''

$headers = @{
  apikey        = $apiKey
  Authorization = "Bearer $apiKey"
  "Content-Type" = "application/json"
  Prefer        = "return=representation"
}

function Get-AllRows([string]$path) {
  @((Invoke-RestMethod -Uri "$baseUrl/rest/v1/$path" -Headers @{
    apikey        = $apiKey
    Authorization = "Bearer $apiKey"
  }))
}

function Convert-MemberStatuses($raw) {
  if (-not $raw) { return @{} }

  $result = @{}
  foreach ($prop in $raw.PSObject.Properties) {
    $value = $prop.Value
    if ($value -is [string]) {
      $result[$prop.Name] = @{
        status    = $value
        updatedAt = "1970-01-01T00:00:00.000Z"
      }
    }
    elseif ($value.status) {
      $result[$prop.Name] = @{
        status    = $value.status
        updatedAt = if ($value.updatedAt) { $value.updatedAt } else { "1970-01-01T00:00:00.000Z" }
      }
    }
  }
  return $result
}

function Parse-MalDuration([string]$duration, $episodes) {
  if (-not $duration) {
    return @{ episodeDurationMin = $null; totalDurationMin = $null }
  }

  if ($duration -match '(\d+)\s*min per ep' -and $episodes) {
    $epMin = [int]$Matches[1]
    return @{
      episodeDurationMin = $epMin
      totalDurationMin   = $epMin * [int]$episodes
    }
  }

  if ($duration -match '(?:(\d+)\s*hr)?\s*(?:(\d+)\s*min)?') {
    $hours = if ($Matches[1]) { [int]$Matches[1] } else { 0 }
    $mins = if ($Matches[2]) { [int]$Matches[2] } else { 0 }
    $total = $hours * 60 + $mins
    if ($total -gt 0) {
      return @{ episodeDurationMin = $total; totalDurationMin = $total }
    }
  }

  if ($duration -match '(\d+)\s*min') {
    $total = [int]$Matches[1]
    return @{ episodeDurationMin = $total; totalDurationMin = $total }
  }

  return @{ episodeDurationMin = $null; totalDurationMin = $null }
}

Write-Host "Fetching anime..."
$animeList = Get-AllRows "anime?select=id,title,member_statuses,watched_by,mal_id,total_duration_min"

$statusFixed = 0
$malFixed = 0

foreach ($anime in $animeList) {
  $needsStatusFix = $false
  if ($anime.member_statuses) {
    foreach ($prop in $anime.member_statuses.PSObject.Properties) {
      if ($prop.Value -is [string]) {
        $needsStatusFix = $true
        break
      }
    }
  }

  if ($needsStatusFix) {
    $converted = Convert-MemberStatuses $anime.member_statuses
    $watchedBy = @($converted.GetEnumerator() | Where-Object {
      $_.Value.status -in @("completed", "rewatching")
    } | ForEach-Object { $_.Key })

    $body = @{
      member_statuses = $converted
      watched_by      = $watchedBy
    } | ConvertTo-Json -Depth 6

    Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/anime?id=eq.$($anime.id)" -Headers $headers -Body $body | Out-Null
    Write-Host "  [status] $($anime.title)"
    $statusFixed++
  }

  if (-not $anime.total_duration_min) {
    Start-Sleep -Milliseconds 500
    $query = [uri]::EscapeDataString($anime.title)
    $jikan = Invoke-RestMethod -Uri "https://api.jikan.moe/v4/anime?q=$query&limit=5"

    $match = $null
    foreach ($item in $jikan.data) {
      if ($item.title -eq $anime.title -or $item.title -like "*$($anime.title)*") {
        $match = $item
        break
      }
    }
    if (-not $match -and $jikan.data.Count -gt 0) {
      $match = $jikan.data[0]
    }

    if ($match) {
      $duration = Parse-MalDuration $match.duration $match.episodes
      $genres = @($match.genres | ForEach-Object { $_.name })

      $malBody = @{
        mal_id                 = $match.mal_id
        episodes               = $match.episodes
        episode_duration_min   = $duration.episodeDurationMin
        total_duration_min     = $duration.totalDurationMin
        genres                 = $genres
      } | ConvertTo-Json -Depth 4

      Invoke-RestMethod -Method Patch -Uri "$baseUrl/rest/v1/anime?id=eq.$($anime.id)" -Headers $headers -Body $malBody | Out-Null
      Write-Host "  [mal] $($anime.title) -> $($match.title) ($($duration.totalDurationMin) min)"
      $malFixed++
    }
    else {
      Write-Host "  [mal skip] $($anime.title) - no Jikan match"
    }

    Start-Sleep -Milliseconds 400
  }
}

Write-Host ""
Write-Host "Done. Status fixed: $statusFixed | MAL enriched: $malFixed / $($animeList.Count)"
