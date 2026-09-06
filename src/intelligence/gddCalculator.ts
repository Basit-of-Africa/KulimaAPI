/**
 * Growing Degree Day (GDD) Calculator
 *
 * GDD = Σ max(0, (Tmax + Tmin) / 2 - Tbase)
 *
 * For daily data: GDD = max(0, (Tmax + Tmin) / 2 - Tbase)
 */

export interface DailyTemperature {
  date: string; // YYYY-MM-DD
  minC: number;
  maxC: number;
}

export interface GddAccumulation {
  totalGdd: number;
  dailyGdd: Array<{ date: string; gdd: number; cumulative: number }>;
  daysElapsed: number;
}

/**
 * Calculate GDD for a single day.
 */
export function calculateDailyGdd(
  maxTempC: number,
  minTempC: number,
  baseTempC: number,
): number {
  const avgTemp = (maxTempC + minTempC) / 2;
  return Math.max(0, avgTemp - baseTempC);
}

/**
 * Calculate accumulated GDD over a date range.
 */
export function calculateAccumulatedGdd(
  temperatures: DailyTemperature[],
  baseTempC: number,
): GddAccumulation {
  let cumulative = 0;
  const dailyGdd = temperatures.map((day) => {
    const gdd = calculateDailyGdd(day.maxC, day.minC, baseTempC);
    cumulative += gdd;
    return {
      date: day.date,
      gdd: Math.round(gdd * 10) / 10,
      cumulative: Math.round(cumulative * 10) / 10,
    };
  });

  return {
    totalGdd: Math.round(cumulative * 10) / 10,
    dailyGdd,
    daysElapsed: temperatures.length,
  };
}

/**
 * Estimate the current growth stage based on accumulated GDD.
 */
export function estimateGrowthStage(
  accumulatedGdd: number,
  stages: Array<{ name: string; gddRange: { min: number; max: number } }>,
): string | null {
  for (const stage of stages) {
    if (accumulatedGdd >= stage.gddRange.min && accumulatedGdd < stage.gddRange.max) {
      return stage.name;
    }
  }
  // If beyond all stages, return the last one
  if (stages.length > 0 && accumulatedGdd >= stages[stages.length - 1].gddRange.max) {
    return stages[stages.length - 1].name;
  }
  return null;
}

/**
 * Estimate days to next growth stage transition.
 */
export function estimateDaysToNextStage(
  currentGdd: number,
  currentStage: { gddRange: { min: number; max: number } },
  avgDailyGdd: number,
): number {
  const gddRemaining = currentStage.gddRange.max - currentGdd;
  if (avgDailyGdd <= 0) return Infinity;
  return Math.ceil(gddRemaining / avgDailyGdd);
}

/**
 * Calculate avg daily GDD from a temperature series.
 */
export function calculateAvgDailyGdd(
  temperatures: DailyTemperature[],
  baseTempC: number,
): number {
  if (temperatures.length === 0) return 0;
  const total = calculateAccumulatedGdd(temperatures, baseTempC);
  return total.totalGdd / temperatures.length;
}

/**
 * Predict maturity date given current GDD, total GDD needed, and avg daily GDD.
 */
export function predictMaturityDate(
  currentAccumulatedGdd: number,
  totalGddNeeded: number,
  avgDailyGdd: number,
  startDate: Date,
): Date | null {
  if (avgDailyGdd <= 0) return null;
  const gddRemaining = totalGddNeeded - currentAccumulatedGdd;
  if (gddRemaining <= 0) return new Date(); // Already mature
  const daysRemaining = Math.ceil(gddRemaining / avgDailyGdd);
  const maturityDate = new Date(startDate);
  maturityDate.setDate(maturityDate.getDate() + daysRemaining);
  return maturityDate;
}
