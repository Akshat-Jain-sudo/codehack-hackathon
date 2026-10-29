import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '../types';
import { getUserByEmail, createUser, getStore } from '../data/store';
import { initializeStoreIfEmpty } from '../data/seed';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => { success: boolean; error?: string };
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    department: string;
    student_id: string;
  }) => { success: boolean; error?: string };
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

  const login = useCallback((email: string, password: string): { success: boolean; error?: string } => {
    const user = getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    if (!user.is_active) {
      return { success: false, error: 'This account has been deactivated. Contact an administrator.' };
    }
    // Dev-mode password check (in production, this would be Supabase Auth)
    if (user.password_hash !== password) {
      return { success: false, error: 'Incorrect password.' };
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, user.id);
    setAuthState({ user, isAuthenticated: true });
    return { success: true };
  }, []);

  const register = useCallback((data: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
    department: string;
    student_id: string;
  }): { success: boolean; error?: string } => {
    const existing = getUserByEmail(data.email.toLowerCase().trim());
    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }
    const newUser = createUser({
      email: data.email.toLowerCase().trim(),
      full_name: data.full_name.trim(),
      role: data.role,
      department: data.department.trim(),
      student_id: data.student_id.trim(),
      training_completed: false,
      is_active: true,
      password_hash: data.password,
    });
    sessionStorage.setItem(AUTH_STORAGE_KEY, newUser.id);
    setAuthState({ user: newUser, isAuthenticated: true });
    return { success: true };
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
    <AuthContext.Provider value={{ ...authState, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
