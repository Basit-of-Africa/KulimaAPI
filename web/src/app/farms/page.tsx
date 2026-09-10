'use client';

import { withAuth } from '@/components/withAuth';
import { useState, useEffect } from 'react';
import { MapPin, Cloud, Thermometer, Droplets, Wind, Leaf, Crosshair, Loader2 } from 'lucide-react';
import { getBatchWeather, getWeather, getVegetationHealth, getSoilProfile } from '@/lib/api';
import { cn, getNdviColor } from '@/lib/utils';
import { LocationPicker } from '@/components/LocationPicker';
import { useGeolocation } from '@/hooks/useGeolocation';

const SAMPLE_FARMS = [
  { name: 'Lagos Farm Alpha', lat: 6.52, lng: 3.38, crop: 'cassava', area: 5.2 },
  { name: 'Kano Maize Field', lat: 12.0, lng: 8.52, crop: 'maize', area: 12.0 },
  { name: 'Enugu Yam Farm', lat: 6.44, lng: 7.5, crop: 'yam', area: 8.5 },
  { name: 'Kaduna Sorghum', lat: 10.52, lng: 7.43, crop: 'sorghum', area: 15.0 },
  { name: 'Rivers Rice Paddy', lat: 4.82, lng: 7.05, crop: 'rice', area: 10.0 },
];

const CROP_COLORS: Record<string, string> = {
  maize: '#FFD700', rice: '#90EE90', cassava: '#DEB887', yam: '#D2B48C',
  sorghum: '#CD853F', cowpea: '#98FB98', groundnut: '#F5DEB3',
};

function Page() {
  const [farms] = useState(SAMPLE_FARMS);
  const [selected, setSelected] = useState<any>(null);
  const [weather, setWeather] = useState<Record<string, any>>({});
  const [ndvi, setNdvi] = useState<Record<string, any>>({});
  const [soil, setSoil] = useState<Record<string, any>>({});

  useEffect(() => {
    async function loadData() {
      try {
        const locs = farms.map(f => ({ lat: f.lat, lng: f.lng }));
        const w = await getBatchWeather(locs);
        const weatherMap: Record<string, any> = {};
        w.results?.forEach((r: any, i: number) => { weatherMap[farms[i].name] = r; });
        setWeather(weatherMap);
      } catch { /* Weather may fail without DNS */ }
    }
    loadData();
  }, []);

  const loadDetails = async (farm: any) => {
    setSelected(farm);
    const key = `${farm.lat},${farm.lng}`;
    try {
      const [h, s] = await Promise.all([
        getVegetationHealth(farm.lat, farm.lng).catch(() => null),
        getSoilProfile(farm.lat, farm.lng).catch(() => null),
      ]);
      if (h) setNdvi(prev => ({ ...prev, [key]: h }));
      if (s) setSoil(prev => ({ ...prev, [key]: s }));
    } catch {}
  };

  const w = selected ? weather[selected.name] : null;
  const n = selected ? ndvi[`${selected.lat},${selected.lng}`] : null;
  const s = selected ? soil[`${selected.lat},${selected.lng}`] : null;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapPin size={24} className="text-kulima-500" /> Farm Map
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Interactive overview of registered farms</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Nigeria Farm Locations</h3>
          </div>
          <div className="relative bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 h-[480px]">
            <svg viewBox="0 0 400 350" className="w-full h-full p-4">
              <path d="M120,50 L180,30 L240,25 L300,35 L350,60 L370,100 L360,140 L340,180 L350,220 L340,260 L300,290 L250,310 L200,320 L150,310 L100,280 L70,240 L60,190 L70,140 L80,100 L90,70 Z" fill="none" stroke="#22c55e" strokeWidth="2" opacity="0.3" />
              {farms.map((farm, i) => {
                const x = ((farm.lng - 2) / 12) * 300 + 50;
                const y = ((14 - farm.lat) / 10) * 260 + 30;
                const isSel = selected?.name === farm.name;
                const color = CROP_COLORS[farm.crop] || '#22c55e';
                return (
                  <g key={i} onClick={() => loadDetails(farm)} className="cursor-pointer">
                    {isSel && <circle cx={x} cy={y} r="16" fill={color} opacity="0.2"><animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" /></circle>}
                    <circle cx={x} cy={y} r={isSel ? 10 : 7} fill={color} stroke="white" strokeWidth="2" className="drop-shadow transition-all" />
                    <text x={x} y={y - 14} textAnchor="middle" className="text-[9px] fill-gray-700 dark:fill-gray-300 font-medium pointer-events-none">{farm.name.length > 18 ? farm.name.slice(0, 18) + '…' : farm.name}</text>
                  </g>
                );
              })}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg p-3 shadow-sm">
              <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Crops</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(CROP_COLORS).map(([crop, color]) => (
                  <div key={crop} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[9px] text-gray-600 dark:text-gray-400 capitalize">{crop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Farm List */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-3 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Registered Farms</h3>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[200px] overflow-auto">
              {farms.map((farm, i) => (
                <button key={i} onClick={() => loadDetails(farm)} className={cn('w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors', selected?.name === farm.name && 'bg-kulima-50 dark:bg-kulima-950')}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CROP_COLORS[farm.crop] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{farm.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{farm.crop} · {farm.area} ha</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Selected Farm Details */}
          {selected && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{selected.name}</h3>

              {/* Weather */}
              {w && !w.error && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Weather</p>
                  <div className="grid grid-cols-2 gap-2">
                    <WeatherStat icon={Thermometer} label="Temp" value={`${w.temperatureC}°C`} color="text-orange-500" />
                    <WeatherStat icon={Droplets} label="Humidity" value={`${w.humidityPercent}%`} color="text-blue-500" />
                    <WeatherStat icon={Wind} label="Wind" value={`${w.windSpeedKmh} km/h`} color="text-gray-500" />
                    <WeatherStat icon={Cloud} label="Rain" value={`${w.precipitationMm}mm`} color="text-gray-400" />
                  </div>
                </div>
              )}

              {/* NDVI */}
              {n && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Vegetation Health</p>
                  <div className={cn('p-3 rounded-lg border', getNdviColor(n.ndvi), 'bg-gray-50 dark:bg-gray-800')}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold capitalize">{n.status?.replace(/_/g, ' ')}</span>
                      <span className="text-xs font-mono">NDVI: {n.ndvi?.toFixed(3)}</span>
                    </div>
                    <p className="text-xs mt-1 opacity-75">{n.description}</p>
                  </div>
                </div>
              )}

              {/* Soil */}
              {s && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Soil Profile</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-gray-400">Type</span>
                      <p className="font-medium capitalize">{s.soilType}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-gray-400">pH</span>
                      <p className="font-medium">{s.ph}</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-gray-400">Org. Carbon</span>
                      <p className="font-medium">{s.organicCarbon} g/kg</p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <span className="text-gray-400">Drainage</span>
                      <p className="font-medium capitalize">{s.drainage?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                </div>
              )}

              {!w && !n && !s && (
                <p className="text-sm text-gray-400 text-center py-4">Loading farm data...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeatherStat({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
      <Icon size={14} className={color} />
      <div>
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className="text-xs font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}


export default withAuth(Page);