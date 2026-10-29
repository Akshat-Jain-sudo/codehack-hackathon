import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { 
  getUserByEmail, 
  createUser, 
  getStore, 
  setUserVerificationDetails, 
  verifyUserEmail 
} from '../data/store';
import { initializeStoreIfEmpty } from '../data/seed';
import { generateId } from '../utils/id';
import { dispatchVerificationEmail } from '../services/resendService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  requireVerification?: boolean;
  email?: string;
  isSimulated?: boolean;
  verificationCode?: string;
  message?: string;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => AuthResult;
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    department: string;
    student_id: string;
  }) => Promise<AuthResult>;
  verifyEmail: (email: string, codeOrToken: string) => AuthResult;
  resendVerification: (email: string) => Promise<AuthResult>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = 'labloop_auth_user_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({ user: null, isAuthenticated: false });

  // Initialize store and restore session on mount
  useEffect(() => {
    initializeStoreIfEmpty();
    const savedUserId = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (savedUserId) {
      const store = getStore();
      const user = store.users.find((u) => u.id === savedUserId);
      if (user && user.is_active) {
        setAuthState({ user, isAuthenticated: true });
      } else {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  const login = useCallback((email: string, password: string): AuthResult => {
    const user = getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (!user.is_active) {
      return { success: false, error: 'This account has been deactivated. Contact an administrator.' };
    }
    if (user.password_hash !== password) {
      return { success: false, error: 'Incorrect password.' };
    }

    // Require email verification for registered accounts
    if (user.email_verified === false) {
      return {
        success: false,
        requireVerification: true,
        email: user.email,
        error: 'Passport activation pending: Please verify your email address to authenticate.',
      };
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, user.id);
    setAuthState({ user, isAuthenticated: true });
    return { success: true };
  }, []);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    department: string;
    student_id: string;
  }): Promise<AuthResult> => {
    const cleanEmail = data.email.toLowerCase().trim();
    const existing = getUserByEmail(cleanEmail);
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Generate 6-digit verification code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = generateId();

    const newUser = createUser({
      email: cleanEmail,
      full_name: data.full_name.trim(),
      role: data.role,
      department: data.department.trim(),
      student_id: data.student_id.trim(),
      training_completed: false,
      is_active: true,
      email_verified: false,
      verification_code: verificationCode,
      verification_token: verificationToken,
      verification_sent_at: new Date().toISOString(),
      password_hash: data.password,
    });

    // Verification Link pointing to dura-loop.vercel.app or active host
    const origin = typeof window !== 'undefined' && window.location.origin 
      ? window.location.origin 
      : 'https://dura-loop.vercel.app';
    const verificationLink = `${origin}/auth?mode=verify&email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}`;

    // Dispatch real email via Resend API
    const sendResult = await dispatchVerificationEmail({
      email: cleanEmail,
      fullName: newUser.full_name,
      verificationCode,
      verificationLink,
    });

    return {
      success: true,
      requireVerification: true,
      email: cleanEmail,
      isSimulated: sendResult.isSimulated,
      verificationCode: sendResult.verificationCode,
      message: sendResult.isSimulated
        ? sendResult.message
        : 'Verification pass code sent via Resend.',
    };
  }, []);

  const verifyEmail = useCallback((email: string, codeOrToken: string): AuthResult => {
    const cleanEmail = email.toLowerCase().trim();
    const result = verifyUserEmail(cleanEmail, codeOrToken);
    if (!result.success || !result.user) {
      return { success: false, error: result.error || 'Verification failed.' };
    }

    sessionStorage.setItem(AUTH_STORAGE_KEY, result.user.id);
    setAuthState({ user: result.user, isAuthenticated: true });
    return { success: true };
  }, []);

  const resendVerification = useCallback(async (email: string): Promise<AuthResult> => {
    const cleanEmail = email.toLowerCase().trim();
    const user = getUserByEmail(cleanEmail);
    if (!user) {
      return { success: false, error: 'No account found with this email.' };
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationToken = generateId();

    setUserVerificationDetails(cleanEmail, verificationCode, verificationToken);

    const origin = typeof window !== 'undefined' && window.location.origin 
      ? window.location.origin 
      : 'https://dura-loop.vercel.app';
    const verificationLink = `${origin}/auth?mode=verify&email=${encodeURIComponent(cleanEmail)}&token=${verificationToken}`;

    const sendResult = await dispatchVerificationEmail({
      email: cleanEmail,
      fullName: user.full_name,
      verificationCode,
      verificationLink,
    });

    return {
      success: true,
      isSimulated: sendResult.isSimulated,
      verificationCode: sendResult.verificationCode,
      message: sendResult.isSimulated
        ? sendResult.message
        : 'A new verification code has been dispatched via Resend.',
    };
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthState({ user: null, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(() => {
    if (authState.user) {
      const store = getStore();
      const updated = store.users.find((u) => u.id === authState.user!.id);
      if (updated) {
        setAuthState({ user: updated, isAuthenticated: true });
      }
    }
  }, [authState.user]);

  return (
    <AuthContext.Provider
      value={{
        ...authState,
        login,
        register,
        verifyEmail,
        resendVerification,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
