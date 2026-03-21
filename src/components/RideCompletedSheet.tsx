import React, { useState } from 'react';
import { Icon } from './Icons';
import { Ride } from '../types';

const FEEDBACK_TAGS = ['Professional', 'Safe Riding', 'On Time', 'Great Route', 'Smooth Ride', 'Helpful', 'Quiet Ride', 'Good Communication'];

interface Props {
  ride: Ride;
  driverInfo: any;
  onSubmitRating: (rating: number, feedback: string, tags: string[]) => void;
  onDismiss: () => void;
}

export default function RideCompletedSheet({ ride, driverInfo, onSubmitRating, onDismiss }: Props) {
  const [step, setStep] = useState<'summary' | 'rate'>('summary');
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = () => {
    onSubmitRating(rating, feedback, selectedTags);
  };

  const destination = ride.destinations?.[ride.destinations.length - 1];

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        {step === 'summary' && (
          <>
            <div style={styles.successBadge}>
              <div style={styles.successIcon}>
                <Icon name="check-circle" size={52} color="#4caf50" />
              </div>
              <h2 style={styles.successTitle}>Ride Completed!</h2>
              <p style={styles.successSub}>Thanks for riding with OyeRide</p>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryKey}>Pickup</span>
                <span style={styles.summaryVal}>{ride.pickup?.address || '—'}</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.summaryRow}>
                <span style={styles.summaryKey}>Destination</span>
                <span style={styles.summaryVal}>{destination?.address || '—'}</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.summaryRow}>
                <span style={styles.summaryKey}>Distance</span>
                <span style={styles.summaryVal}>{ride.distance?.toFixed(1) || '—'} km</span>
              </div>
              <div style={styles.divider} />
              <div style={styles.summaryRow}>
                <span style={styles.summaryKey}>Total Paid</span>
                <span style={{ ...styles.summaryVal, color: '#061ffa', fontWeight: 800, fontSize: 18 }}>
                  GH₵ {ride.totalFare?.toFixed(2) || '0.00'}
                </span>
              </div>
            </div>

            <button style={styles.rateBtn} onClick={() => setStep('rate')}>Rate your ride</button>
            <button style={styles.skipBtn} onClick={onDismiss}>Skip</button>
          </>
        )}

        {step === 'rate' && (
          <>
            <div style={styles.rateHeader}>
              {driverInfo && (
                <div style={styles.driverMini}>
                  <div style={styles.driverAvatar}>
                    {driverInfo.photoUrl ? (
                      <img src={driverInfo.photoUrl} alt="driver" style={styles.avatarImg} />
                    ) : (
                      <div style={styles.avatarPlaceholder}>{(driverInfo.name || 'D')[0].toUpperCase()}</div>
                    )}
                  </div>
                  <div>
                    <div style={styles.driverName}>{driverInfo.name || 'Your Driver'}</div>
                    <div style={styles.driverSub}>How was your experience?</div>
                  </div>
                </div>
              )}
            </div>

            {/* Stars */}
            <div style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  style={styles.starBtn}
                  onMouseEnter={() => setHovered(s)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(s)}
                >
                  <Icon
                    name="star-fill"
                    size={36}
                    color={(hovered || rating) >= s ? '#ffc107' : '#ddd'}
                  />
                </button>
              ))}
            </div>

            <p style={styles.ratingLabel}>
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Okay' : rating === 2 ? 'Not great' : rating === 1 ? 'Very bad' : 'Tap to rate'}
            </p>

            {/* Tags */}
            {rating > 0 && (
              <div style={styles.tagsSection}>
                <p style={styles.tagsLabel}>What went well?</p>
                <div style={styles.tagsGrid}>
                  {FEEDBACK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      style={{ ...styles.tag, ...(selectedTags.includes(tag) ? styles.tagSelected : {}) }}
                      onClick={() => handleTagToggle(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            {rating > 0 && (
              <textarea
                style={styles.textArea}
                placeholder="Add a comment (optional)..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={2}
              />
            )}

            <button
              style={{ ...styles.submitBtn, ...(rating === 0 ? styles.submitDisabled : {}) }}
              onClick={handleSubmit}
              disabled={rating === 0}
            >
              Submit Rating
            </button>
            <button style={styles.skipBtn} onClick={onDismiss}>Skip for now</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
    zIndex: 500, display: 'flex', alignItems: 'flex-end',
  },
  sheet: {
    background: 'white', borderRadius: '24px 24px 0 0',
    padding: '24px 20px 40px', width: '100%',
    maxHeight: '90%', overflowY: 'auto',
    animation: 'slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)',
  },
  successBadge: { textAlign: 'center', marginBottom: 24 },
  successIcon: { display: 'flex', justifyContent: 'center', marginBottom: 8 },
  successTitle: { fontSize: 22, fontWeight: 800, color: '#333' },
  successSub: { fontSize: 14, color: '#888', marginTop: 4 },
  summaryCard: {
    background: '#fafafa', borderRadius: 16,
    padding: '16px', marginBottom: 20, border: '1px solid #eee',
  },
  summaryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '8px 0' },
  summaryKey: { fontSize: 12, color: '#aaa', fontWeight: 600, flexShrink: 0 },
  summaryVal: { fontSize: 13, color: '#333', fontWeight: 600, textAlign: 'right', flex: 1 },
  divider: { height: 1, background: '#eee' },
  rateBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', borderRadius: 14, fontSize: 15, fontWeight: 700,
    border: 'none', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(6,31,250,0.4)',
    fontFamily: "'Poppins', sans-serif", marginBottom: 10,
  },
  skipBtn: {
    width: '100%', padding: '13px',
    background: 'transparent', border: 'none',
    color: '#999', fontSize: 14, fontWeight: 500,
    cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
  },
  rateHeader: { marginBottom: 20 },
  driverMini: { display: 'flex', alignItems: 'center', gap: 14 },
  driverAvatar: {},
  avatarImg: { width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' },
  avatarPlaceholder: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', fontSize: 22, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  driverName: { fontSize: 16, fontWeight: 700, color: '#333' },
  driverSub: { fontSize: 13, color: '#888', marginTop: 2 },
  starsRow: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 8 },
  starBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 4 },
  ratingLabel: { textAlign: 'center', fontSize: 15, fontWeight: 600, color: '#555', marginBottom: 16 },
  tagsSection: { marginBottom: 16 },
  tagsLabel: { fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 },
  tagsGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: {
    padding: '8px 14px', borderRadius: 20,
    border: '1.5px solid #eee', background: '#fafafa',
    fontSize: 12, fontWeight: 600, color: '#666',
    cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
    transition: 'all 0.15s',
  },
  tagSelected: {
    border: '1.5px solid #061ffa', background: '#e8edff', color: '#061ffa',
  },
  textArea: {
    width: '100%', borderRadius: 12,
    border: '1.5px solid #eee', padding: '12px 14px',
    fontSize: 13, fontFamily: "'Poppins', sans-serif",
    resize: 'none', outline: 'none', color: '#333',
    marginBottom: 16,
  },
  submitBtn: {
    width: '100%', padding: '15px',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white', borderRadius: 14, fontSize: 15, fontWeight: 700,
    border: 'none', cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(6,31,250,0.4)',
    fontFamily: "'Poppins', sans-serif", marginBottom: 10,
  },
  submitDisabled: { background: '#ccc', boxShadow: 'none', cursor: 'not-allowed' },
};
