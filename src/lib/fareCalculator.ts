// 📁 src/lib/pricing/fareCalculator.ts (Web)

import { getPricingConfig } from "@/services/pricingConfig";

// ─── Types ──────────────────────────────────────────────────────────────────
export type VehicleType =
  | "motor"
  | "delivery"
  | "bicycle_delivery"
  | "gas_refill";

export interface SurgeInfo {
  multiplier: number;
  reason: string;
  label: string;
  isActive: boolean;
}

export interface FareTier {
  minDistance: number;
  maxDistance?: number | null;
  ratePerKm: number;
}

export interface TimePeriod {
  from: number;
  to: number;
}

export interface TimeOfDayRule {
  multiplier: number;
  periods: TimePeriod[];
}

export interface SurgeConfig {
  demandThresholds: { veryHigh: number; high: number; busy: number };
  demandMultipliers: { veryHigh: number; high: number; busy: number };
  timeOfDay: {
    rushHour: TimeOfDayRule;
    lateNight: TimeOfDayRule;
    earlyMorning: TimeOfDayRule;
  };
  ruralPremium: number;
  maxMultiplier: number;
}

export interface FareConfig {
  baseFare: number;
  tiers: FareTier[];
  vehicleTypeMultipliers: Record<VehicleType, number>;
  packageSurcharge: { weight: number; dimensions: number };
  surge: SurgeConfig;
  minimumFare: number;
}

// ─── Default / fallback config (used until Firestore data loads) ─────────────
export const DEFAULT_CONFIG: FareConfig = {
  baseFare: 3,
  tiers: [
    { minDistance: 0, maxDistance: 1.5, ratePerKm: 3 },
    { minDistance: 1.5, maxDistance: 5, ratePerKm: 4.5 },
    { minDistance: 5, maxDistance: 6, ratePerKm: 5 },
    { minDistance: 5, maxDistance: 15, ratePerKm: 7.5 },
    { minDistance: 15, maxDistance: 30, ratePerKm: 5 },
    { minDistance: 30, maxDistance: null, ratePerKm: 2.5 },
  ],
  vehicleTypeMultipliers: {
    motor: 1,
    delivery: 0.95,
    bicycle_delivery: 0.65,
    gas_refill: 1.1, // slight premium for the double‑trip service
  },
  packageSurcharge: { weight: 5, dimensions: 10 },
  surge: {
    demandThresholds: { veryHigh: 0, high: 0, busy: 0 },
    demandMultipliers: { veryHigh: 0, high: 0, busy: 0 },
    timeOfDay: {
      rushHour: {
        multiplier: 1,
        periods: [
          { from: 7, to: 9 },
          { from: 17, to: 19 },
        ],
      },
      lateNight: {
        multiplier: 1,
        periods: [
          { from: 23, to: 24 },
          { from: 0, to: 4 },
        ],
      },
      earlyMorning: { multiplier: 1, periods: [{ from: 5, to: 6 }] },
    },
    ruralPremium: 1,
    maxMultiplier: 0,
  },
  minimumFare: 5,
};

// ─── Helpers ───────────────────────────────────────────────────────────────
function isInPeriod(hour: number, periods: TimePeriod[]): boolean {
  return periods.some((p) => hour >= p.from && hour <= p.to);
}

// ─── Surge Pricing ─────────────────────────────────────────────────────────
/**
 * Calculate the surge multiplier based on driver supply/demand,
 * time of day, and urban/rural area.
 */
export function calculateSurgeMultiplier(
  availableDrivers: number,
  activeRequests: number,
  isUrban: boolean = true,
  config: FareConfig = getPricingConfig(),
): SurgeInfo {
  let multiplier = 1.0;
  const reasons: string[] = [];
  const hour = new Date().getHours();
  const { surge } = config;

  const ratio = availableDrivers / Math.max(activeRequests, 1);

  if (ratio < surge.demandThresholds.veryHigh) {
    multiplier *= surge.demandMultipliers.veryHigh;
    reasons.push("Very high demand");
  } else if (ratio < surge.demandThresholds.high) {
    multiplier *= surge.demandMultipliers.high;
    reasons.push("High demand");
  } else if (ratio < surge.demandThresholds.busy) {
    multiplier *= surge.demandMultipliers.busy;
    reasons.push("Busy area");
  }

  const isLateNight = isInPeriod(hour, surge.timeOfDay.lateNight.periods);
  const isRushHour = isInPeriod(hour, surge.timeOfDay.rushHour.periods);
  const isEarlyMorning = isInPeriod(hour, surge.timeOfDay.earlyMorning.periods);

  if (isLateNight) {
    multiplier *= surge.timeOfDay.lateNight.multiplier;
    reasons.push("Late night");
  } else if (isRushHour) {
    multiplier *= surge.timeOfDay.rushHour.multiplier;
    reasons.push("Rush hour");
  } else if (isEarlyMorning) {
    multiplier *= surge.timeOfDay.earlyMorning.multiplier;
    reasons.push("Early morning");
  }

  if (!isUrban) {
    multiplier *= surge.ruralPremium;
    reasons.push("Rural area");
  }

  multiplier = Math.min(Math.round(multiplier * 10) / 10, surge.maxMultiplier);
  const isActive = multiplier > 1.05;

  return {
    multiplier,
    reason: reasons.join(" · ") || "Normal pricing",
    label: isActive ? `${multiplier.toFixed(1)}x` : "Normal",
    isActive,
  };
}

// ─── Core Fare Calculation ────────────────────────────────────────────────
export function calculateFare(
  distanceInKm: number,
  vehicleType: VehicleType,
  surgeMultiplier: number = 1.0,
  packageDetails?: {
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
  },
  config: FareConfig = getPricingConfig(),
) {
  const breakdown: { description: string; amount: number }[] = [];

  // Distance fare (tiered rates)
  let distanceFare = 0;
  let remaining = distanceInKm;
  for (const tier of config.tiers) {
    if (remaining <= 0) break;
    const tierSize = tier.maxDistance
      ? tier.maxDistance - tier.minDistance
      : Infinity;
    const km = Math.min(remaining, tierSize);
    if (km > 0) {
      const tierFare = km * tier.ratePerKm;
      distanceFare += tierFare;
      breakdown.push({
        description: `Distance ${tier.minDistance}–${tier.maxDistance ?? "∞"} km`,
        amount: tierFare,
      });
      remaining -= km;
    }
  }

  distanceFare *= config.vehicleTypeMultipliers[vehicleType];

  // Package surcharge (delivery only)
  let packageSurcharge = 0;
  if (
    (vehicleType === "delivery" || vehicleType === "bicycle_delivery") &&
    packageDetails
  ) {
    if (packageDetails.weight) {
      const wc = packageDetails.weight * config.packageSurcharge.weight;
      packageSurcharge += wc;
      breakdown.push({ description: "Weight surcharge", amount: wc });
    }
    if (packageDetails.dimensions) {
      const vol =
        packageDetails.dimensions.length *
        packageDetails.dimensions.width *
        packageDetails.dimensions.height;
      const dc = vol * config.packageSurcharge.dimensions;
      packageSurcharge += dc;
      breakdown.push({ description: "Dimension surcharge", amount: dc });
    }
  }

  // Subtotal & surge
  const subtotal = config.baseFare + distanceFare + packageSurcharge;
  const surgeAmount =
    surgeMultiplier > 1 ? subtotal * (surgeMultiplier - 1) : 0;
  let totalFare = subtotal + surgeAmount;

  breakdown.unshift(
    { description: "Base fare", amount: config.baseFare },
    { description: "Distance fare", amount: distanceFare },
  );
  if (surgeAmount > 0) {
    breakdown.push({
      description: `Surge (${surgeMultiplier.toFixed(1)}×)`,
      amount: surgeAmount,
    });
  }

  // Minimum fare
  const minimumFare = config.minimumFare ?? 5;
  if (totalFare < minimumFare) {
    const adjustment = minimumFare - totalFare;
    breakdown.push({ description: "Minimum fare adjustment", amount: adjustment });
    totalFare = minimumFare;
  }

  return {
    baseFare: config.baseFare,
    distanceFare,
    surgeAmount,
    packageSurcharge,
    totalFare,
    breakdown,
  };
}

// ─── Legacy shim ──────────────────────────────────────────────────────────
export function calculateDynamicMultiplier(
  availableDrivers: number,
  rideRequests: number,
  timeOfDay: Date,
): number {
  return calculateSurgeMultiplier(availableDrivers, rideRequests, true).multiplier;
}

// ─── Gas Refill Pricing ───────────────────────────────────────────────────
export const GAS_REFILL_CONFIG = {
  waitingFlatFee: 5, // GHS – covers up to 20 min wait at station
  cylinderServiceFee: {
    small: 2, // ~6 kg
    large: 3, // ~12 kg
  },
  waitingPerMinuteAfter: 0.5, // per minute after 20‑min allowance
};

/**
 * Calculate gas refill service fare.
 * The rider does 2 legs (user → station → user).
 * No surge applied — keep the service affordable.
 */
export function calculateGasRefillFare(
  distanceUserToStation: number,
  distanceStationToUser: number,
  cylinderSize: "small" | "large" = "small",
  config: FareConfig = getPricingConfig(),
) {
  const breakdown: { description: string; amount: number }[] = [];

  // Leg 1: user → gas station (base + distance)
  const leg1 = calculateFare(distanceUserToStation, "motor", 1.0, undefined, config);
  const leg1Fare = leg1.baseFare + leg1.distanceFare;
  breakdown.push({ description: "Pickup (user → station)", amount: leg1Fare });

  // Leg 2: gas station → user (distance only, no second base)
  const leg2 = calculateFare(distanceStationToUser, "motor", 1.0, undefined, config);
  const leg2Fare = leg2.distanceFare;
  breakdown.push({ description: "Return (station → user)", amount: leg2Fare });

  // Flat waiting fee
  const waitingFee = GAS_REFILL_CONFIG.waitingFlatFee;
  breakdown.push({
    description: "Waiting allowance (20 min)",
    amount: waitingFee,
  });

  // Cylinder service fee
  const serviceFee = GAS_REFILL_CONFIG.cylinderServiceFee[cylinderSize];
  breakdown.push({
    description: `${cylinderSize === "small" ? "Small (~6kg)" : "Large (~12kg)"} cylinder fee`,
    amount: serviceFee,
  });

  const totalFare = parseFloat(
    (leg1Fare + leg2Fare + waitingFee + serviceFee).toFixed(2),
  );

  return { leg1Fare, leg2Fare, waitingFee, serviceFee, totalFare, breakdown };
}