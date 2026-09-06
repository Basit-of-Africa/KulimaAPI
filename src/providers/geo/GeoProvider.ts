// =============================================================================
// Geo Provider Interface
// =============================================================================

export interface GeoLocation {
  name: string;
  country: string;
  state?: string;
  lga?: string;
  ward?: string;
  city?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  locationType?: string;
}

export interface GeoBoundary {
  type: 'state' | 'lga' | 'ward';
  name: string;
  state?: string;
  coordinates: number[][][];
}

export interface GeoProvider {
  name: string;
  isAvailable(): boolean;

  /**
   * Resolve a text query (e.g. "Lagos, Nigeria") to a location with coordinates.
   */
  resolveLocation(query: string): Promise<GeoLocation | null>;

  /**
   * Reverse-geocode coordinates to get location details.
   */
  reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation | null>;

  /**
   * Get the boundary polygon for a named area.
   */
  getBoundary(name: string, type: 'state' | 'lga' | 'ward'): Promise<GeoBoundary | null>;
}
