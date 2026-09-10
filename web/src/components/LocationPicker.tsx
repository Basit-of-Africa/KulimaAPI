'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Search, Loader2, X, ChevronDown } from 'lucide-react';
import { useGeolocation, type GeoPosition } from '@/hooks/useGeolocation';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
  value: { lat: number; lng: number; name?: string } | null;
  onChange: (location: { lat: number; lng: number; name?: string }) => void;
  placeholder?: string;
  className?: string;
  showMap?: boolean;
}

interface SearchResult {
  name: string;
  state?: string;
  lga?: string;
  latitude: number;
  longitude: number;
  type?: string;
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'Search location or use GPS...',
  className,
  showMap = false,
}: LocationPickerProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const { position, error: geoError, loading: geoLoading, detect } = useGeolocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search locations as user types
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/v1/locations/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        const searchResults: SearchResult[] = [];

        // Add LGA results
        if (data.lgas) {
          for (const lga of data.lgas) {
            searchResults.push({
              name: `${lga.name}, ${lga.state}`,
              state: lga.state,
              lga: lga.name,
              latitude: lga.latitude,
              longitude: lga.longitude,
              type: 'lga',
            });
          }
        }

        // Add geo provider result
        if (data.geoProvider) {
          searchResults.push({
            name: data.geoProvider.name,
            state: data.geoProvider.state,
            latitude: data.geoProvider.latitude,
            longitude: data.geoProvider.longitude,
            type: data.geoProvider.locationType,
          });
        }

        setResults(searchResults.slice(0, 8));
        setShowDropdown(searchResults.length > 0);
      } catch {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle GPS detection
  const handleDetectLocation = async () => {
    const pos = await detect();
    if (pos) {
      // Reverse geocode the GPS coordinates
      try {
        const res = await fetch(
          `/v1/locations/search?q=${pos.latitude.toFixed(2)},${pos.longitude.toFixed(2)}`
        );
        const data = await res.json();
        const name = data.geoProvider?.name || `${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`;
        setQuery(name);
        onChange({ lat: pos.latitude, lng: pos.longitude, name });
      } catch {
        setQuery(`${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`);
        onChange({ lat: pos.latitude, lng: pos.longitude });
      }
      setShowDropdown(false);
    }
  };

  // Select a result from dropdown
  const handleSelect = (result: SearchResult) => {
    setQuery(result.name);
    onChange({ lat: result.latitude, lng: result.longitude, name: result.name });
    setShowDropdown(false);
    setResults([]);
  };

  // Clear the picker
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    onChange({ lat: 0, lng: 0, name: '' });
    inputRef.current?.focus();
  };

  return (
    <div className={cn('relative', className)}>
      {/* Input + GPS button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            className="w-full pl-10 pr-8 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X size={14} className="text-gray-400" />
            </button>
          )}
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={geoLoading}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-kulima-600 text-white rounded-xl text-sm font-medium hover:bg-kulima-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          title="Auto-detect my location"
        >
          {geoLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Crosshair size={16} />
          )}
          <span className="hidden sm:inline">Detect</span>
        </button>
      </div>

      {/* GPS Error */}
      {geoError && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
          <MapPin size={12} />
          {geoError}
        </p>
      )}

      {/* Current coordinates display */}
      {value && value.lat !== 0 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-mono">
          📍 {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
        </p>
      )}

      {/* Search results dropdown */}
      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
        >
          {results.map((result, i) => (
            <button
              key={i}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
            >
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-kulima-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{result.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                    {result.type && ` · ${result.type}`}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Quick location buttons */}
      {!value?.lat && results.length === 0 && !geoLoading && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {[
            { name: 'Lagos', lat: 6.52, lng: 3.38 },
            { name: 'Abuja', lat: 9.06, lng: 7.49 },
            { name: 'Kano', lat: 12.0, lng: 8.52 },
            { name: 'Ibadan', lat: 7.38, lng: 3.94 },
            { name: 'Enugu', lat: 6.44, lng: 7.5 },
          ].map((loc) => (
            <button
              key={loc.name}
              onClick={() => {
                setQuery(loc.name);
                onChange({ lat: loc.lat, lng: loc.lng, name: loc.name });
              }}
              className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-kulima-50 hover:text-kulima-700 transition-colors"
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
