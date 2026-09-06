/**
 * Trend Analysis Module
 *
 * Analyses weather trends over 7, 14, and 30-day windows.
 * Detects increasing, decreasing, or stable patterns.
 */

export interface TrendDataPoint {
  date: string;
  value: number;
}

export interface TrendResult {
  direction: 'increasing' | 'decreasing' | 'stable';
  magnitude: number; // slope per day
  confidence: number; // 0-1
  average: number;
  min: number;
  max: number;
  total: number;
  anomaly: boolean;
  anomalyDescription?: string;
}

export interface MultiWindowTrends {
  rainfall: {
    window7: TrendResult;
    window14: TrendResult;
    window30: TrendResult;
  };
  temperature: {
    window7: TrendResult;
    window14: TrendResult;
    window30: TrendResult;
  };
  humidity: {
    window7: TrendResult;
    window14: TrendResult;
    window30: TrendResult;
  };
}

/**
 * Analyse trend in a series of values using linear regression.
 */
export function analyseTrend(data: TrendDataPoint[]): TrendResult {
  if (data.length < 2) {
    return {
      direction: 'stable',
      magnitude: 0,
      confidence: 0,
      average: data.length === 1 ? data[0].value : 0,
      min: 0,
      max: 0,
      total: 0,
      anomaly: false,
    };
  }

  const n = data.length;
  const values = data.map((d) => d.value);
  const average = values.reduce((a, b) => a + b, 0) / n;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const total = values.reduce((a, b) => a + b, 0);

  // Linear regression: y = mx + c
  const xMean = (n - 1) / 2;
  const yMean = average;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) * (i - xMean);
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;

  // R² for confidence
  const ssRes = values.reduce((sum, y, i) => {
    const predicted = slope * i + intercept;
    return sum + (y - predicted) ** 2;
  }, 0);
  const ssTot = values.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const confidence = Math.max(0, Math.min(1, r2));

  // Determine direction
  const threshold = average * 0.05; // 5% of average
  let direction: 'increasing' | 'decreasing' | 'stable';
  if (Math.abs(slope) < threshold) {
    direction = 'stable';
  } else if (slope > 0) {
    direction = 'increasing';
  } else {
    direction = 'decreasing';
  }

  // Detect anomalies (values > 2 standard deviations from mean)
  const variance = values.reduce((sum, v) => sum + (v - average) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const lastValue = values[n - 1];
  const anomaly = stdDev > 0 && Math.abs(lastValue - average) > 2 * stdDev;

  return {
    direction,
    magnitude: Math.round(slope * 1000) / 1000,
    confidence: Math.round(confidence * 100) / 100,
    average: Math.round(average * 10) / 10,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    total: Math.round(total * 10) / 10,
    anomaly,
    anomalyDescription: anomaly
      ? `Current value (${lastValue}) is significantly different from the ${n}-day average (${Math.round(average * 10) / 10})`
      : undefined,
  };
}

/**
 * Build multi-window trends for rainfall, temperature, and humidity.
 */
export function buildMultiWindowTrends(
  dailyData: Array<{
    date: string;
    rainfallMm: number;
    temperatureC: number;
    humidityPercent: number;
  }>,
): MultiWindowTrends {
  const slice = (days: number) => dailyData.slice(-days);

  const buildTrend = (values: TrendDataPoint[]): TrendResult => analyseTrend(values);

  const toRainfall = (d: typeof dailyData[0]): TrendDataPoint => ({ date: d.date, value: d.rainfallMm });
  const toTemp = (d: typeof dailyData[0]): TrendDataPoint => ({ date: d.date, value: d.temperatureC });
  const toHumidity = (d: typeof dailyData[0]): TrendDataPoint => ({ date: d.date, value: d.humidityPercent });

  return {
    rainfall: {
      window7: buildTrend(slice(7).map(toRainfall)),
      window14: buildTrend(slice(14).map(toRainfall)),
      window30: buildTrend(slice(30).map(toRainfall)),
    },
    temperature: {
      window7: buildTrend(slice(7).map(toTemp)),
      window14: buildTrend(slice(14).map(toTemp)),
      window30: buildTrend(slice(30).map(toTemp)),
    },
    humidity: {
      window7: buildTrend(slice(7).map(toHumidity)),
      window14: buildTrend(slice(14).map(toHumidity)),
      window30: buildTrend(slice(30).map(toHumidity)),
    },
  };
}

/**
 * Detect rainfall accumulation over a window.
 */
export function calculateRainfallAccumulation(
  dailyRainfall: Array<{ date: string; value: number }>,
  windowDays: number,
): { total: number; daily: Array<{ date: string; cumulative: number }> } {
  const window = dailyRainfall.slice(-windowDays);
  let cumulative = 0;
  return {
    total: window.reduce((sum, d) => sum + d.value, 0),
    daily: window.map((d) => {
      cumulative += d.value;
      return { date: d.date, cumulative: Math.round(cumulative * 10) / 10 };
    }),
  };
}
