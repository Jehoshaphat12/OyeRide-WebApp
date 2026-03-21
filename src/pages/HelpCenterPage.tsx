import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';

const FAQS = [
  {
    category: 'Booking',
    items: [
      { q: 'How do I book a ride?', a: 'Open the app, enter your pickup and destination, choose a ride type (OyeRide, OyeDeliver, or OyeBicycle), and tap "Confirm Booking". A driver will be matched to you shortly.' },
      { q: 'Can I schedule a ride in advance?', a: 'Currently, OyeRide supports on-demand bookings only. Scheduled rides will be available in a future update.' },
      { q: 'How do I add multiple stops?', a: 'After entering your pickup location, you can add intermediate stops before your final destination in the location picker.' },
    ],
  },
  {
    category: 'Payments',
    items: [
      { q: 'What payment methods are accepted?', a: 'Currently, OyeRide accepts cash payments. Mobile money and card payments will be added soon.' },
      { q: 'How is the fare calculated?', a: 'Fares are calculated based on a base fare + distance rate. The price shown before you confirm is the estimated total — no surprises!' },
      { q: 'Will I be charged for cancellations?', a: 'Cancellations made after a driver has been assigned may incur a small cancellation fee. Cancelling before a driver is assigned is free.' },
    ],
  },
  {
    category: 'Safety',
    items: [
      { q: 'How are drivers verified?', a: 'All OyeRide drivers go through a background check, vehicle inspection, and document verification before they can accept rides.' },
      { q: 'What if I feel unsafe during a ride?', a: 'You can share your live trip with a trusted contact. If you feel unsafe, tap the Emergency button in the app to contact local authorities.' },
      { q: 'Can I report a driver?', a: 'Yes. After your ride completes, you can rate your driver and report any issues. You can also contact us directly from the Help Center.' },
    ],
  },
  {
    category: 'Deliveries',
    items: [
      { q: 'What items can I send with OyeDeliver?', a: 'You can send packages, documents, food, and small goods. Prohibited items include hazardous materials, illegal goods, and live animals.' },
      { q: 'Is there a weight limit for deliveries?', a: 'Standard deliveries support up to 20kg. Heavier items may require a special arrangement.' },
    ],
  },
];

export default function HelpCenterPage() {
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = FAQS.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        !search ||
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase()),
    ),
  })).filter((cat) => cat.items.length > 0);

  return (
    <div style={styles.screen}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <div>
          <h1 style={styles.headerTitle}>Help Center</h1>
          <p style={styles.headerSub}>How can we help you?</p>
        </div>
      </div>

      <div style={styles.searchWrap}>
        <Icon name="search" size={18} color="#aaa" />
        <input
          style={styles.searchInput}
          placeholder="Search FAQs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={styles.content}>
        {filtered.map((cat) => (
          <div key={cat.category} style={styles.category}>
            <div style={styles.catTitle}>{cat.category}</div>
            <div style={styles.catCard}>
              {cat.items.map((item, i) => {
                const key = `${cat.category}-${i}`;
                const isOpen = openItem === key;
                return (
                  <React.Fragment key={key}>
                    {i > 0 && <div style={styles.divider} />}
                    <button style={styles.faqBtn} onClick={() => setOpenItem(isOpen ? null : key)}>
                      <span style={styles.faqQ}>{item.q}</span>
                    <div style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
                      <Icon name="chevron-down" size={18} color="#aaa" />
                    </div>
                    </button>
                    {isOpen && (
                      <div style={styles.faqA}>{item.a}</div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        ))}

        <div style={styles.contactCta}>
          <p style={styles.ctaText}>Still need help?</p>
          <button style={styles.ctaBtn} onClick={() => navigate('/contact')}>
            Contact Support
          </button>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f5f5', overflow: 'hidden' },
  header: {
    background: 'linear-gradient(135deg, #061ffa, #0215be)',
    padding: '52px 20px 24px',
    display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    background: 'rgba(255,255,255,0.15)', border: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
  },
  headerTitle: { fontSize: 20, fontWeight: 700, color: 'white' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  searchWrap: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '16px 16px 0',
    background: 'white', borderRadius: 14, padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)', flexShrink: 0,
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none',
    fontSize: 14, fontFamily: "'Poppins', sans-serif", color: '#333',
    background: 'transparent',
  },
  content: { flex: 1, overflowY: 'auto', padding: '16px' },
  category: { marginBottom: 16 },
  catTitle: { fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 1, marginBottom: 8, paddingLeft: 4 },
  catCard: { background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  divider: { height: 1, background: '#f5f5f5' },
  faqBtn: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12,
  },
  faqQ: { fontSize: 14, fontWeight: 600, color: '#333', flex: 1, fontFamily: "'Poppins', sans-serif", lineHeight: 1.4 },
  faqA: { padding: '0 16px 16px', fontSize: 13, color: '#666', lineHeight: 1.6 },
  contactCta: {
    background: 'white', borderRadius: 16, padding: '20px',
    textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 4,
  },
  ctaText: { fontSize: 14, color: '#888', marginBottom: 12 },
  ctaBtn: {
    padding: '12px 28px', borderRadius: 12,
    background: '#061ffa', color: 'white', border: 'none',
    fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
  },
};
