# Anime Watchlist

Gemeinsame Anime-To-Do-Liste für Freunde — mit Echtzeit-Sync über Supabase.

## Features

- Profil-Auswahl (Alex, Ben, Mia)
- Anime hinzufügen und Fortschritt tracken
- Checkboxen pro Freund mit Fortschrittsbalken
- Filter: Alle · Von mir gesehen · Ungesehen
- Live-Updates — Änderungen erscheinen bei allen sofort

## Lokal starten

1. Abhängigkeiten installieren:

```bash
npm install
```

2. `.env.local` anlegen (Vorlage: `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=https://dein-projekt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=dein_publishable_key
```

3. Dev-Server starten:

```bash
npm run dev
```

4. Im Browser öffnen: [http://localhost:3000](http://localhost:3000)

## Supabase einrichten

Das Schema liegt in `supabase/schema.sql`. Es erstellt die Tabelle `anime`, RLS-Policies und Realtime.

Alternativ im Supabase Dashboard: **SQL Editor** → Inhalt von `schema.sql` einfügen → **Run**.

## Mit Freunden teilen (Deploy)

1. Projekt auf [GitHub](https://github.com) pushen
2. Auf [vercel.com](https://vercel.com) importieren
3. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy → URL an Freunde schicken

Jeder öffnet den Link, wählt sein Profil — alle sehen dieselbe Liste.

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- Lucide Icons
- Supabase (Postgres + Realtime)

## Hinweis

Die App nutzt öffentliche RLS-Policies (kein Login). Jeder mit dem Link kann die Liste bearbeiten — für eine private Freundesgruppe ist das in der Regel ausreichend.
