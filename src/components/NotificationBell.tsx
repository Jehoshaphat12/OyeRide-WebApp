import React, { useState, useEffect } from "react";
import { AppNotification } from "../services/webNotificationService";
import { Icon, IconName } from "./Icons";

interface Props {
  unreadCount: number;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  onAction: (type: string, rideId?: string) => void;
}

const TYPE_CONFIG: Record<
  string,
  { icon: IconName; color: string; bg: string }
> = {
  ride_accepted: { icon: "car", color: "#4caf50", bg: "#f0fff4" },
  ride_cancelled: { icon: "cancel", color: "#f44336", bg: "#fff5f5" },
  ride_completed: { icon: "check-circle", color: "#ff7300", bg: "#fff8f0" },
  chat_message: { icon: "chat", color: "#2196f3", bg: "#e3f2fd" },
  rating_received: { icon: "star-fill", color: "#ff9800", bg: "#fffde7" },
  default: { icon: "bell", color: "#061ffa", bg: "#e8edff" },
};

export default function NotificationBell({
  unreadCount,
  notifications,
  onMarkAllRead,
  onMarkRead,
  onAction,
}: Props) {
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setPanelVisible(true));
    else setPanelVisible(false);
  }, [open]);

  const handleClose = () => {
    setPanelVisible(false);
    setTimeout(() => setOpen(false), 320);
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString("en-GH", { day: "2-digit", month: "short" });
  };

  return (
    <>
      <button style={s.bellBtn} onClick={() => setOpen(true)}>
        <Icon name="bell" size={20} color="#333" />
        {unreadCount > 0 && (
          <div style={s.badge}>{unreadCount > 9 ? "9+" : unreadCount}</div>
        )}
      </button>

      {open && (
        <>
          <div
            style={{
              ...s.dim,
              opacity: panelVisible ? 1 : 0,
              transition: "opacity 0.28s ease",
            }}
            onClick={handleClose}
          />
          <div
            style={{
              ...s.panel,
              transform: panelVisible ? "translateY(0)" : "translateY(-110%)",
              opacity: panelVisible ? 1 : 0,
              transition:
                "transform 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease",
            }}
          >
            <div style={s.handle} />
            <div style={s.header}>
              <div>
                <h3 style={s.title}>Notifications</h3>
                {unreadCount > 0 && (
                  <span style={s.pill}>{unreadCount} unread</span>
                )}
              </div>
              <div style={s.headerRight}>
                {unreadCount > 0 && (
                  <button style={s.markAllBtn} onClick={onMarkAllRead}>
                    Mark all read
                  </button>
                )}
                <button style={s.closeBtn} onClick={handleClose}>
                  <Icon name="close" size={15} color="#666" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div style={s.list}>
              {notifications.length === 0 ? (
                <div style={s.empty}>
                  <div style={s.emptyIconWrap}>
                    <Icon name="bell" size={32} color="#ccc" />
                  </div>
                  <p style={s.emptyTitle}>All caught up!</p>
                  <p style={s.emptySub}>Ride updates will appear here</p>
                </div>
              ) : (
                notifications.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.default;
                  return (
                    <button
                      key={n.id}
                      style={{
                        ...s.row,
                        background: n.read ? "transparent" : cfg.bg,
                        borderBottom:
                          i < notifications.length - 1
                            ? "1px solid #f2f2f2"
                            : "none",
                        pointerEvents: "all",
                        zIndex: 10,
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onMarkRead(n.id);
                        if (onAction) {
                          onAction(n.type, n.rideId || undefined);
                        }
                        handleClose();
                      }}
                    >
                      <div
                        style={{
                          ...s.rowIcon,
                          background: cfg.color + "18",
                          border: `1.5px solid ${cfg.color}35`,
                        }}
                      >
                        <Icon
                          name={cfg.icon}
                          size={20}
                          color={cfg.color}
                          strokeWidth={1.75}
                        />
                      </div>
                      <div style={s.rowContent}>
                        <div style={s.rowTop}>
                          <span
                            style={{
                              ...s.rowTitle,
                              fontWeight: n.read ? 500 : 700,
                            }}
                          >
                            {n.title}
                          </span>
                          <span style={s.rowTime}>
                            {formatTime(n.createdAt)}
                          </span>
                        </div>
                        <p style={s.rowBody}>{n.body}</p>
                      </div>
                      {!n.read && (
                        <div style={{ ...s.dot, background: cfg.color }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "white",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    position: "relative",
    pointerEvents: "all",
    flexShrink: 0,
  },
  badge: {
    position: "absolute",
    top: 7,
    right: 7,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    background: "#f44336",
    color: "white",
    fontSize: 8,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
    border: "1.5px solid white",
    fontFamily: "'Poppins', sans-serif",
  },
  dim: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.42)",
    zIndex: 1498,
    pointerEvents: "all",
  },
  panel: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    background: "white",
    borderRadius: "0 0 24px 24px",
    maxHeight: "65%",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 40px rgba(0,0,0,0.22)",
    zIndex: 9999,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    background: "#ddd",
    margin: "12px auto 0",
    flexShrink: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 12px",
    borderBottom: "1px solid #f0f0f0",
    flexShrink: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: "#222",
    fontFamily: "'Poppins', sans-serif",
  },
  pill: {
    display: "inline-block",
    marginTop: 3,
    background: "#e8edff",
    color: "#061ffa",
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 10,
    fontFamily: "'Poppins', sans-serif",
  },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  markAllBtn: {
    background: "none",
    border: "none",
    color: "#061ffa",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Poppins', sans-serif",
    padding: "4px 8px",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: "#f0f0f0",
    border: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  list: { overflowY: "auto", flex: 1, paddingBottom: 8 },
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "36px 20px",
    gap: 6,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 18,
    background: "#f5f5f5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#333",
    fontFamily: "'Poppins', sans-serif",
    margin: 0,
  },
  emptySub: {
    fontSize: 12,
    color: "#aaa",
    fontFamily: "'Poppins', sans-serif",
    margin: 0,
  },
  row: {
    width: "100%",
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "13px 18px",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    position: "relative",
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1, overflow: "hidden" },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 3,
  },
  rowTitle: {
    fontSize: 13,
    color: "#222",
    fontFamily: "'Poppins', sans-serif",
    flex: 1,
  },
  rowTime: {
    fontSize: 11,
    color: "#aaa",
    fontFamily: "'Poppins', sans-serif",
    flexShrink: 0,
  },
  rowBody: {
    fontSize: 12,
    color: "#666",
    lineHeight: 1.4,
    fontFamily: "'Poppins', sans-serif",
    margin: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 6,
  },
};
