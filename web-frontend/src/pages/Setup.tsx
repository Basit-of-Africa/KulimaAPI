import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Crosshair, Loader2, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { api } from '../lib/api';
import { getSetup, saveSetup, type FarmSetup } from '../lib/store';
import { useAuth } from '../lib/auth';

// Quick-pick coordinates taken from the existing demo data in the repo (web/ farm map)
const QUICK_PLACES: Array<{ name: string; lat: number; lng: number }> = [
  { name: 'Lagos', lat: 6.52, lng: 3.38 },
  { name: 'Kano', lat: 12.0, lng: 8.52 },
  { name: 'Enugu', lat: 6.44, lng: 7.5 },
  { name: 'Kaduna', lat: 10.52, lng: 7.43 },
  { name: 'Port Harcourt', lat: 4.82, lng: 7.05 },
];

interface SearchResult {
  name: string;
  state?: string;
  latitude: number;
  longitude: number;
}

interface Crop {
  name: string;
  displayName: string;
}

export default function Setup() {
  const navigate = useNavigate();
  const { account } = useAuth();
  const existing = getSetup();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<FarmSetup | null>(existing);
  const [latText, setLatText] = useState(existing ? String(existing.lat) : '');
  const [lngText, setLngText] = useState(existing ? String(existing.lng) : '');
  const [crop, setCrop] = useState(existing?.crop || '');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<{ crops: Crop[] }>('/v2/crops')
      .then((d) => setCrops(d.crops))
      .catch(() => setCrops([]));
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    searchTimer.current = setTimeout(() => {
      setSearching(true);
      api<{ lgas: SearchResult[] }>(`/v1/locations/search?q=${encodeURIComponent(query.trim())}`)
        .then((d) => setResults(d.lgas || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const pick = (r: SearchResult) => {
    setSelected({ lat: r.latitude, lng: r.longitude, name: r.state ? `${r.name}, ${r.state}` : r.name });
    setLatText(String(r.latitude));
    setLngText(String(r.longitude));
    setResults([]);
    setQuery(r.state ? `${r.name}, ${r.state}` : r.name);
  };

  const applyCoords = () => {
    const lat = parseFloat(latText);
    const lng = parseFloat(lngText);
    if (Number.isNaN(lat) || Number.isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setError('Enter valid coordinates: latitude -90 to 90, longitude -180 to 180.');
      return null;
    }
    const next = { lat, lng, name: selected?.name, crop: crop || undefined };
    setSelected(next);
    setError(null);
    return next;
  };

  const detectGps = () => {
    if (!navigator.geolocation) {
      setError('GPS is not available in this browser.');
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'My location', crop: crop || undefined };
        setSelected(next);
        setLatText(String(next.lat));
        setLngText(String(next.lng));
        setDetecting(false);
      },
      () => {
        setDetecting(false);
        setError('Could not read your location. Search or enter coordinates instead.');
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  };

  const continueTo = async () => {
    const setup = applyCoords();
    if (!setup) return;
    const finalSetup: FarmSetup = { ...setup, crop: crop || undefined };
    saveSetup(finalSetup);

    if (account) {
      try {
        await api('/v1/farms', {
          method: 'POST',
          body: JSON.stringify({
            name: finalSetup.name || 'My farm',
            latitude: finalSetup.lat,
            longitude: finalSetup.lng,
            crop: finalSetup.crop,
          }),
        });
      } catch {
        setNote('Saved on this device. Sync to your account failed (server database offline) — you can retry from Farms.');
      }
    }
    navigate('/');
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{existing ? 'Update your farm location' : 'Set up your farm'}</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pick where your farm is and what you grow.</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
      {note && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800">{note}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</label>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search LGA or state…"
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          />
          {searching && (
            <Loader2 size={15} className="absolute right-3 top-3 text-gray-400 animate-spin" />
          )}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-auto">
              {results.map((r) => (
                <li key={`${r.name}-${r.state}-${r.latitude}`}>
                  <button
                    type="button"
                    onClick={() => pick(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-leaf-50"
                  >
                    {r.name}
                    {r.state ? <span className="text-gray-400">, {r.state}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_PLACES.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => pick({ name: p.name, latitude: p.lat, longitude: p.lng })}
              className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-leaf-500 hover:text-leaf-700"
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={detectGps}
          disabled={detecting}
          className="flex items-center gap-2 text-xs font-medium text-leaf-700 bg-leaf-50 border border-leaf-100 px-3 py-2 rounded-lg disabled:opacity-60"
        >
          {detecting ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
          {detecting ? 'Locating…' : 'Use my GPS location'}
        </button>

        <div className="grid grid-cols-2 gap-3">
          <input
            value={latText}
            onChange={(e) => setLatText(e.target.value)}
            onBlur={applyCoords}
            placeholder="Latitude (e.g. 6.52)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <input
            value={lngText}
            onChange={(e) => setLngText(e.target.value)}
            onBlur={applyCoords}
            placeholder="Longitude (e.g. 3.38)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        {selected && (
          <p className="flex items-center gap-1.5 text-xs text-leaf-700">
            <MapPin size={13} />
            {selected.name ? `${selected.name} — ` : ''}
            {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-2">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">What do you grow?</label>
        <select
          value={crop}
          onChange={(e) => setCrop(e.target.value)}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="">Not decided yet</option>
          {crops.map((c) => (
            <option key={c.name} value={c.name}>
              {c.displayName || c.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={continueTo}
        disabled={!latText || !lngText}
        className="w-full flex items-center justify-center gap-2 bg-leaf-600 hover:bg-leaf-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl text-sm"
      >
        <CheckCircle2 size={16} />
        {account ? 'Continue & sync to my account' : 'Continue'}
      </button>
      {!account && (
        <p className="text-center text-xs text-gray-400">
          Saving on this device only.{' '}
          <button type="button" onClick={() => navigate('/auth')} className="text-leaf-700 font-medium">
            Sign in
          </button>{' '}
          to sync across devices.
        </p>
      )}
    </div>
  );
}
