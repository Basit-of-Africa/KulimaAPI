import { useState } from 'react';
import { MapPin, Cloud, Leaf, Thermometer, Droplets, Wind } from 'lucide-react';

interface FarmData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  crop?: string;
  areaHectares?: number;
  riskScore?: number;
}

const SAMPLE_FARMS: FarmData[] = [
  { id: '1', name: 'Lagos Farm Alpha', latitude: 6.52, longitude: 3.38, crop: 'cassava', areaHectares: 5.2 },
  { id: '2', name: 'Kano Maize Field', latitude: 12.0, longitude: 8.52, crop: 'maize', areaHectares: 12.0 },
  { id: '3', name: 'Enugu Yam Farm', latitude: 6.44, longitude: 7.5, crop: 'yam', areaHectares: 8.5 },
  { id: '4', name: 'Kaduna Sorghum', latitude: 10.52, longitude: 7.43, crop: 'sorghum', areaHectares: 15.0 },
  { id: '5', name: 'Rivers Rice Paddy', latitude: 4.82, longitude: 7.05, crop: 'rice', areaHectares: 10.0 },
];

const WEATHER_DATA: Record<string, any> = {
  '1': { temp: 25.3, humidity: 93, wind: 4.3, condition: 'overcast' },
  '2': { temp: 22.9, humidity: 95, wind: 4.3, condition: 'clear' },
  '3': { temp: 23.2, humidity: 90, wind: 1.6, condition: 'overcast' },
  '4': { temp: 21.5, humidity: 85, wind: 8.2, condition: 'partly_cloudy' },
  '5': { temp: 26.1, humidity: 88, wind: 5.5, condition: 'light_rain' },
};

const CROP_COLORS: Record<string, string> = {
  maize: '#FFD700',
  rice: '#90EE90',
  cassava: '#DEB887',
  yam: '#D2B48C',
  sorghum: '#CD853F',
  cowpea: '#98FB98',
  groundnut: '#F5DEB3',
};

export default function FarmMap() {
  const [selectedFarm, setSelectedFarm] = useState<FarmData | null>(null);
  const [farms] = useState<FarmData[]>(SAMPLE_FARMS);

  const selectedWeather = selectedFarm ? WEATHER_DATA[selectedFarm.id] : null;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Farm Overview Map</h2>
        <p className="text-gray-500 mt-1">Monitor all registered farms across Nigeria</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Nigeria Farm Locations</h3>
            <span className="text-xs text-gray-500">{farms.length} farms</span>
          </div>
          <div className="relative bg-gradient-to-br from-green-50 to-blue-50 h-[500px]">
            {/* Simplified Nigeria map with farm pins */}
            <svg viewBox="0 0 400 350" className="w-full h-full p-4">
              {/* Simplified Nigeria outline */}
              <path
                d="M120,50 L180,30 L240,25 L300,35 L350,60 L370,100 L360,140 L340,180 L350,220 L340,260 L300,290 L250,310 L200,320 L150,310 L100,280 L70,240 L60,190 L70,140 L80,100 L90,70 Z"
                fill="none"
                stroke="#22c55e"
                strokeWidth="2"
                className="opacity-40"
              />
              {/* State borders hint */}
              <line x1="150" y1="100" x2="300" y2="110" stroke="#22c55e" strokeWidth="0.5" opacity="0.2" />
              <line x1="120" y1="160" x2="340" y2="150" stroke="#22c55e" strokeWidth="0.5" opacity="0.2" />
              <line x1="100" y1="220" x2="350" y2="210" stroke="#22c55e" strokeWidth="0.5" opacity="0.2" />

              {/* Farm pins */}
              {farms.map((farm) => {
                // Convert lat/lng to SVG coordinates (simplified mapping)
                const x = ((farm.longitude - 2) / 12) * 300 + 50;
                const y = ((14 - farm.latitude) / 10) * 260 + 30;
                const isSelected = selectedFarm?.id === farm.id;
                const color = CROP_COLORS[farm.crop || ''] || '#22c55e';

                return (
                  <g
                    key={farm.id}
                    onClick={() => setSelectedFarm(farm)}
                    className="cursor-pointer"
                  >
                    {/* Pulse ring for selected */}
                    {isSelected && (
                      <circle cx={x} cy={y} r="16" fill={color} opacity="0.2">
                        <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* Pin */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isSelected ? '10' : '7'}
                      fill={color}
                      stroke="white"
                      strokeWidth="2"
                      className="drop-shadow-sm transition-all"
                    />
                    {/* Label */}
                    <text
                      x={x}
                      y={y - 14}
                      textAnchor="middle"
                      className="text-[9px] fill-gray-700 font-medium pointer-events-none"
                    >
                      {farm.name.length > 15 ? farm.name.substring(0, 15) + '…' : farm.name}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm">
              <p className="text-xs font-semibold text-gray-700 mb-2">Crops</p>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(CROP_COLORS).map(([crop, color]) => (
                  <div key={crop} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[10px] text-gray-600 capitalize">{crop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Farm List + Details */}
        <div className="space-y-4">
          {/* Selected Farm Details */}
          {selectedFarm && selectedWeather && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{selectedFarm.name}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Crop</span>
                  <span className="font-medium capitalize">{selectedFarm.crop || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Area</span>
                  <span className="font-medium">{selectedFarm.areaHectares} ha</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Coordinates</span>
                  <span className="font-medium font-mono">{selectedFarm.latitude}, {selectedFarm.longitude}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-700 mb-2">Current Weather</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Thermometer size={12} className="text-orange-500" />
                    <span>{selectedWeather.temp}°C</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Droplets size={12} className="text-blue-500" />
                    <span>{selectedWeather.humidity}%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wind size={12} className="text-gray-500" />
                    <span>{selectedWeather.wind} km/h</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Cloud size={12} className="text-gray-400" />
                    <span className="capitalize">{selectedWeather.condition.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Farm List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Registered Farms</h3>
            </div>
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-auto">
              {farms.map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => setSelectedFarm(farm)}
                  className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                    selectedFarm?.id === farm.id ? 'bg-green-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: CROP_COLORS[farm.crop || ''] || '#22c55e' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{farm.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{farm.crop || 'No crop'}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
