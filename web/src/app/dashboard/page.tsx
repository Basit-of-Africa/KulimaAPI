'use client';

import { useState, useEffect } from 'react';
import { getStatus, getProviderHealth, getCrops, getStates } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import {
  Activity, Database, Cloud, Globe, Leaf, Satellite,
  ArrowUpRight, Sprout, MapPin, TrendingUp, Server,
  Zap, Shield
} from 'lucide-react';

function () {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, h] = await Promise.all([getStatus(), getProviderHealth()]);
        setStatus({ ...s, providers: h });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to <span className="text-kulima-600">KulimaAPI</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Agriculture Intelligence Platform — Turn raw environmental data into actionable decisions.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
          <p className="text-red-700 dark:text-red-400 text-sm">⚠️ {error}</p>
        </div>
      )}

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatusCard
          icon={Database}
          label="Database"
          value={status?.services?.database?.status || (loading ? 'checking' : 'unavailable')}
          detail={status?.services?.database?.message}
        />
        <StatusCard
          icon={Cloud}
          label="Weather"
          value={status?.services?.weather?.status || (loading ? 'checking' : 'unknown')}
          detail="Open-Meteo API"
        />
        <StatusCard
          icon={Globe}
          label="Geography"
          value={status?.services?.geo?.status || (loading ? 'checking' : 'unknown')}
          detail="Nigeria GeoProvider"
        />
        <StatusCard
          icon={Satellite}
          label="Satellite"
          value={status?.services?.satellite?.status || (loading ? 'checking' : 'unknown')}
          detail="SentinelHub + SoilGrids"
        />
      </div>

      {/* Quick Start */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Zap size={18} className="text-kulima-500" />
            Quick Start
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Get started with KulimaAPI in minutes. Here are some endpoints to try:
          </p>
          <div className="space-y-2">
            <EndpointCard method="GET" path="/v1/weather/current/6.5/3.4" desc="Current weather for Lagos" />
            <EndpointCard method="GET" path="/v2/crops/maize" desc="Maize growth profile" />
            <EndpointCard method="GET" path="/v2/soil/9.0/7.5" desc="Soil data for Abuja" />
            <EndpointCard method="GET" path="/v2/satellite/health/6.5/3.4" desc="Vegetation health" />
            <EndpointCard method="GET" path="/v1/locations/resolve?q=Kano" desc="Resolve location" />
            <EndpointCard method="GET" path="/v1/status" desc="Service status" />
          </div>
        </div>

        <div className="space-y-6">
          {/* System Info */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Server size={18} className="text-blue-500" />
              System Info
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <InfoItem label="Version" value={status?.version || '—'} />
              <InfoItem label="Status" value={status?.status || '—'} />
              <InfoItem label="Weather" value={status?.services?.weather?.name || '—'} />
              <InfoItem label="Geo" value={status?.services?.geo?.name || '—'} />
              <InfoItem label="Satellite" value={status?.services?.satellite?.name || '—'} />
              <InfoItem label="Soil" value={status?.services?.soil?.name || '—'} />
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-kulima-600 to-kulima-700 rounded-2xl p-6 text-white">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Shield size={18} />
              API Coverage
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-3xl font-bold">35+</div>
                <div className="text-kulima-100 text-sm">API Endpoints</div>
              </div>
              <div>
                <div className="text-3xl font-bold">7</div>
                <div className="text-kulima-100 text-sm">Crop Profiles</div>
              </div>
              <div>
                <div className="text-3xl font-bold">5</div>
                <div className="text-kulima-100 text-sm">Ag. Zones</div>
              </div>
              <div>
                <div className="text-3xl font-bold">4</div>
                <div className="text-kulima-100 text-sm">Data Providers</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nigerian Agricultural Zones */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPin size={18} className="text-kulima-500" />
          Nigerian Agricultural Zones
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <ZoneCard name="Sudan Savanna" desc="500-800mm rainfall" color="bg-amber-100 text-amber-800" crops="Millet, Sorghum, Cowpea" />
          <ZoneCard name="Northern Guinea" desc="800-1200mm rainfall" color="bg-yellow-100 text-yellow-800" crops="Maize, Sorghum, Soybean" />
          <ZoneCard name="Southern Guinea" desc="1200-1500mm rainfall" color="bg-lime-100 text-lime-800" crops="Yam, Maize, Rice" />
          <ZoneCard name="Derived Savanna" desc="1500-2000mm rainfall" color="bg-green-100 text-green-800" crops="Cassava, Cocoa, Oil Palm" />
          <ZoneCard name="Humid Forest" desc="2000-4000mm rainfall" color="bg-emerald-100 text-emerald-800" crops="Oil Palm, Rubber, Rice" />
        </div>
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, label, value, detail }: {
  icon: any; label: string; value: string; detail?: string;
}) {
  const statusColor: Record<string, string> = {
    operational: 'bg-green-500',
    connected: 'bg-green-500',
    degraded: 'bg-yellow-500',
    estimated: 'bg-blue-500',
    unavailable: 'bg-red-500',
    disconnected: 'bg-red-500',
    checking: 'bg-gray-400 animate-pulse',
    unknown: 'bg-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center justify-between mb-2">
        <Icon size={18} className="text-gray-400" />
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${statusColor[value] || 'bg-gray-400'}`} />
          <span className="text-xs font-medium text-gray-500 capitalize">{value}</span>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
      {detail && <p className="text-xs text-gray-400 mt-0.5 truncate">{detail}</p>}
    </div>
  );
}

function EndpointCard({ method, path, desc }: { method: string; path: string; desc: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
    POST: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400',
  };
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors group cursor-pointer">
      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${methodColors[method]}`}>
        {method}
      </span>
      <code className="text-xs text-gray-700 dark:text-gray-300 font-mono flex-1 truncate">{path}</code>
      <span className="text-[11px] text-gray-400 hidden lg:block whitespace-nowrap">{desc}</span>
      <ArrowUpRight size={12} className="text-gray-300 group-hover:text-kulima-500 transition-colors" />
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-400 text-xs">{label}</dt>
      <dd className="font-medium text-gray-900 dark:text-white text-sm">{value}</dd>
    </div>
  );
}

function ZoneCard({ name, desc, color, crops }: {
  name: string; desc: string; color: string; crops: string;
}) {
  return (
    <div className={`rounded-xl p-3 ${color} border border-transparent`}>
      <p className="text-sm font-semibold">{name}</p>
      <p className="text-xs opacity-75 mt-0.5">{desc}</p>
      <p className="text-xs mt-1.5 font-medium">{crops}</p>
    </div>
  );
}


