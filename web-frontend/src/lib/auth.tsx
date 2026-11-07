import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, getAccount, setAccount, type Account } from './api';

// Local profile store — same-device password sign-in.
// Passwords are stored in localStorage only; this is a prototype, not real auth.
const PROFILES_KEY = 'kulima_consumer_profiles';

interface StoredProfile {
  name: string;
  email: string;
  password: string;
  orgId: string;
  apiKey: string;
}

interface AuthContextType {
  account: Account | null;
  signUp: (name: string, email: string, password: string) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  restore: (recoveryCode: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadProfiles(): Record<string, StoredProfile> {
  try {
    return JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveProfiles(profiles: Record<string, StoredProfile>): void {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccountState] = useState<Account | null>(getAccount());

  const signUp = async (name: string, email: string, password: string): Promise<string> => {
    const profiles = loadProfiles();
    if (profiles[email]) throw new Error('An account with this email already exists on this device.');

    const orgId = crypto.randomUUID();
    const created = await api<{ key: string }>('/v1/auth/keys', {
      method: 'POST',
      body: JSON.stringify({ orgId, name: `${name}'s Farm` }),
    });

    profiles[email] = { name, email, password, orgId, apiKey: created.key };
    saveProfiles(profiles);

    const acct = { name, email, orgId, apiKey: created.key };
    setAccount(acct);
    setAccountState(acct);
    return created.key; // recovery code — shown once, restores the account elsewhere
  };

  const signIn = async (email: string, password: string): Promise<void> => {
    const profile = loadProfiles()[email];
    if (!profile || profile.password !== password) throw new Error('Invalid email or password on this device.');
    const acct = { name: profile.name, email: profile.email, orgId: profile.orgId, apiKey: profile.apiKey };
    setAccount(acct);
    setAccountState(acct);
  };

  const restore = async (recoveryCode: string): Promise<void> => {
    const apiKey = recoveryCode.trim();
    if (!apiKey.startsWith('kulima_')) throw new Error('That does not look like a Kulima recovery code.');
    const acct = { name: 'Farmer', email: '', apiKey };
    setAccount(acct);
    setAccountState(acct);
  };

  const signOut = (): void => {
    setAccount(null);
    setAccountState(null);
  };

  return (
    <AuthContext.Provider value={{ account, signUp, signIn, restore, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
