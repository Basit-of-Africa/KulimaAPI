import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sprout, CalendarDays, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { cached, formatAge, getSetup, type Cached } from '../lib/store';

interface SeasonResponse {
  season: { current: string; description: string; month: number; plantingAdvice: string };
  currentConditions: { temperatureC: number; humidityPercent: number; precipitationMm: number };
  forecast: { summary: Array<{ date: string; maxTempC: number; minTempC: number; precipitationMm: number }> };
}

interface PlantingWindow {
  crop: string;
  displayName: string;
  totalDaysToMaturity: number;
  optimalPlantingMonths: Array<{ month: number; name: string; isCurrentMonth: boolean }>;
  recommendation: string;
}

export default function Planting() {
  const setup = getSetup()!;
  const [season, setSeason] = useState<Cached<SeasonResponse> | null>(null);
  const [windowData, setWindowData] = useState<Cached<PlantingWindow> | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const errs: string[] = [];
    const tasks: Promise<unknown>[] = [
      cached(
        `season:${setup.lat}/${setup.lng}`,
        () => api<SeasonResponse>(`/v1/farm/${setup.lat}/${setup.lng}/season`),
        60 * 60_000
      )
        .then(setSeason)
        .catch(() => errs.push('Season data is unavailable right now (server offline).')),
    ];

    if (setup.crop) {
      tasks.push(
        cached(
          `planting:${setup.crop}`,
          () => api<PlantingWindow>(`/v2/crops/${encodeURIComponent(setup.crop!)}/planting-window`),
          24 * 60 * 60_000
        )
          .then(setWindowData)
          .catch(() => errs.push('Planting window for this crop is unavailable.'))
      );
    }

    Promise.all(tasks).finally(() => {
      setErrors([...errs]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Planting</h1>
        <p className="text-xs text-gray-500">
          {setup.name || 'Your farm'}
          {setup.crop ? ` · ${setup.crop}` : ' · no crop selected'}
        </p>
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800 space-y-0.5">
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        </div>
      )}

      {season && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <CalendarDays size={13} className="text-leaf-600" />
            Current season · updated {formatAge(season.fetchedAt)}
            {season.stale ? ' (offline copy)' : ''}
          </p>
          <p className="text-lg font-bold capitalize">{season.data.season.current} season</p>
          <p className="text-sm text-gray-600">{season.data.season.description}</p>
          <p className="text-sm text-leaf-700 font-medium">{season.data.season.plantingAdvice}</p>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <p className="text-xs text-gray-500">
              Temp <span className="font-semibold text-gray-800">{season.data.currentConditions.temperatureC}°C</span>
            </p>
            <p className="text-xs text-gray-500">
              Humidity <span className="font-semibold text-gray-800">{season.data.currentConditions.humidityPercent}%</span>
            </p>
            <p className="text-xs text-gray-500">
              Rain <span className="font-semibold text-gray-800">{season.data.currentConditions.precipitationMm}mm</span>
            </p>
          </div>
        </div>
      )}

      {windowData && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            <Sprout size={13} className="text-leaf-600" />
            {windowData.data.displayName} planting window
          </p>
          <p className="text-sm text-gray-700">{windowData.data.recommendation}</p>
          <div className="flex flex-wrap gap-1.5">
            {windowData.data.optimalPlantingMonths.map((m) => (
              <span
                key={m.month}
                className={`text-[11px] px-2 py-1 rounded-full border ${
                  m.isCurrentMonth
                    ? 'bg-leaf-600 text-white border-leaf-600 font-semibold'
                    : 'bg-leaf-50 text-leaf-700 border-leaf-100'
                }`}
              >
                {m.name}
                {m.isCurrentMonth ? ' · now' : ''}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-gray-400">
            Maturity: {windowData.data.totalDaysToMaturity} days · updated {formatAge(windowData.data ? windowData.fetchedAt : 0)}
          </p>
        </div>
      )}

      {!setup.crop && !loading && (
        <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center">
          <p className="text-sm text-gray-500">
            Pick a crop to see its planting window — change it in{' '}
            <Link to="/setup" className="text-leaf-700 font-medium underline">
              farm setup
            </Link>
            .
          </p>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400">Loading season data…</p>}
    </div>
  );
}
