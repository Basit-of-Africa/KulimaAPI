import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '../lib/auth';

type Mode = 'create' | 'signin' | 'restore';

export default function Auth() {
  const { signUp, signIn, restore } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [issuedKey, setIssuedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === 'create') {
        if (!name.trim() || !email.trim() || password.length < 6) {
          throw new Error('Enter a name, email, and a password of at least 6 characters.');
        }
        const key = await signUp(name.trim(), email.trim(), password);
        setIssuedKey(key);
      } else if (mode === 'signin') {
        if (!email.trim() || !password) throw new Error('Enter your email and password.');
        await signIn(email.trim(), password);
        navigate('/');
      } else {
        if (!recoveryCode.trim()) throw new Error('Paste your recovery code.');
        await restore(recoveryCode);
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (issuedKey) {
    return (
      <div className="space-y-4 pt-6">
        <div className="text-center space-y-1">
          <KeyRound size={26} className="mx-auto text-leaf-600" />
          <h1 className="text-lg font-bold">Save your recovery code</h1>
          <p className="text-xs text-gray-500">
            This is the only way to restore your account and farms on another device. It will not be
            shown again.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-amber-300 p-4 space-y-3">
          <code className="block text-xs break-all bg-amber-50 border border-amber-200 rounded-lg p-3">
            {issuedKey}
          </code>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(issuedKey).catch(() => undefined);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium border border-gray-200 rounded-lg py-2.5"
            >
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 bg-leaf-600 hover:bg-leaf-700 text-white text-sm font-medium rounded-lg py-2.5"
            >
              I saved it — continue
            </button>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 text-center">
          Prototype note: passwords on this device are stored in your browser only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-6 max-w-sm mx-auto">
      <div className="text-center">
        <h1 className="text-lg font-bold">
          {mode === 'create' ? 'Create your account' : mode === 'signin' ? 'Welcome back' : 'Restore on this device'}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {mode === 'restore'
            ? 'Enter the recovery code from when you signed up.'
            : 'Accounts sync your farms across devices.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-white border border-gray-200 rounded-lg p-1">
        {(
          [
            ['create', 'Sign up'],
            ['signin', 'Sign in'],
            ['restore', 'Restore'],
          ] as Array<[Mode, string]>
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`py-1.5 rounded-md text-xs font-medium ${
              mode === m ? 'bg-leaf-600 text-white' : 'text-gray-500'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {mode === 'create' && (
          <>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password (min 6 characters)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
          </>
        )}

        {mode === 'signin' && (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <p className="text-[11px] text-gray-400">Password sign-in works on this device only.</p>
          </>
        )}

        {mode === 'restore' && (
          <textarea
            value={recoveryCode}
            onChange={(e) => setRecoveryCode(e.target.value)}
            rows={3}
            placeholder="kulima_…"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-mono resize-none"
          />
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-leaf-600 hover:bg-leaf-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg"
        >
          {busy && <Loader2 size={15} className="animate-spin" />}
          {mode === 'create' ? 'Create account' : mode === 'signin' ? 'Sign in' : 'Restore account'}
        </button>
      </div>
    </div>
  );
}
