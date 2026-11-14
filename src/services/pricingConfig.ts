// services/pricingConfig.ts
import { DEFAULT_CONFIG, FareConfig } from "@/lib/fareCalculator";
import { firestore } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

let cachedConfig: FareConfig | null = null;

export async function loadPricingConfig(): Promise<FareConfig> {
  try {
    const snap = await getDoc(doc(firestore, "config", "pricing"));
    cachedConfig = snap.exists() ? (snap.data() as FareConfig) : DEFAULT_CONFIG;
    // alert(
    // //   "Pricing config loaded",
    //   "Successfully loaded pricing configuration from Firestore.",
    // );
  } catch (err) {
    console.warn("Failed to load pricing config, using defaults:", err);
    cachedConfig = DEFAULT_CONFIG;
  }
  return cachedConfig;
}

export function getPricingConfig(): FareConfig {
  return cachedConfig ?? DEFAULT_CONFIG;
}
