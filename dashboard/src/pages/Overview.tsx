import { useEffect, useState } from 'react';
import { Server, Database, Cloud, Globe, Activity, Clock } from 'lucide-react';
import { getHealth, getProviderHealth } from '../lib/api';

interface HealthStatus {
  status: string;
  uptime: number;
}

interface ProviderStatus {
  database: string;
  weather: string;
  geo: string;
}

export default function Overview() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [providers, setProviders] = useState<ProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [h, p] = await Promise.all([getHealth(), getProviderHealth()]);
        setHealth(h);
        setProviders(p);
      } catch (err: any) {
        setError(err.message || 'Failed to connect to API');
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-500 mt-1">Monitor your KulimaAPI deployment</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
          <p className="text-red-500 text-xs mt-1">
            Make sure the API server is running on port 3000.
          </p>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatusCard
          icon={Activity}
          label="API Status"
          value={health?.status === 'ok' ? 'Operational' : 'Checking...'}
          ok={health?.status === 'ok'}
          loading={loading}
        />
        <StatusCard
          icon={Clock}
          label="Uptime"
          value={health ? formatUptime(health.uptime) : '—'}
          ok={true}
          loading={loading}
        />
        <StatusCard
          icon={Database}
          label="Database"
          value={providers?.database || 'Checking...'}
          ok={providers?.database === 'connected'}
          loading={loading}
        />
        <StatusCard
          icon={Cloud}
          label="Weather Provider"
          value={providers?.weather || 'Checking...'}
          ok={providers?.weather === 'operational'}
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start</h3>
        <div className="space-y-3">
          <QuickAction
            method="GET"
            path="/v1/farm/6.5/3.4/intelligence"
            description="Get agricultural intelligence for Lagos"
          />
          <QuickAction
            method="GET"
            path="/v1/weather/current/6.5/3.4"
            description="Current weather for Lagos"
          />
          <QuickAction
            method="GET"
            path="/v1/location/resolve?q=Kano"
            description="Resolve location for Kano"
          />
          <QuickAction
            method="GET"
            path="/v1/farm/9.3/12.4/intelligence?crop=maize"
            description="Maize intelligence for Adamawa"
          />
        </div>
      </div>

      {/* System Info */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">System Information</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Version</dt>
            <dd className="font-medium text-gray-900">1.0.0</dd>
          </div>
          <div>
            <dt className="text-gray-500">Documentation</dt>
            <dd>
              <a href="/docs" className="text-kulima-600 hover:underline font-medium">
                Swagger UI →
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Base URL</dt>
            <dd className="font-mono text-xs text-gray-900">http://localhost:3000/v1</dd>
          </div>
          <div>
            <dt className="text-gray-500">Geo Provider</dt>
            <dd className="font-medium text-gray-900">{providers?.geo || '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  ok,
  loading,
}: {
  icon: any;
  label: string;
  value: string;
  ok: boolean;
  loading: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="text-gray-400" />
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            loading ? 'bg-yellow-400 animate-pulse' : ok ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}

function QuickAction({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
      <span
        className={`px-2 py-0.5 rounded text-xs font-bold ${
          method === 'GET' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}
      >
        {method}
      </span>
      <code className="text-xs text-gray-700 font-mono flex-1">{path}</code>
      <span className="text-xs text-gray-400 hidden lg:block">{description}</span>
    </div>
  );
}
