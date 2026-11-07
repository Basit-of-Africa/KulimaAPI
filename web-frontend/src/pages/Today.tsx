import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Thermometer, Droplets, CloudRain, Wind, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { cached, formatAge, getSetup, type Cached } from '../lib/store';

interface CurrentWeather {
  temperatureC?: number;
  humidityPercent?: number;
  precipitationMm?: number;
  windSpeedKmh?: number;
}

interface ForecastDay {
  date: string;
  temperatureMaxC?: number;
  temperatureMinC?: number;
  precipitationMm?: number;
}

interface Risk {
  severity: string;
  title: string;
  description: string;
}

interface Recommendation {
  title: string;
  description: string;
  severity: string;
}

interface Intelligence {
  risks: Risk[];
  recommendations: Recommendation[];
  confidence: number;
  crop?: string;
}

const SEVERITY_COLOR: Record<string, string> = {
  low: 'bg-blue-50 text-blue-700 border-blue-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  extreme: 'bg-red-50 text-red-700 border-red-200',
};

function Stat({ icon: Icon, label, value }: { icon: typeof Thermometer; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 text-gray-400">
        <Icon size={13} />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-lg font-bold mt-1">{value}</p>
    </div>
  );
}

export default function Today() {
  const setup = getSetup()!;
  const [weather, setWeather] = useState<Cached<CurrentWeather> | null>(null);
  const [forecast, setForecast] = useState<Cached<ForecastDay[]> | null>(null);
  const [intel, setIntel] = useState<Cached<Intelligence> | null>(null);
  const [intelError, setIntelError] = useState<string | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setIntelError(null);
    setWeatherError(null);
    const base = `${setup.lat}/${setup.lng}`;
    const cropParam = setup.crop ? `?crop=${encodeURIComponent(setup.crop)}` : '';

    Promise.allSettled([
      cached(`weather:${base}`, () => api<CurrentWeather>(`/v1/weather/current/${base}`), 15 * 60_000),
      cached(`forecast:${base}`, async () => {
        const d = await api<{ days: ForecastDay[] }>(`/v1/weather/forecast/${base}?days=3`);
        return d.days;
      }, 60 * 60_000),
      cached(`intel:${base}${cropParam}`, () => api<Intelligence>(`/v1/farm/${base}/intelligence${cropParam}`), 30 * 60_000),
    ]).then(([w, f, i]) => {
      if (w.status === 'fulfilled') setWeather(w.value);
      else setWeatherError('Live weather is unavailable right now.');
      if (f.status === 'fulfilled') setForecast(f.value);
      if (i.status === 'fulfilled') {
        setIntel(i.value);
      } else {
        setIntelError('Advice data is unavailable right now — the server database appears to be offline.');
      }
      setLoading(false);
    });
  };

  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">{setup.name || 'Your farm'}</h1>
          <p className="text-xs text-gray-500">
            {setup.lat.toFixed(4)}, {setup.lng.toFixed(4)}
            {setup.crop ? ` · ${setup.crop}` : ''}
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

      {weatherError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {weatherError}
        </p>
      )}

      {weather ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Stat icon={Thermometer} label="Temperature" value={`${weather.data.temperatureC ?? '—'}°C`} />
            <Stat icon={Droplets} label="Humidity" value={`${weather.data.humidityPercent ?? '—'}%`} />
            <Stat icon={CloudRain} label="Rain" value={`${weather.data.precipitationMm ?? '—'} mm`} />
            <Stat icon={Wind} label="Wind" value={`${weather.data.windSpeedKmh ?? '—'} km/h`} />
          </div>
          <p className="text-[11px] text-gray-400 -mt-2">
            Updated {formatAge(weather.fetchedAt)}{weather.stale ? ' · offline copy' : ''}
          </p>
        </>
      ) : (
        !weatherError && loading && <p className="text-sm text-gray-400">Loading weather…</p>
      )}

      {forecast && forecast.data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next days</p>
          <div className="grid grid-cols-3 gap-2">
            {forecast.data.slice(0, 3).map((d) => (
              <div key={d.date} className="text-center">
                <p className="text-[11px] text-gray-400">
                  {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                </p>
                <p className="text-sm font-bold">{Math.round(d.temperatureMaxC ?? 0)}°</p>
                <p className="text-[11px] text-gray-500">{Math.round(d.temperatureMinC ?? 0)}°</p>
                <p className="text-[10px] text-blue-500">{d.precipitationMm ?? 0}mm</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <Sparkles size={13} className="text-leaf-600" /> Advice
          </p>
          {intel && (
            <span className="text-[11px] text-gray-400">
              {formatAge(intel.fetchedAt)}{intel.stale ? ' · offline' : ''}
            </span>
          )}
        </div>

        {intelError && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 p-3">
            <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-800">
              <p>{intelError}</p>
              <Link to="/advisor" className="font-medium underline mt-1 inline-block">
                Try the AI Advisor anyway
              </Link>
            </div>
          </div>
        )}

        {intel && (
          <>
            <div>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Confidence</span>
                <span className="font-semibold">{intel.data.confidence}/100</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    intel.data.confidence >= 70
                      ? 'bg-green-500'
                      : intel.data.confidence >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, intel.data.confidence))}%` }}
                />
              </div>
            </div>

            {intel.data.risks.length > 0 && (
              <div className="space-y-2">
                {intel.data.risks.slice(0, 3).map((r) => (
                  <div key={r.title} className="rounded-lg border border-gray-100 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{r.title}</p>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                          SEVERITY_COLOR[r.severity] || 'bg-gray-50 text-gray-600 border-gray-200'
                        }`}
                      >
                        {r.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
                  </div>
                ))}
              </div>
            )}

            {intel.data.recommendations.length > 0 && (
              <div className="space-y-2">
                {intel.data.recommendations.slice(0, 3).map((rec) => (
                  <div key={rec.title} className="rounded-lg bg-leaf-50 border border-leaf-100 p-2.5">
                    <p className="text-sm font-medium text-leaf-900">{rec.title}</p>
                    <p className="text-xs text-leaf-700 mt-0.5">{rec.description}</p>
                  </div>
                ))}
              </div>
            )}

            {intel.data.risks.length === 0 && intel.data.recommendations.length === 0 && (
              <p className="text-sm text-gray-500">
                No active risks or recommendations in the data for this location right now.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
