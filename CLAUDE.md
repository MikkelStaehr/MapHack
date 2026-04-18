# Rute → GPX

Simpel webapp hvor brugeren kan tegne en cykelrute på et kort og downloade den som GPX-fil. Ingen backend, ingen persistering - alt sker i browseren. Deling sker via filoverførsel (fx Messenger/Signal), og modtagere kan uploade GPX-filen for at se ruten og re-downloade den til deres eget device (Wahoo/Garmin).

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`, ingen `tailwind.config.ts` - theme tokens defineres i `app/globals.css` med `@theme`)
- **Leaflet 1.9** + **CartoDB Voyager** tiles (OpenStreetMap)
- **OSRM** public demo server til cycling routing
- Deploys til **Vercel**

## Projektstruktur

```
app/
  layout.tsx          # Root layout, fonts (Archivo Black / Inter / JetBrains Mono)
  page.tsx            # State container - orchestrerer alt
  globals.css         # Tailwind 4 + theme tokens + Leaflet overrides
components/
  RouteMap.tsx        # Leaflet kort, click/draw mode, routing, markers, polyline
  Header.tsx          # Top bar med logo + stats
  ModeToggle.tsx      # Klik/Frihånd switch
  ActionsPanel.tsx    # Bund-panel: routing toggle, navn, undo/clear, upload/download
  Toast.tsx           # Toast, Hint, LoadingOverlay
lib/
  types.ts            # LatLng, Coord ([lat, lng] tuple), Mode
  gpx.ts              # buildGpx, parseGpx, sanitizeFilename
  geo.ts              # haversineKm, totalDistanceKm, fetchCyclingRoute (OSRM)
```

## Arkitektur

`app/page.tsx` holder al state (waypoints, routeCoords, mode, useRouting, routeName). `RouteMap` er en dynamisk (SSR-disabled) klientkomponent der tager state som props og rapporterer ændringer tilbage via callbacks. Leaflet-instansen og event handlers tilgår de seneste prop-værdier via refs (`modeRef`, `waypointsRef` osv.) for at undgå stale closures.

### Route building flow

**Klik-mode:** Bruger klikker på kortet → `onWaypointsChange` → `page.tsx` opdaterer `waypoints` → `RouteMap` ser ændringen og kalder enten `fetchCyclingRoute` (hvis `useRouting`) eller bygger lige linjer → rapporterer `routeCoords` tilbage via `onRouteChange`.

**Frihånd-mode:** `touchmove`/`mousemove` akkumulerer koordinater i en ref, og `onRouteChange` kaldes løbende med den voksende array. På `touchend` sættes `waypoints` til start- og slutpunkt.

### GPX

`parseGpx` understøtter `<trkpt>` (tracks), `<rtept>` (routes), `<wpt>` (waypoints) i prioriteret rækkefølge - dækker Strava, Komoot, RWGPS, Garmin, Wahoo.

`buildGpx` producerer GPX 1.1 med `<trk>` og `<trkseg>`. Filnavn saniteres med `sanitizeFilename` så danske tegn beholdes.

## Konventioner

- **Koordinat-rækkefølge:** Vi bruger `[lat, lng]` tuples (matcher Leaflet). OSRM og GeoJSON bruger `[lng, lat]` - flip sker i `fetchCyclingRoute`.
- **Mobile-first:** Touch events er primære, viewport er låst (`maximum-scale=1`), knapper har `active:scale-[0.97]`. Safe area på bunden via `env(safe-area-inset-bottom)`.
- **Dansk UI:** Al brugervendt tekst er på dansk. Kommentarer/kode er engelsk.
- **Design tokens:** Brug CSS-variabler (`var(--color-accent)` osv.), ikke hardcoded hex. Farverne er defineret i `@theme` blokken i `globals.css`.
- **Ingen external state lib:** Kun React state. Appen er simpel nok til at det ikke giver mening med Zustand/Redux.
- **Ingen persistering:** Vi gemmer intet på server, i localStorage eller sessionStorage. Alt er in-memory per session.

## Kommandoer

```bash
npm install
npm run dev          # localhost:3000
npm run build
npm run typecheck
```

## Kendte begrænsninger / next steps

- **OSRM public demo** har rate limits og bruger en generisk `cycling`-profil. Ved reel trafik bør vi swappe til BRouter (gratis, cykel-optimeret) eller self-hosted GraphHopper. Se `lib/geo.ts`.
- **Ingen højdedata** i GPX - vi kunne berige med elevation fra Open-Elevation API før download.
- **Ingen search:** Brugeren skal panne/zoome manuelt. Kunne udvides med en søgefelt (Nominatim).
- **Kortdata** er CartoDB Voyager - ikke cykel-specifik. Overvej OpenCycleMap hvis det bliver vigtigt.

## Deploy

Vercel: `vercel` fra rod, eller connect GitHub repo. Ingen environment variables nødvendige.
