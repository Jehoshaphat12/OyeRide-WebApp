
export interface LatLng {
  latitude: number;
  longitude: number;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export interface GeocodingResult {
  address_components: AddressComponent[];
  formatted_address: string;
  geometry: {
    location: LatLng;
    location_type: string;
    viewport: {
      northeast: LatLng;
      southwest: LatLng;
    };
  };
  place_id: string;
  types: string[];
}

export interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

export async function geocodeAddress(
  address: string,
): Promise<GeocodingResult[]> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodedAddress}` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Geocoding API error: ${data.status}`);
    }

    return data.results;
  } catch (error) {
    console.error("Geocoding error:", error);
    throw error;
  }
}

export async function reverseGeocode(
  location: LatLng,
): Promise<GeocodingResult[]> {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `latlng=${location.latitude},${location.longitude}` +
      `&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      throw new Error(`Reverse geocoding API error: ${data.status}`);
    }

    return data.results;
  } catch (error) {
    console.error("Reverse geocoding error:", error);
    throw error;
  }
}

export const getReadableLocationName = async (location: LatLng) => {
  try {
    // 1. First try Places API for nearby businesses/landmarks
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=100&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const placesData = await placesResponse.json();

    if (placesData.status === "OK" && placesData.results.length > 0) {
      const closestPlace = placesData.results[0];
      const placeVicinity = closestPlace.vicinity || "";
      const fullAddress = `${closestPlace.name}, ${placeVicinity}`;

      // Split by comma and take first two parts
      const parts = fullAddress.split(",");
      const trimmedAddress = parts.slice(0, 2).join(",").trim();
      if (parts.length >= 2) {
        return trimmedAddress;
      }

      return fullAddress;
    }

    // 2. Fallback to reverse geocoding
    return await getAddressFromLocation(location);
  } catch (error) {
    console.error("Location name error:", error);
    return await getAddressFromLocation(location);
  }
};

export async function getAddressFromLocation(
  location: LatLng,
): Promise<string> {
  try {
    const results = await reverseGeocode(location);

    if (results.length > 0) {
      // Try to get a readable address
      for (const result of results) {
        // Prefer street address
        if (result.types.includes("street_address")) {
          return result.formatted_address;
        }
      }

      // Fallback to first result
      return results[0].formatted_address;
    }

    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  } catch (error) {
    console.error("Get address error:", error);
    return `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
  }
}

export function parseAddressComponents(addressComponents: AddressComponent[]): {
  streetNumber?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
} {
  const result: any = {};

  for (const component of addressComponents) {
    if (component.types.includes("street_number")) {
      result.streetNumber = component.long_name;
    } else if (component.types.includes("route")) {
      result.street = component.long_name;
    } else if (component.types.includes("locality")) {
      result.city = component.long_name;
    } else if (component.types.includes("administrative_area_level_1")) {
      result.state = component.long_name;
    } else if (component.types.includes("country")) {
      result.country = component.long_name;
    } else if (component.types.includes("postal_code")) {
      result.postalCode = component.long_name;
    }
  }

  return result;
}
