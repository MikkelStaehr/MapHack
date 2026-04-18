# Rute → GPX

Tegn en cykelrute på kortet og download som GPX-fil. Ingen login, ingen lagring - alt sker i browseren.

Lavet til en cykelgruppe der deler ruter ved at sende GPX-filer i en chat.

## Features

- **Klik-mode:** Sæt waypoints og få automatisk routing via OSRM (cykelvenlige veje)
- **Frihånd-mode:** Tegn ruten direkte med fingeren (god til skovstier / grusveje)
- **Upload GPX:** Modtag en fil fra en anden og se ruten på kortet
- **Download GPX:** Kompatibel med Wahoo, Garmin, Komoot, Strava, RWGPS
- **Følg veje toggle:** Slå routing fra hvis du hellere vil have lige linjer
- **Mobile-first:** Designet til at bruge på telefonen

## Development

```bash
npm install
npm run dev
```

Åbn [http://localhost:3000](http://localhost:3000).

## Deploy

Connect repo til Vercel - det virker out of the box uden miljøvariabler.

```bash
vercel
```

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Leaflet · OSRM
