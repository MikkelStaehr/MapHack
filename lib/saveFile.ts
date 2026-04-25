// On mobile (iOS Safari 15+, Chrome Android) we can use the Web Share API to
// hand a file off to whatever app the user picks in the system share sheet —
// Wahoo Fitness, Garmin Connect, Karoo Companion, Komoot, Files, etc. all
// register as handlers for .gpx/.tcx and show up automatically.
//
// Desktop browsers don't support file sharing, so we fall back to a classic
// anchor-triggered download. The cycling-app integration on desktop is
// "download then drag into the app's web portal" — same as today.

export type SaveResult = "shared" | "cancelled" | "downloaded";

export async function saveOrShareFile(
  content: string,
  filename: string,
  mime: string,
): Promise<SaveResult> {
  const blob = new Blob([content], { type: mime });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function"
  ) {
    const file = new File([blob], filename, { type: mime });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return "shared";
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return "cancelled";
        }
        // Anything else (permission denied, target app failed, ...)
        // — fall through to the download path.
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
