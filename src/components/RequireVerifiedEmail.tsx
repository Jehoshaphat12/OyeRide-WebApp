// components/RequireVerifiedEmail.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

export default function RequireVerifiedEmail({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setChecked(true); // let your existing route protection handle "not logged in"
      return;
    }
    AuthService.isEmailVerified().then((verified) => {
      if (!verified && location.pathname !== '/verifyEmail') {
        navigate('/verifyEmail');
      }
      setChecked(true);
    });
  }, [user, loading, location.pathname, navigate]);

  if (!checked) return null; // or a spinner
  return <>{children}</>;
}