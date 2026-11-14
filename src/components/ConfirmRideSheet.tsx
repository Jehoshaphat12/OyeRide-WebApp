import React from "react";
import { VehicleType } from "../types";
import { Icon, IconName } from "./Icons";
import { motion } from "framer-motion";

// ── Vehicle labels & icons (for non‑gas rides) ──────────────────────────────
const VEHICLE_LABELS: Record<VehicleType, { label: string; icon: IconName }> = {
  motor: { label: "OyeRide", icon: "motorcycle" },
  delivery: { label: "OyeDeliver", icon: "box" },
  bicycle_delivery: { label: "OyeBicycle", icon: "bicycle" },
};

interface Props {
  pickup: { latitude: number; longitude: number; address: string };
  destination: { latitude: number; longitude: number; address: string };
  vehicleType: VehicleType;
  fare: {
    totalFare: number;
    baseFare: number;
    distanceFare: number;
    surgeAmount?: number;
  };
  routeData: { distance: number; duration: number };
  onConfirm: () => void;
  onBack: () => void;
  isLoading: boolean;
  promoDiscount?: number;      // e.g. 0.10 = 10% off
  // ── Gas refill specific ─────────────────────────────────────────────────
  isGasRefill?: boolean;
  rideTitle?: string;               // displayed instead of vehicle label
  destinationLabel?: string;        // e.g. "Shell → Return"
  gasFareBreakdown?: { description: string; amount: number }[];
}

export default function ConfirmRideSheet({
  pickup,
  destination,
  vehicleType,
  fare,
  routeData,
  onConfirm,
  onBack,
  isLoading,
  promoDiscount = 0,
  isGasRefill = false,
  rideTitle,
  destinationLabel,
  gasFareBreakdown,
}: Props) {
  // Choose display values
  const vehicleData = VEHICLE_LABELS[vehicleType];
  const displayTitle = isGasRefill
    ? rideTitle || "Gas Refill"
    : vehicleData.label;
  const displayIcon: IconName = isGasRefill ? "flame-outline" : vehicleData.icon;
  const displayDestination = isGasRefill
    ? destinationLabel || destination.address
    : destination.address;

  // Price calculations
  const discountAmount = promoDiscount > 0 && !isGasRefill
    ? fare.totalFare * promoDiscount
    : 0;
  const finalFare = isGasRefill
    ? fare.totalFare          // no promo on gas refill; total is already final
    : fare.totalFare - discountAmount;

  return (
    <>
      {/* Draggable sheet */}
      <motion.div
        drag="y"
        dragConstraints={{ top: -30, bottom: 250 }}
        dragElastic={0.1}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        style={styles.sheet}
      >
        <div style={{ width: "100%", padding: "12px 0", cursor: "grab" }}>
          <div style={styles.handle} />
        </div>

        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onBack}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
          </button>
          <h3 style={styles.title}>Confirm Ride</h3>
          <div style={{ width: 36 }} />
        </div>

        {/* Vehicle / service row */}
        <div style={styles.vehicleRow}>
          <div style={styles.vehicleEmoji}>
            <Icon name={displayIcon} size={26} color="#061ffa" strokeWidth={1.5} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.vehicleName}>{displayTitle}</div>
            <div style={styles.vehicleDetail}>
              {routeData.distance.toFixed(1)} km · ~
              {Math.round(routeData.duration)} min
            </div>
          </div>
          <div style={styles.fareAmount}>
            {!isGasRefill && discountAmount > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "end" }}>
                <span style={{ fontWeight: 700, fontSize: 22 }}>
                  ₵ {finalFare.toFixed(2)}
                </span>
                <span style={{
                  fontWeight: 600,
                  textDecoration: "line-through",
                  color: "#aaa",
                  fontSize: 18,
                }}>
                  ₵ {fare.totalFare.toFixed(2)}
                </span>
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 22 }}>
                GH₵ {finalFare.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Route card */}
        <div style={styles.routeCard}>
          <div style={styles.routeRow}>
            <div style={{ ...styles.routeDot, background: "#061ffa" }} />
            <div style={styles.routeTexts}>
              <div style={styles.routeLabel}>Pickup</div>
              <div style={styles.routeAddress}>{pickup.address}</div>
            </div>
          </div>
          <div style={styles.routeVertical} />
          <div style={styles.routeRow}>
            <div style={{ ...styles.routeDot, background: "#ff7300" }} />
            <div style={styles.routeTexts}>
              <div style={styles.routeLabel}>Destination</div>
              <div style={styles.routeAddress}>{displayDestination}</div>
            </div>
          </div>
        </div>

        {/* Fare breakdown */}
        {isGasRefill && gasFareBreakdown ? (
          <div style={styles.fareCard}>
            {/* {gasFareBreakdown.map((item, idx) => (
              <div key={idx} style={styles.fareRow}>
                <span style={styles.fareKey}>{item.description}</span>
                <span style={styles.fareVal}>GH₵ {item.amount.toFixed(2)}</span>
              </div>
            ))} */}
            <div style={styles.fareDivider} />
            <div style={styles.fareRow}>
              <span style={{ ...styles.fareKey, fontWeight: 700, color: "#333" }}>
                Total
              </span>
              <span style={{ ...styles.fareVal, fontWeight: 700, color: "#061ffa", fontSize: 17 }}>
                GH₵ {finalFare.toFixed(2)}
              </span>
            </div>
          </div>
        ) : (
          <div style={styles.fareCard}>
            <div style={styles.fareRow}>
              <span style={styles.fareKey}>Base Fare</span>
              <span style={styles.fareVal}>GH₵ {fare.baseFare.toFixed(2)}</span>
            </div>
            <div style={styles.fareRow}>
              <span style={styles.fareKey}>Distance Fare</span>
              <span style={styles.fareVal}>GH₵ {fare.distanceFare.toFixed(2)}</span>
            </div>
            {(fare as any).surgeAmount > 0 && (
              <div style={styles.fareRow}>
                <span style={{ ...styles.fareKey, color: "#e65100" }}>
                  Surge Pricing
                </span>
                <span style={{ ...styles.fareVal, color: "#e65100" }}>
                  + GH₵ {(fare as any).surgeAmount.toFixed(2)}
                </span>
              </div>
            )}
            {discountAmount > 0 && (
              <div style={{
                ...styles.fareRow,
                background: "#f0fff4",
                borderRadius: 8,
                padding: "6px 8px",
                margin: "2px -8px",
              }}>
                <span style={{ ...styles.fareKey, color: "#2e7d32", fontWeight: 700 }}>
                  🎉 New Rider 10% Off
                </span>
                <span style={{ ...styles.fareVal, color: "#2e7d32", fontWeight: 700 }}>
                  - GH₵ {discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div style={styles.fareDivider} />
            <div style={styles.fareRow}>
              <span style={{ ...styles.fareKey, fontWeight: 700, color: "#333" }}>
                Total
              </span>
              <span style={{
                ...styles.fareVal,
                fontWeight: 700,
                color: "#061ffa",
                fontSize: 17,
              }}>
                GH₵ {finalFare.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Payment */}
        <div style={styles.paymentRow}>
          <Icon name="cash" size={20} color="#ff7300" />
          <span style={styles.paymentLabel}>Cash</span>
        </div>
      </motion.div>

      {/* Fixed confirm button */}
      <div style={styles.footer}>
        <button
          style={{
            ...styles.confirmBtn,
            ...(isLoading ? styles.btnDisabled : {}),
          }}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span style={styles.spinner} /> Finding a driver...
            </>
          ) : isGasRefill ? (
            "Confirm Gas Refill"
          ) : (
            "Confirm Booking"
          )}
        </button>
      </div>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "white",
    borderRadius: "24px 24px 0 0",
    padding: "12px 20px 32px",
    boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
    zIndex: 300,
    maxHeight: "85%",
    overflowY: "auto",
    animation: "slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)",
  },
  handle: {
    width: 40,
    height: 4,
    background: "#ddd",
    borderRadius: 2,
    margin: "0 auto 16px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: "#f0f0f0",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  title: { fontSize: 17, fontWeight: 700, color: "#333" },
  vehicleRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    background: "#f7f7f7",
    borderRadius: 14,
    marginBottom: 16,
  },
  vehicleEmoji: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: "#e8edff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  vehicleName: { fontSize: 15, fontWeight: 700, color: "#333" },
  vehicleDetail: { fontSize: 12, color: "#888", marginTop: 2 },
  fareAmount: {
    marginLeft: "auto",
    fontSize: 18,
    fontWeight: 800,
    color: "#061ffa",
  },
  routeCard: {
    padding: "14px 16px",
    background: "#fafafa",
    borderRadius: 14,
    marginBottom: 14,
  },
  routeRow: { display: "flex", alignItems: "flex-start", gap: 12 },
  routeVertical: {
    width: 2,
    height: 20,
    background: "#ddd",
    marginLeft: 7,
    marginTop: 4,
    marginBottom: 4,
  },
  routeDot: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 2,
  },
  routeTexts: { flex: 1 },
  routeLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: "#aaa",
    letterSpacing: 0.5,
  },
  routeAddress: {
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
    marginTop: 2,
    lineHeight: 1.4,
  },
  fareCard: {
    padding: "14px 16px",
    background: "#fafafa",
    borderRadius: 14,
    marginBottom: 14,
  },
  fareRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fareKey: { fontSize: 13, color: "#666" },
  fareVal: { fontSize: 13, color: "#333", fontWeight: 500 },
  fareDivider: { height: 1, background: "#eee", margin: "8px 0" },
  paymentRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    background: "#fff8f0",
    borderRadius: 12,
    marginBottom: 20,
    border: "1px solid #ffe8cc",
  },
  paymentLabel: { fontSize: 14, fontWeight: 600, color: "#ff7300" },
  confirmBtn: {
    width: "100%",
    padding: "15px",
    background: "linear-gradient(135deg, #061ffa, #394cfc)",
    color: "white",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(6,31,250,0.4)",
    fontFamily: "'Poppins', sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: { opacity: 0.7, cursor: "not-allowed" },
  spinner: {
    width: 18,
    height: 18,
    border: "2.5px solid rgba(255,255,255,0.3)",
    borderTop: "2.5px solid white",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
  footer: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#fff",
    padding: "18px 16px",
    borderTop: "1px solid #f0f0f0",
    flexShrink: 0,
    paddingBottom: "max(14px, env(safe-area-inset-bottom, 14px))",
    zIndex: 9999,
  },
};