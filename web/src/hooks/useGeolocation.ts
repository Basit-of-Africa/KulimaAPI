'use client';

import { useState, useCallback, useRef } from 'react';

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

interface UseGeolocationReturn {
  position: GeoPosition | null;
  error: string | null;
  loading: boolean;
  detect: () => Promise<GeoPosition | null>;
  clearError: () => void;
}

/**
 * Hook for browser-based GPS location detection.
 * Falls back to IP-based geolocation if GPS is unavailable.
 */
export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const detectGPS = useCallback((): Promise<GeoPosition | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos: GeoPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          setPosition(geoPos);
          setError(null);
          resolve(geoPos);
        },
        (err) => {
          let message = 'Unable to detect location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              message = 'Location permission denied. Please enable location access in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              message = 'Location information unavailable. Your device may not have GPS.';
              break;
            case err.TIMEOUT:
              message = 'Location request timed out. Please try again.';
              break;
          }
          setError(message);
          resolve(null);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 10000,
          maximumAge: options.maximumAge ?? 300000, // 5 minutes
        }
      );
    });
  }, [options.enableHighAccuracy, options.timeout, options.maximumAge]);

  const detectIP = useCallback(async (): Promise<GeoPosition | null> => {
    try {
      // Use a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();

      if (data.latitude && data.longitude) {
        const geoPos: GeoPosition = {
          latitude: data.latitude,
          longitude: data.longitude,
          accuracy: 10000, // IP-based is ~10km accuracy
          timestamp: Date.now(),
        };
        setPosition(geoPos);
        setError(null);
        return geoPos;
      }

      setError('Unable to determine location from IP');
      return null;
    } catch {
      setError('IP geolocation service unavailable');
      return null;
    }
  }, []);

  const detect = useCallback(async (): Promise<GeoPosition | null> => {
    setLoading(true);
    setError(null);

    // Try GPS first
    const gpsResult = await detectGPS();
    if (gpsResult) {
      setLoading(false);
      return gpsResult;
    }

    // Fallback to IP geolocation
    log.debug('GPS failed, trying IP geolocation');
    const ipResult = await detectIP();
    setLoading(false);
    return ipResult;
  }, [detectGPS, detectIP]);

  return { position, error, loading, detect, clearError };
}

function log = { debug: (msg: string) => console.log(`[GeoLocation] ${msg}`) };
