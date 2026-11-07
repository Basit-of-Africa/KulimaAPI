import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { cached, formatAge, getSetup, type Cached } from '../lib/store';

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  recommendedAction: string | null;
  confidence: number;
}

interface AlertsResponse {
  alerts: Alert[];
  total: number;
  generatedAt: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  low: 'border-blue-200 bg-blue-50 text-blue-700',
  medium: 'border-amber-200 bg-amber-50 text-amber-700',
  high: 'border-orange-200 bg-orange-50 text-orange-700',
  extreme: 'border-red-200 bg-red-50 text-red-700',
};

export default function Alerts() {
  const setup = getSetup()!;
  const [result, setResult] = useState<Cached<AlertsResponse> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    const cropParam = setup.crop ? `?crop=${encodeURIComponent(setup.crop)}` : '';
    cached(
      `alerts:${setup.lat}/${setup.lng}${cropParam}`,
      () => api<AlertsResponse>(`/v1/farm/${setup.lat}/${setup.lng}/alerts${cropParam}`),
      15 * 60_000
    )
      .then(setResult)
      .catch(() =>
        setError('Alerts are unavailable right now — the server database appears to be offline.')
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">Alerts</h1>
          <p className="text-xs text-gray-500">
            {setup.name || 'Your farm'} · {setup.lat.toFixed(3)}, {setup.lng.toFixed(3)}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-2.5 py-1.5"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">{error}</p>
        </div>
      )}

      {result && (
        <p className="text-[11px] text-gray-400">
          Updated {formatAge(result.fetchedAt)}{result.stale ? ' · offline copy' : ''} · {result.data.total} active
        </p>
      )}

      {result && result.data.alerts.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-4">
          <ShieldCheck size={16} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">No active alerts</p>
            <p className="text-xs text-green-700 mt-0.5">
              Nothing in the current data needs your attention for this location.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {result?.data.alerts.map((alert) => (
          <div
            key={alert.id}
            className={`rounded-xl border p-4 ${
              SEVERITY_STYLE[alert.severity] || 'border-gray-200 bg-white text-gray-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{alert.title}</p>
              <span className="text-[10px] font-bold uppercase">{alert.severity}</span>
            </div>
            <p className="text-xs mt-1 opacity-90">{alert.message}</p>
            {alert.recommendedAction && (
              <p className="text-xs mt-2 font-medium">→ {alert.recommendedAction}</p>
            )}
            <p className="text-[10px] mt-2 opacity-60">Confidence {alert.confidence}/100 · {alert.type}</p>
          </div>
        ))}
      </div>

      {loading && !result && !error && <p className="text-sm text-gray-400">Loading alerts…</p>}
    </div>
  );
}
