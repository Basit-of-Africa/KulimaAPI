// ─── Intelligence Layer Types ────────────────────────────────────────────────

export interface CropProfile {
  name: string;
  displayName: string;
  minTemperatureC: number;
  maxTemperatureC: number;
  preferredTemperatureC: number;
  rainfallMinMm: number;
  rainfallMaxMm: number;
  waterSensitivity: string;
  windSensitivity: string;
  humidityMinPercent?: number;
  humidityMaxPercent?: number;
  germinationConditions?: Record<string, any>;
  growthStageRequirements?: Record<string, any>;
}

export interface IntelligenceRequest {
  latitude: number;
  longitude: number;
  crop?: string;
  includeForecast?: boolean;
  forecastDays?: number;
}

export interface Risk {
  category: string;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  title: string;
  description: string;
  evidence: Record<string, any>;
  confidence: number;
  triggeredBy: string[];
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  evidence: Record<string, any>;
  confidence: number;
  validFrom: string;
  validUntil: string;
  crop?: string;
}

export interface IntelligenceResponse {
  location: {
    latitude: number;
    longitude: number;
    resolvedName?: string;
    state?: string;
    lga?: string;
  };
  weather: {
    current: Record<string, any>;
    source: string;
    retrievedAt: string;
  };
  risks: Risk[];
  recommendations: Recommendation[];
  confidence: number;
  crop?: string;
  generatedAt: string;
  dataAge?: string;
}
