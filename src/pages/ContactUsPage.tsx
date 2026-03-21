import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';

const CONTACT_METHODS = [
  { icon: <Icon name="phone"    size={22} color="#4caf50" />, label: 'Call Us',    value: '+233 XX XXX XXXX',  action: 'tel:+233XXXXXXXXX',          color: '#4caf50', bg: '#f0fff4' },
  { icon: <Icon name="mail"     size={22} color="#061ffa" />, label: 'Email Us',   value: 'support@oyeride.com', action: 'mailto:support@oyeride.com', color: '#061ffa', bg: '#e8edff' },
  { icon: <Icon name="whatsapp" size={22} color="#25d366" />, label: 'WhatsApp',   value: 'Chat with support',  action: 'https://wa.me/233XXXXXXXXX', color: '#25d366', bg: '#f0fff4' },
  { icon: <Icon name="twitter"  size={22} color="#1da1f2" />, label: 'Twitter / X', value: '@OyeRideGH',         action: 'https://twitter.com/oyeride', color: '#1da1f2', bg: '#e8f4fd' },
];

export default function ContactUsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!name || !email || !message) { alert('Please fill all required fields.'); return; }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSent(true); setSending(false);
  };

  return (
    <div style={s.screen}>
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <Icon name="arrow-back" size={20} color="white" />
        </button>
        <div>
          <h1 style={s.headerTitle}>Contact Us</h1>
          <p style={s.headerSub}>We're here to help you</p>
        </div>
      </div>

      <div style={s.content}>
        <div style={s.section}>
          <div style={s.sectionTitle}>REACH US DIRECTLY</div>
          <div style={s.contactGrid}>
            {CONTACT_METHODS.map((m) => (
              <a key={m.label} href={m.action} target="_blank" rel="noopener noreferrer" style={s.contactCard}>
                <div style={{ ...s.contactIconBox, background: m.bg }}>{m.icon}</div>
                <div style={s.contactLabel}>{m.label}</div>
                <div style={{ ...s.contactValue, color: m.color }}>{m.value}</div>
              </a>
            ))}
          </div>
        </div>

        <div style={s.section}>
          <div style={s.sectionTitle}>SEND A MESSAGE</div>
          {sent ? (
            <div style={s.successCard}>
              <div style={s.successIconWrap}>
                <Icon name="check-circle" size={48} color="#4caf50" />
              </div>
              <h3 style={s.successTitle}>Message Sent!</h3>
              <p style={s.successText}>Thanks for reaching out. Our team will respond within 24 hours.</p>
              <button style={s.resetBtn} onClick={() => { setSent(false); setName(''); setEmail(''); setSubject(''); setMessage(''); }}>
                Send Another
              </button>
            </div>
          ) : (
            <div style={s.formCard}>
              <Field label="Name *" value={name} onChange={setName} placeholder="Your full name" />
              <Field label="Email *" value={email} onChange={setEmail} placeholder="your@email.com" type="email" />
              <Field label="Subject" value={subject} onChange={setSubject} placeholder="What's this about?" />
              <div style={s.field}>
                <label style={s.label}>Message *</label>
                <textarea style={s.textarea} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue or question..." rows={4} />
              </div>
              <button style={{ ...s.sendBtn, ...(sending ? s.sendBtnLoading : {}) }} onClick={handleSend} disabled={sending}>
                {sending
                  ? <><span style={s.spinner} /> Sending...</>
                  : <><Icon name="send" size={16} color="white" style={{ marginRight: 8 }} /> Send Message</>}
              </button>
            </div>
          )}
        </div>
        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <input style={s.input} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: { background: 'linear-gradient(135deg, #061ffa, #0215be)', padding: '52px 20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 },
  backBtn: { width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  headerTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 10, paddingLeft: 4 },
  contactGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  contactCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 12px', background: 'white', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textDecoration: 'none' },
  contactIconBox: { width: 48, height: 48, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  contactLabel: { fontSize: 13, fontWeight: 700, color: '#333' },
  contactValue: { fontSize: 11, fontWeight: 500, textAlign: 'center' },
  formCard: { background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#555' },
  input: { padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: 'none', color: '#333' },
  textarea: { padding: '12px 14px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: "'Poppins', sans-serif", outline: 'none', color: '#333', resize: 'none' },
  sendBtn: { padding: '14px', borderRadius: 14, background: 'linear-gradient(135deg, #061ffa, #394cfc)', color: 'white', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, boxShadow: '0 4px 16px rgba(6,31,250,0.35)' },
  sendBtnLoading: { opacity: 0.7 },
  spinner: { width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' },
  successCard: { background: 'white', borderRadius: 16, padding: 28, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  successIconWrap: { display: 'flex', justifyContent: 'center', marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: 800, color: '#333', marginBottom: 8 },
  successText: { fontSize: 14, color: '#888', lineHeight: 1.5, marginBottom: 20 },
  resetBtn: { padding: '12px 28px', borderRadius: 12, background: '#e8edff', border: 'none', color: '#061ffa', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },
};
