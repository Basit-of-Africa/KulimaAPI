import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Plus, Trash2, KeyRound, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { getSetup, saveSetup } from '../lib/store';

interface Farm {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  crop: string | null;
  status: string;
}

export default function Farms() {
  const { account, signOut } = useAuth();
  const navigate = useNavigate();
  const setup = getSetup();

  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!account) return;
    setLoading(true);
    setError(null);
    api<{ farms: Farm[] }>('/v1/farms')
      .then((d) => setFarms(d.farms))
      .catch((err) =>
        setError(
          `${err.message} Your farm is still saved on this device — sync will work when the server database is online.`
        )
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [account]);

  const addCurrent = async () => {
    if (!setup || !account) return;
    setBusy(true);
    setNote(null);
    try {
      await api('/v1/farms', {
        method: 'POST',
        body: JSON.stringify({
          name: setup.name || 'My farm',
          latitude: setup.lat,
          longitude: setup.lng,
          crop: setup.crop,
        }),
      });
      setNote('Farm saved to your account.');
      load();
    } catch (err: any) {
      setNote(`Could not sync: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await api(`/v1/farms/${id}`, { method: 'DELETE' });
      setFarms((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      setNote(`Could not delete: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const switchToFarm = (farm: Farm) => {
    saveSetup({ lat: farm.latitude, lng: farm.longitude, name: farm.name, crop: farm.crop || undefined });
    navigate('/');
  };

  const copyKey = async () => {
    if (!account) return;
    await navigator.clipboard.writeText(account.apiKey).catch(() => undefined);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!account) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">My farms</h1>
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-center space-y-3">
          <KeyRound size={22} className="mx-auto text-leaf-600" />
          <p className="text-sm text-gray-600">
            Sign in to keep your farms on the server and use them on any device. Without an account,
            your farm stays on this device only.
          </p>
          <button
            type="button"
            onClick={() => navigate('/auth')}
            className="bg-leaf-600 hover:bg-leaf-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl"
          >
            Sign in or create account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">My farms</h1>
          <p className="text-xs text-gray-500">Signed in as {account.name}</p>
        </div>
        <button type="button" onClick={signOut} className="text-xs text-gray-500 underline">
          Sign out
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">{error}</p>
        </div>
      )}
      {note && <p className="text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2">{note}</p>}

      {setup && (
        <button
          type="button"
          onClick={addCurrent}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-leaf-500 text-leaf-700 text-sm font-medium py-3 rounded-xl disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Save current farm ({setup.lat.toFixed(3)}, {setup.lng.toFixed(3)}) to my account
        </button>
      )}

      {loading && <p className="text-sm text-gray-400">Loading farms…</p>}

      <div className="space-y-2">
        {farms.map((farm) => (
          <div key={farm.id} className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <MapPin size={16} className="text-leaf-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{farm.name}</p>
              <p className="text-[11px] text-gray-400">
                {farm.latitude.toFixed(3)}, {farm.longitude.toFixed(3)}
                {farm.crop ? ` · ${farm.crop}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => switchToFarm(farm)}
              className="text-xs font-medium text-leaf-700 bg-leaf-50 px-2.5 py-1.5 rounded-lg"
            >
              Use
            </button>
            <button
              type="button"
              onClick={() => remove(farm.id)}
              disabled={busy}
              className="text-gray-400 hover:text-red-500 disabled:opacity-40"
              title="Delete farm"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!loading && farms.length === 0 && !error && (
          <p className="text-sm text-gray-500 text-center py-4">No farms saved to your account yet.</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <KeyRound size={13} /> Recovery code
        </p>
        <p className="text-[11px] text-gray-500">
          This code restores your account (and your farms) on another device. Keep it secret.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 truncate">
            {showKey ? account.apiKey : 'kulima_••••••••••••••••'}
          </code>
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-2"
          >
            {showKey ? 'Hide' : 'Reveal'}
          </button>
          <button
            type="button"
            onClick={copyKey}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-2"
            title="Copy recovery code"
          >
            {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
