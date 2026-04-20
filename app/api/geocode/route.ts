import type { NextRequest } from "next/server";

// Nominatim usage policy requires a descriptive User-Agent with a way to
// reach the operator. We can't set User-Agent from the browser — hence
// this proxy. Replace the email with the real one before heavy use.
// See: https://operations.osmfoundation.org/policies/nominatim/
const USER_AGENT = "rute-til-gpx/1.0 (contact: changeme@example.com)";
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

// Cache geocode responses at the edge for 1 hour. Most queries repeat
// ("Aarhus H", "Nørrebro") and we want to lean on Vercel's CDN rather
// than hitting Nominatim every time.
const CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=7200";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  if (!q || q.trim().length < 1) {
    return new Response("[]", {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=60",
      },
    });
  }

  // Forward all incoming params transparently (q, limit, addressdetails,
  // countrycodes, ...). Default format=json so clients don't have to.
  const fwd = new URLSearchParams();
  for (const [k, v] of searchParams.entries()) fwd.set(k, v);
  if (!fwd.has("format")) fwd.set("format", "json");

  const url = `${NOMINATIM_URL}?${fwd.toString()}`;

  try {
    const upstream = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
    });
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: "Upstream error", status: upstream.status }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const body = await upstream.text();
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Geocode failed" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
