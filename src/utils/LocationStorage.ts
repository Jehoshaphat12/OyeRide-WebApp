const RECENT_KEY = "oye_recent_locations";

export interface RecentLocation {
  address: string;
  latitude: number;
  longitude: number;
}

export function saveRecentLocation(location: RecentLocation): void {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const existing: RecentLocation[] = raw ? JSON.parse(raw) : [];
    // Deduplicate by address, newest first, max 6
    const updated = [
      location,
      ...existing.filter((r) => r.address !== location.address),
    ].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore quota / private mode errors
  }
}

export function getRecentLocations(): RecentLocation[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}