// Generate a unique ID. crypto.randomUUID in modern browsers; falls back
// to timestamp + random suffix for older environments. Used for POI ids
// both when user places one on the map and when parsers reconstruct them
// from uploaded files.
export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
