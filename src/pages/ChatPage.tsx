import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ChatService, ChatMessage } from '../services/chatService';
import { FirestoreService } from '../services/firestoreService';
import { WebNotificationService } from '../services/webNotificationService';

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get('rideId') || '';
  const driverId = searchParams.get('driverId') || '';
  const driverName = searchParams.get('driverName') || 'Driver';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch driver info
  useEffect(() => {
    if (!driverId) return;
    FirestoreService.getDriver(driverId).then((d) => { if (d) setDriverInfo(d); });
  }, [driverId]);

  // Subscribe to chat
  useEffect(() => {
    if (!rideId) return;
    const unsub = ChatService.subscribeToChat(rideId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      // Scroll to bottom on new messages
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    });
    return unsub;
  }, [rideId]);

  // Scroll to bottom on mount
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
  }, [loading]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !rideId || !user?.id || sending) return;
    setInput('');
    setSending(true);
    try {
      await ChatService.sendMessage(rideId, user.id, text);
      // Notify driver
      if (driverId) {
        WebNotificationService.addLocalNotification(
          driverId,
          'chat_message',
          `💬 ${user.name || 'Passenger'}`,
          text,
          rideId,
        ).catch(() => {});
      }
    } catch (err) {
      console.error('Send failed:', err);
      setInput(text); // restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, rideId, user, sending, driverId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return '';
    const d = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const displayName = driverInfo?.name || driverName;

  return (
    <div style={styles.screen}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        <div style={styles.headerCenter}>
          {driverInfo?.photoUrl ? (
            <img src={driverInfo.photoUrl} alt="driver" style={styles.headerAvatar} />
          ) : (
            <div style={styles.headerAvatarFallback}>
              {displayName[0]?.toUpperCase() || 'D'}
            </div>
          )}
          <div style={styles.headerInfo}>
            <span style={styles.headerName}>{displayName}</span>
            <span style={styles.headerRole}>Driver</span>
          </div>
        </div>

        {driverInfo?.phone ? (
          <a href={`tel:${driverInfo.phone}`} style={styles.callBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.6 1.3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.06-1.06a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </a>
        ) : (
          <div style={{ width: 40 }} />
        )}
      </div>

      {/* Messages */}
      <div style={styles.messageArea}>
        {loading && (
          <div style={styles.loadingWrap}>
            <div style={styles.spinner} />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyBubble}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p style={styles.emptyTitle}>No messages yet</p>
            <p style={styles.emptySub}>Say hello to {displayName}!</p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.senderId === user?.id;
          return (
            <div
              key={msg.id}
              style={{ ...styles.msgRow, justifyContent: isMe ? 'flex-end' : 'flex-start' }}
            >
              {!isMe && (
                <div style={styles.msgAvatar}>
                  {driverInfo?.photoUrl ? (
                    <img src={driverInfo.photoUrl} alt="" style={styles.msgAvatarImg} />
                  ) : (
                    <div style={styles.msgAvatarFallback}>{displayName[0]?.toUpperCase()}</div>
                  )}
                </div>
              )}
              <div style={{
                ...styles.bubble,
                ...(isMe ? styles.myBubble : styles.theirBubble),
                maxWidth: '72%',
              }}>
                <p style={{ ...styles.bubbleText, color: isMe ? 'white' : '#333' }}>
                  {msg.message}
                </p>
                <span style={{ ...styles.bubbleTime, color: isMe ? 'rgba(255,255,255,0.65)' : '#aaa' }}>
                  {formatTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        <textarea
          ref={inputRef}
          style={styles.textInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          maxLength={500}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...((!input.trim() || sending) ? styles.sendBtnDisabled : {}),
          }}
          onClick={sendMessage}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <div style={styles.sendSpinner} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    flex: 1, height: '100%', display: 'flex', flexDirection: 'column',
    background: '#f7f8fa', overflow: 'hidden',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '52px 16px 14px',
    background: 'linear-gradient(135deg, #061ffa, #0215be)',
    flexShrink: 0, gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,255,255,0.15)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', flexShrink: 0,
  },
  headerCenter: {
    flex: 1, display: 'flex', alignItems: 'center', gap: 10,
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: '50%', objectFit: 'cover',
    border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0,
  },
  headerAvatarFallback: {
    width: 40, height: 40, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    color: 'white', fontSize: 16, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0,
  },
  headerInfo: { display: 'flex', flexDirection: 'column' },
  headerName: { fontSize: 15, fontWeight: 700, color: 'white', fontFamily: "'Poppins', sans-serif" },
  headerRole: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontFamily: "'Poppins', sans-serif" },
  callBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,255,255,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, textDecoration: 'none',
  },
  messageArea: {
    flex: 1, overflowY: 'auto', padding: '16px 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  loadingWrap: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
  },
  spinner: {
    width: 32, height: 32, border: '3px solid #e0e0e0',
    borderTop: '3px solid #061ffa', borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '60px 20px', gap: 10,
  },
  emptyBubble: {
    width: 80, height: 80, borderRadius: 24, background: '#eee',
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: 700, color: '#333', fontFamily: "'Poppins', sans-serif", margin: 0 },
  emptySub: { fontSize: 13, color: '#aaa', fontFamily: "'Poppins', sans-serif", margin: 0 },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  msgAvatar: { flexShrink: 0, marginBottom: 4 },
  msgAvatarImg: { width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' },
  msgAvatarFallback: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    borderRadius: 18, padding: '10px 14px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  myBubble: {
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    background: 'white',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14, lineHeight: 1.45,
    fontFamily: "'Poppins', sans-serif", margin: '0 0 4px 0',
    wordBreak: 'break-word',
  },
  bubbleTime: {
    fontSize: 10, display: 'block', textAlign: 'right',
    fontFamily: "'Poppins', sans-serif",
  },
  inputBar: {
    display: 'flex', alignItems: 'flex-end', gap: 10,
    padding: '12px 14px 16px',
    background: 'white', borderTop: '1px solid #eee',
    flexShrink: 0,
    paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
  },
  textInput: {
    flex: 1, minHeight: 42, maxHeight: 110,
    borderRadius: 21, border: '1.5px solid #e0e0e0',
    padding: '10px 16px', fontSize: 14,
    fontFamily: "'Poppins', sans-serif", color: '#333',
    background: '#f7f7f7', outline: 'none', resize: 'none',
    lineHeight: 1.4,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: '50%',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 3px 12px rgba(6,31,250,0.35)',
    flexShrink: 0, transition: 'opacity 0.15s',
  },
  sendBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  sendSpinner: {
    width: 16, height: 16, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    animation: 'spin 0.7s linear infinite',
  },
};
