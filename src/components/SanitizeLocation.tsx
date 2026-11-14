import { getReadableLocationName } from "@/services/geocoding";
import { LocationPoint } from "./FullLocationPicker";

export const sanitizeLocation = async (loc: LocationPoint): Promise<LocationPoint> => {
  // If address is already meaningful, return as-is
  if (loc.address && loc.address !== 'Current Location' && loc.address.trim() !== '') {
    return loc;
  }
  try {
    const readable = await getReadableLocationName({
      latitude: loc.latitude,
      longitude: loc.longitude,
    });
    return { ...loc, address: readable || 'Unknown Location' };
  } catch {
    // Fallback to the original address (or a placeholder)
    return { ...loc, address: loc.address || 'Unknown Location' };
  }
};