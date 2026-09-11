'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  orgId: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS_KEY = 'kulima_users';
const SESSION_KEY = 'kulima_session';

function getUsers(): Record<string, { id: string; name: string; email: string; password: string; orgId: string }> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, any>) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(user: User | null) {
  if (user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (session) setUser(session);
    setLoading(false);
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    const users = getUsers();
    if (users[email]) {
      throw new Error('An account with this email already exists.');
    }

    const newUser = {
      id: crypto.randomUUID(),
      name,
      email,
      password, // In production, hash this server-side
      orgId: crypto.randomUUID(),
    };

    users[email] = newUser;
    saveUsers(users);

    const sessionUser: User = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      orgId: newUser.orgId,
    };

    setUser(sessionUser);
    saveSession(sessionUser);

    // Auto-create an API key for the new user
    try {
      const res = await fetch('http://localhost:3000/v1/auth/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name}'s Key` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.key) {
          localStorage.setItem('kulima_api_key', data.key);
        }
      }
    } catch {
      // API key creation is best-effort — user can create one later from the Keys page
    }
  };

  const signIn = async (email: string, password: string) => {
    const users = getUsers();
    const found = users[email];

    if (!found || found.password !== password) {
      throw new Error('Invalid email or password.');
    }

    const sessionUser: User = {
      id: found.id,
      name: found.name,
      email: found.email,
      orgId: found.orgId,
    };

    setUser(sessionUser);
    saveSession(sessionUser);
  };

  const signOut = () => {
    setUser(null);
    saveSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
