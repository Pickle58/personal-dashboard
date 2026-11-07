import type { SavedLocation } from "@/lib/types";

export const LOCATION_STORAGE_KEY = "personal-dashboard:location";

export function validateLocation(value: unknown): SavedLocation | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.lat !== "number" || !Number.isFinite(item.lat)) return null;
  if (typeof item.lon !== "number" || !Number.isFinite(item.lon)) return null;
  if (item.lat < -90 || item.lat > 90) return null;
  if (item.lon < -180 || item.lon > 180) return null;

  const location: SavedLocation = { lat: item.lat, lon: item.lon };
  if (item.label === undefined) return location;
  if (typeof item.label !== "string" || item.label.length > 200) return null;
  if (item.label.length > 0) location.label = item.label;
  return location;
}

export function readStoredLocation(raw: string | null): SavedLocation | null {
  if (!raw) return null;
  try {
    return validateLocation(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function fetchLocation(): Promise<
  { ok: true; location: SavedLocation | null } | { ok: false; error: string }
> {
  try {
    const response = await fetch("/api/location", { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, error: "Couldn't load your saved place." };
    }
    const body = (await response.json()) as unknown;
    if (body === null) return { ok: true, location: null };
    const location = validateLocation(body);
    if (!location) return { ok: false, error: "Couldn't load your saved place." };
    return { ok: true, location };
  } catch {
    return { ok: false, error: "Couldn't load your saved place." };
  }
}

export async function saveLocation(
  location: SavedLocation
): Promise<{ ok: true } | { ok: false }> {
  try {
    const response = await fetch("/api/location", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(location),
    });
    return response.ok ? { ok: true } : { ok: false };
  } catch {
    return { ok: false };
  }
}
