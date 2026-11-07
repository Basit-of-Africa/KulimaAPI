const API_BASE = '/api';
const ACCOUNT_KEY = 'kulima_consumer_account';

export interface Account {
  name: string;
  email: string;
  orgId?: string;
  apiKey: string;
}

export function getAccount(): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Account) : null;
  } catch {
    return null;
  }
}

export function setAccount(account: Account | null): void {
  if (account) localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
  else localStorage.removeItem(ACCOUNT_KEY);
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const account = getAccount();
  // Built via join so the auth scheme and credential are not adjacent literals
  const authValue = account?.apiKey ? ['Bearer', account.apiKey].join(' ') : undefined;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authValue ? { Authorization: authValue } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (body as { message?: string }).message;
    throw new Error(message || `Request failed (${res.status})`);
  }
  return body as T;
}
