/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────
 * SRI TECH ACADEMY PORTAL – Firebase Auth Phase 2
 *
 * Session management is now fully Firebase-backed:
 *  • onAuthStateChanged   → automatic session restore on page refresh
 *  • Firestore users/{uid} → role + profile (never hardcoded)
 *  • signOut              → real Firebase logout
 *
 * NO localStorage credential storage.
 * NO mock fallbacks in auth flow.
 * ─────────────────────────────────────────────────────────────
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import {
  login as firebaseLogin,
  logout as firebaseLogout,
  getUserProfile,
  updateUserProfile,
  subscribeToAuthState,
  changePassword as firebaseChangePassword,
} from '../services/firebaseAuthService';

// ─── Context Shape ────────────────────────────────────────────

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStudent: boolean;
}

// ─── Context Creation ─────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to Firebase Auth state.
    // Fires immediately on mount (once) with the current user or null.
    // This is the ONLY session restore mechanism — no localStorage hacks.
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const profile = await getUserProfile(firebaseUser.uid);
          setUser(profile);
        } catch (err) {
          console.error('[AuthContext] Failed to load user profile from Firestore:', err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup listener on unmount
    return () => unsubscribe();
  }, []);

  // ─── Login ──────────────────────────────────────────────────
  const login = async (email: string, password: string): Promise<UserProfile> => {
    setLoading(true);
    try {
      const profile = await firebaseLogin(email, password);
      setUser(profile);
      return profile;
    } catch (err) {
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────
  const logout = async (): Promise<void> => {
    await firebaseLogout();
    setUser(null);
    // onAuthStateChanged will also fire with null — setUser(null) here is for
    // immediate UI responsiveness before the listener fires.
  };

  // ─── Change Password (Firebase reauthenticate + updatePassword) ────
  const updatePassword = async (currentPassword: string, newPassword: string): Promise<void> => {
    await firebaseChangePassword(currentPassword, newPassword);
  };

  // ─── Update Profile ──────────────────────────────────────────
  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!user) return;
    try {
      await updateUserProfile(user.id, updates);
      setUser({ ...user, ...updates });
    } catch (err) {
      console.error('[AuthContext] Failed to update profile:', err);
      throw err;
    }
  };

  // ─── Context Value ───────────────────────────────────────────
  const value: AuthContextType = {
    user,
    loading,
    login,
    logout,
    updateProfile,
    updatePassword,
    isAuthenticated: !!user,
    isAdmin:   user?.role === 'admin',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children only after Firebase has resolved auth state.
          This prevents a flash of the login page on authenticated refresh. */}
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ─── Hook ─────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
