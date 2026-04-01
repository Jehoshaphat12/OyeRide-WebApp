export type VehicleType = 'motor' | 'delivery' | 'bicycle_delivery';

export interface SurgeInfo {
  multiplier: number;
  reason: string;
  label: string; // e.g. "1.3x", "Surge"
  isActive: boolean;
}

interface FareConfig {
  baseFare: number;
  tiers: { minDistance: number; maxDistance?: number; ratePerKm: number }[];
  vehicleTypeMultipliers: Record<VehicleType, number>;
}

const CONFIG: FareConfig = {
  baseFare: 3,
  tiers: [
    { minDistance: 0,  maxDistance: 5,  ratePerKm: 4  },
    { minDistance: 5,  maxDistance: 15, ratePerKm: 8  },
    { minDistance: 15, maxDistance: 30, ratePerKm: 15 },
    { minDistance: 30,                  ratePerKm: 20 },
  ],
  vehicleTypeMultipliers: { motor: 0.9, delivery: 0.98, bicycle_delivery: 0.55 },
};

// ─── Surge Pricing ────────────────────────────────────────────────────────────
export function calculateSurgeMultiplier(
  availableDrivers: number,
  activeRequests: number,
  isUrban: boolean,
): SurgeInfo {
  const hour = new Date().getHours();
  let multiplier = 1.0;
  const reasons: string[] = [];

  // Demand-based surge
  const ratio = availableDrivers / Math.max(activeRequests, 1);
  if (ratio < 0.3) {
    // multiplier *= 1.8;
    reasons.push('Very high demand');
  } else if (ratio < 0.6) {
    // multiplier *= 1.4;
    reasons.push('High demand');
  } else if (ratio < 1.0) {
    // multiplier *= 1.2;
    reasons.push('Busy area');
  }

  // Time-of-day surge
  const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  const isLateNight = hour >= 23 || hour <= 4;
  const isEarlyMorning = hour >= 5 && hour <= 6;
  if (isLateNight) {
    // multiplier *= 0.7;
    reasons.push('Late night');
  } else if (isRushHour) {
    // multiplier *= 0.6;
    reasons.push('Rush hour');
  } else if (isEarlyMorning) {
    // multiplier *= 0.5;
    reasons.push('Early morning');
  }

  // Location-based: rural areas get a slight premium for distance
  if (!isUrban) {
    multiplier *= 1.1;
    reasons.push('Rural area');
  }

  multiplier = Math.min(Math.round(multiplier * 10) / 10, 3.0);
  const isActive = multiplier > 1.05;

  return {
    multiplier,
    reason: reasons.join(' · ') || 'Normal pricing',
    label: isActive ? `${multiplier.toFixed(1)}x` : 'Normal',
    isActive,
  };
}

// Detect urban vs rural from coordinates using reverse-geocoding component types
export async function detectUrbanArea(lat: number, lng: number): Promise<boolean> {
  try {
    const key = (window as any).__GMAPS_KEY__ || '';
    if (!key || key === 'YOUR_GOOGLE_MAPS_API_KEY') return true; // default to urban
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${key}`,
    );
    const data = await res.json();
    if (data.status !== 'OK') return true;
    const types: string[] = data.results?.[0]?.types || [];
    // Rural indicators
    const ruralTypes = ['locality', 'sublocality', 'neighborhood'];
    const urbanTypes = ['administrative_area_level_2', 'administrative_area_level_1'];
    // Check if any result contains urban locality markers
    const allTypes = data.results.flatMap((r: any) => r.types);
    return allTypes.some((t: string) =>
      ['locality', 'sublocality', 'neighborhood', 'political', 'street_address', 'route'].includes(t),
    );
  } catch {
    return true; // default urban on error
  }
}

// ─── Fare Calculation ─────────────────────────────────────────────────────────
export function calculateFare(
  distanceInKm: number,
  vehicleType: VehicleType,
  surgeMultiplier = 1.0,
): {
  baseFare: number;
  distanceFare: number;
  surgeAmount: number;
  totalFare: number;
  breakdown: { description: string; amount: number }[];
} {
  let distanceFare = 0;
  let remaining = distanceInKm;

  for (const tier of CONFIG.tiers) {
    if (remaining <= 0) break;
    const km = tier.maxDistance
      ? Math.min(remaining, tier.maxDistance - tier.minDistance)
      : remaining;
    if (km > 0) {
      distanceFare += km * tier.ratePerKm;
      remaining -= km;
    }
  }

  distanceFare *= CONFIG.vehicleTypeMultipliers[vehicleType];
  const subtotal = CONFIG.baseFare + distanceFare;
  const surgeAmount = surgeMultiplier > 1 ? subtotal * (surgeMultiplier - 1) : 0;
  const totalFare = subtotal + surgeAmount;

  const breakdown = [
    { description: 'Base fare', amount: CONFIG.baseFare },
    { description: 'Distance fare', amount: distanceFare },
    ...(surgeAmount > 0 ? [{ description: `Surge (${surgeMultiplier.toFixed(1)}x)`, amount: surgeAmount }] : []),
  ];

  return {
    baseFare: CONFIG.baseFare,
    distanceFare,
    surgeAmount,
    totalFare,
    breakdown,
  };
}

export { CONFIG as FARE_CONFIG };
