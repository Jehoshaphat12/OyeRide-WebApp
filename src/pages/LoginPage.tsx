import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';
import { Icon } from '../components/Icons';

type Mode = 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (mode === 'forgot') {
      if (!email) return setError('Enter your email address');
      setLoading(true);
      try { await AuthService.resetPassword(email); setSuccess('Password reset email sent! Check your inbox.'); }
      catch { setError('Could not send reset email. Try again.'); }
      finally { setLoading(false); }
      return;
    }
    if (!email || !password) return setError('Please fill in all fields');
    if (mode === 'register') {
      if (!name.trim()) return setError('Enter your full name');
      if (!phone.trim()) return setError('Enter your phone number');
      if (password.length < 6) return setError('Password must be at least 6 characters');
      if (password !== confirm) return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password, name, phone);
      navigate('/');
    } catch (e: any) {
      const c = e.code || '';
      if (c === 'auth/user-not-found') setError('No account found with this email.');
      else if (c === 'auth/wrong-password' || c === 'auth/invalid-credential') setError('Incorrect password. Try again.');
      else if (c === 'auth/email-already-in-use') setError('An account with this email already exists.');
      else if (c === 'auth/invalid-email') setError('Invalid email address.');
      else if (c === 'auth/too-many-requests') setError('Too many attempts. Try again later.');
      else setError('Something went wrong. Please try again.');
    } finally { setLoading(false); }
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
          <p style={s.tagline}>
            {mode === 'login' ? 'Welcome back! Ready to ride?' : mode === 'register' ? 'Join thousands of riders' : 'Reset your password'}
          </p>
        </div>

        {/* Card */}
        <div style={s.card}>
          {mode !== 'forgot' && (
            <div style={s.tabs}>
              {(['login', 'register'] as Mode[]).map((m) => (
                <button key={m} style={{ ...s.tab, ...(mode === m ? s.tabActive : {}) }}
                  onClick={() => { setMode(m); setError(''); setSuccess(''); }}>
                  {m === 'login' ? 'Sign In' : 'Sign Up'}
                </button>
              ))}
            </div>
          )}

          {mode === 'forgot' && (
            <div style={{ marginBottom: 20 }}>
              <button style={s.backLink} onClick={() => { setMode('login'); setError(''); setSuccess(''); }}>
                <Icon name="arrow-back" size={14} color="#061ffa" style={{ marginRight: 5 }} />
                Back to Sign In
              </button>
              <h2 style={s.forgotTitle}>Forgot Password</h2>
              <p style={s.forgotSub}>Enter your email and we'll send a reset link</p>
            </div>
          )}

          <div style={s.form}>
            {mode === 'register' && (
              <>
                <InputField label="Full Name" value={name} onChange={setName} placeholder="John Doe" icon={<Icon name="profile" size={17} color="#888" />} />
                <InputField label="Phone Number" value={phone} onChange={setPhone} placeholder="+233 XX XXX XXXX" type="tel" icon={<Icon name="phone" size={17} color="#888" />} />
              </>
            )}
            <InputField label="Email Address" value={email} onChange={setEmail} placeholder="you@email.com" type="email" icon={<Icon name="mail" size={17} color="#888" />} />
            {mode !== 'forgot' && (
              <InputField label="Password" value={password} onChange={setPassword}
                placeholder={mode === 'login' ? 'Your password' : 'Min 6 characters'} type={showPw ? 'text' : 'password'}
                icon={<Icon name="lock" size={17} color="#888" />}
                rightAction={
                  <button style={s.eyeBtn} onClick={() => setShowPw(!showPw)}>
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={17} color="#aaa" />
                  </button>
                }
              />
            )}
            {mode === 'register' && (
              <InputField label="Confirm Password" value={confirm} onChange={setConfirm}
                placeholder="Repeat password" type={showPw ? 'text' : 'password'}
                icon={<Icon name="lock" size={17} color="#888" />} />
            )}
          </div>

          {error && <div style={s.errorBox}>{error}</div>}
          {success && <div style={s.successBox}>{success}</div>}

          {mode === 'login' && (
            <button style={s.forgotLink} onClick={() => { setMode('forgot'); setError(''); }}>Forgot password?</button>
          )}

          <button style={{ ...s.submitBtn, ...(loading ? s.submitBtnDisabled : {}) }} onClick={handleSubmit} disabled={loading}>
            {loading ? <span style={s.spinner} /> : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </div>
        <p style={s.footerText}>By continuing, you agree to OyeRide's{' '}
          <span style={s.footerLink}>Terms of Service</span> and{' '}
          <span style={s.footerLink}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', icon, rightAction }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; type?: string; icon: React.ReactNode; rightAction?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <div style={{ ...s.inputWrap, ...(focused ? s.inputWrapFocused : {}) }}>
        <span style={s.inputIcon}>{icon}</span>
        <input style={s.input} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} type={type}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        {rightAction}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  screen: { flex: 1, height: '100%', overflowY: 'auto', background: 'linear-gradient(160deg, #061ffa 0%, #0215be 50%, #0a0a2a 100%)', position: 'relative', display: 'flex', flexDirection: 'column' },
  blob: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,115,0,0.2)', filter: 'blur(60px)', pointerEvents: 'none' },
  container: { flex: 1, padding: '40px 24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 24, maxWidth: 430, width: '100%', margin: '0 auto' },
  logoWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 20 },
  logoCircle: { width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  logoText: { fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 400 },
  card: { background: 'white', borderRadius: 24, padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  tabs: { display: 'flex', background: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 24 },
  tab: { flex: 1, padding: '10px 0', borderRadius: 9, fontSize: 14, fontWeight: 600, background: 'transparent', color: '#999', border: 'none', cursor: 'pointer', fontFamily: "'Poppins', sans-serif" },
  tabActive: { background: '#061ffa', color: 'white', boxShadow: '0 2px 8px rgba(6,31,250,0.3)' },
  form: { display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#555', letterSpacing: 0.3 },
  inputWrap: { display: 'flex', alignItems: 'center', gap: 10, border: '1.5px solid #e0e0e0', borderRadius: 12, padding: '11px 14px', transition: 'border-color 0.2s', background: '#fafafa' },
  inputWrapFocused: { borderColor: '#061ffa', background: '#fff' },
  inputIcon: { display: 'flex', flexShrink: 0 },
  input: { flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: "'Poppins', sans-serif", background: 'transparent', color: '#333' },
  eyeBtn: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, padding: 0 },
  errorBox: { background: '#fff5f5', border: '1px solid #ffcccc', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#e53e3e', marginBottom: 8 },
  successBox: { background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#276749', marginBottom: 8 },
  forgotLink: { background: 'none', border: 'none', color: '#061ffa', fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'right', display: 'block', width: '100%', marginBottom: 16, fontFamily: "'Poppins', sans-serif" },
  submitBtn: { width: '100%', padding: '15px', background: 'linear-gradient(135deg, #061ffa, #394cfc)', color: 'white', borderRadius: 14, fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(6,31,250,0.4)', fontFamily: "'Poppins', sans-serif" },
  submitBtnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  spinner: { width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTop: '2.5px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' },
  backLink: { background: 'none', border: 'none', color: '#061ffa', fontSize: 13, fontWeight: 500, cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: "'Poppins', sans-serif", display: 'flex', alignItems: 'center' },
  forgotTitle: { fontSize: 20, fontWeight: 700, color: '#333', marginBottom: 4 },
  forgotSub: { fontSize: 13, color: '#888' },
  footerText: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.6 },
  footerLink: { color: 'rgba(255,255,255,0.8)', fontWeight: 600 },
};
