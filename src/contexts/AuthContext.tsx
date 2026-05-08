import React, { createContext, useContext, useEffect, useState, useMemo, useRef, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AuthService } from '../services/authService';
import { WebNotificationService } from '../services/webNotificationService';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // Keep a ref so the visibility listener always sees the latest user
  const userRef = useRef<User | null>(null);

  // ── Helper: request + save token, skips if nothing changed ──────────────
  const refreshFcmToken = (userId: string) => {
    WebNotificationService.requestPermissionAndGetToken(userId)
      .then((token) => {
        if (token) console.log('✅ Web FCM token saved');
      })
      .catch(() => {}); // always non-blocking
  };

  // ── Auth state listener ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          const userData = await AuthService.getUser(fbUser.uid);
          setUser(userData);
          userRef.current = userData;

          // Get/refresh token every time auth state fires
          // (covers: login, register, page reload, returning to tab)
          refreshFcmToken(fbUser.uid);
        } else {
          if (userRef.current?.id) {
            await WebNotificationService.removeToken(userRef.current.id);
          }
          setUser(null);
          userRef.current = null;
        }
      } catch {
        setUser(null);
        userRef.current = null;
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // ── Refresh token when user returns to the tab (tab visibility) ──────────
  // Covers the case where a user had the tab open for a long time or
  // came back after the browser was backgrounded — token may have expired
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userRef.current?.id) {
        refreshFcmToken(userRef.current.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const login = async (email: string, password: string) => {
    const u = await AuthService.login(email, password);
    setUser(u);
    userRef.current = u;
    // Also refresh immediately after explicit login
    refreshFcmToken(u.id);
  };

  const register = async (email: string, password: string, name: string, phone: string) => {
    const u = await AuthService.register(email, password, name, phone);
    setUser(u);
    userRef.current = u;
    // New user — get their token right away
    refreshFcmToken(u.id);
  };

  const logout = async () => {
    if (userRef.current?.id) {
      await WebNotificationService.removeToken(userRef.current.id).catch(() => {});
    }
    await AuthService.logout();
    setUser(null);
    userRef.current = null;
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    await AuthService.updateUserProfile(user.id, updates);
    const updated = { ...user, ...updates };
    setUser(updated);
    userRef.current = updated;
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
