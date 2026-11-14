import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { Icon } from '../components/Icons';

export default function VerifyEmail() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already verified
  useEffect(() => {
    const checkInitial = async () => {
      try {
        const verified = await AuthService.isEmailVerified();
        if (verified) {
          navigate('/');
        }
      } catch {
        // ignore
      }
    };
    checkInitial();
  }, [navigate, user]);

  const handleCheckVerified = async () => {
    setError('');
    setSuccess('');
    setIsChecking(true);
    try {
      const verified = await AuthService.isEmailVerified();
      if (verified) {
        setSuccess('Email verified! Redirecting...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        setError('Not verified yet. Check your inbox (and spam folder), then try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not check verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setIsResending(true);
    try {
      await AuthService.sendVerificationEmail();
      setSuccess('Verification email resent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Could not resend email.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={s.screen}>
      <div style={s.blob} />
      <div style={s.container}>
        {/* Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoCircle}>
            <Icon name="motorcycle" size={38} color="white" strokeWidth={1.5} />
          </div>
          <span style={s.logoText}>OyeRide</span>
          <p style={s.tagline}>Verify your email to start riding</p>
        </div>

        {/* Card */}
        <div style={s.card}>
          <div style={s.iconWrap}>
            <Icon name="mail" size={48} color="#061ffa" />
          </div>
          <h2 style={s.title}>Verify your email</h2>
          <p style={s.body}>
            We sent a verification link to your email. Tap it, then come back here.
          </p>

          {error && <div style={s.errorBox}>{error}</div>}
          {success && <div style={s.successBox}>{success}</div>}

          <button
            style={{ ...s.submitBtn, ...(isChecking ? s.submitBtnDisabled : {}) }}
            onClick={handleCheckVerified}
            disabled={isChecking}
          >
            {isChecking ? <span style={s.spinner} /> : "I've Verified — Continue"}
          </button>

          <button
            style={s.resendLink}
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? 'Resending...' : 'Resend verification email'}
          </button>

          { loading ? <span style={s.spinner} />

          :(<button
            style={s.backLink}
            onClick={async () => {await logout(); navigate('/login');}}
          >
            <Icon name="arrow-back" size={14} color="#061ffa" style={{ marginRight: 5 }} />
            Back to Sign In
          </button>)}

        </div>

        <p style={s.footerText}>
          By continuing, you agree to OyeRide's{' '}
          <span style={s.footerLink}>Terms of Service</span> and{' '}
          <span style={s.footerLink}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: {
    flex: 1,
    height: '100%',
    overflowY: 'auto',
    background: 'linear-gradient(160deg, #061ffa 0%, #0215be 50%, #0a0a2a 100%)',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  blob: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: '50%',
    background: 'rgba(255,115,0,0.2)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  container: {
    flex: 1,
    padding: '40px 24px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 24,
    maxWidth: 430,
    width: '100%',
    margin: '0 auto',
  },
  logoWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    paddingTop: 20,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.15)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 800,
    color: 'white',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: 400,
  },
  card: {
    background: 'white',
    borderRadius: 24,
    padding: '28px 24px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'rgba(6,31,250,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#333',
    marginBottom: 8,
    fontFamily: "'Poppins', sans-serif",
  },
  body: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 1.6,
    fontFamily: "'Poppins', sans-serif",
  },
  errorBox: {
    background: '#fff5f5',
    border: '1px solid #ffcccc',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#e53e3e',
    marginBottom: 16,
    width: '100%',
  },
  successBox: {
    background: '#f0fff4',
    border: '1px solid #9ae6b4',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: 13,
    color: '#276749',
    marginBottom: 16,
    width: '100%',
  },
  submitBtn: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #061ffa, #394cfc)',
    color: 'white',
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    marginTop: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(6,31,250,0.4)',
    fontFamily: "'Poppins', sans-serif",
  },
  submitBtnDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  spinner: {
    width: 20,
    height: 20,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTop: '2.5px solid white',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  resendLink: {
    background: 'none',
    border: 'none',
    color: '#061ffa',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    padding: 12,
    marginTop: 8,
    fontFamily: "'Poppins', sans-serif",
  },
  backLink: {
    background: 'none',
    border: 'none',
    color: '#061ffa',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    padding: 0,
    marginTop: 16,
    fontFamily: "'Poppins', sans-serif",
    display: 'flex',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  footerLink: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: 600,
  },
};

// Optional: add keyframes for spinner animation (if not already defined globally)
// You can include this in your global CSS or add a style tag.
// For completeness, we can add a style tag in the component, but it's better to have it globally.
// If you haven't defined the spin animation, add this to your global styles:
/*
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
*/