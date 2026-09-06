import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { optionalAuth } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import {
  getCropGrowthProfile,
  getAllCropGrowthProfiles,
  type CropGrowthProfile,
} from '../intelligence/growthStages.js';
import { calculateAccumulatedGdd, predictMaturityDate } from '../intelligence/gddCalculator.js';
import { getWeatherProvider } from '../providers/index.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('routes/crops');

export default async function cropRoutes(app: FastifyInstance) {
  const weatherProvider = getWeatherProvider();

  // ─── GET /v2/crops — List all crop profiles ───────────────────────────
  app.get('/v2/crops', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (_request: FastifyRequest, reply: FastifyReply) => {
      const profiles = getAllCropGrowthProfiles();
      return {
        count: profiles.length,
        crops: profiles.map((p) => ({
          name: p.cropName,
          displayName: p.displayName,
          totalDays: p.totalDays,
          totalGdd: p.totalGdd,
          baseTemperature: p.baseTemperature,
          stagesCount: p.stages.length,
          optimalPlantingMonths: p.optimalPlantingMonths,
          minRainfallSeason: p.minRainfallSeason,
        })),
      };
    },
  });

  // ─── GET /v2/crops/:name — Detailed crop profile ──────────────────────
  app.get('/v2/crops/:name', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { name } = request.params as { name: string };
      const profile = getCropGrowthProfile(name);
      if (!profile) {
        return reply.code(404).send({
          error: 'Not Found',
          message: `Crop "${name}" not found. Available: ${getAllCropGrowthProfiles().map((p) => p.cropName).join(', ')}`,
        });
      }
      return profile;
    },
  });

  // ─── GET /v2/crops/:name/growth-stage — Current growth stage ──────────
  app.get('/v2/crops/:name/growth-stage', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { name } = request.params as { name: string };
      const { lat, lng, planting_date } = request.query as any;
      const profile = getCropGrowthProfile(name);

      if (!profile) {
        return reply.code(404).send({ error: 'Not Found', message: `Crop "${name}" not found.` });
      }

      if (!planting_date) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'planting_date query parameter is required (YYYY-MM-DD).',
        });
      }

      const plantingDate = new Date(planting_date);
      const now = new Date();
      const daysSincePlanting = Math.floor((now.getTime() - plantingDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get temperature data to calculate GDD
      let accumulatedGdd = 0;
      let avgDailyGdd = 0;

      try {
        const latitude = lat ? parseFloat(lat) : 9.0;
        const longitude = lng ? parseFloat(lng) : 7.5;
        const forecast = await weatherProvider.getForecast(latitude, longitude, Math.min(daysSincePlanting, 16));

        // Calculate GDD from forecast data (use as proxy for historical)
        const temperatures = forecast.days.map((d) => ({
          date: d.date,
          minC: d.temperatureMinC,
          maxC: d.temperatureMaxC,
        }));

        const gddResult = calculateAccumulatedGdd(temperatures, profile.baseTemperature);
        accumulatedGdd = gddResult.totalGdd * (daysSincePlanting / Math.max(1, temperatures.length));
        avgDailyGdd = gddResult.totalGdd / Math.max(1, temperatures.length);
      } catch {
        // Use rough estimate: avg 8 GDD/day for tropical crops
        avgDailyGdd = 8;
        accumulatedGdd = daysSincePlanting * avgDailyGdd;
      }

      // Find current stage
      let currentStage = profile.stages[0];
      for (const stage of profile.stages) {
        if (accumulatedGdd >= stage.gddRange.min) {
          currentStage = stage;
        }
      }

      // Find next stage
      const currentIdx = profile.stages.indexOf(currentStage);
      const nextStage = currentIdx < profile.stages.length - 1 ? profile.stages[currentIdx + 1] : null;

      // Days to next stage
      let daysToNextStage = Infinity;
      if (nextStage && avgDailyGdd > 0) {
        const gddRemaining = nextStage.gddRange.min - accumulatedGdd;
        daysToNextStage = Math.max(0, Math.ceil(gddRemaining / avgDailyGdd));
      }

      // Predict maturity date
      const maturityDate = predictMaturityDate(
        accumulatedGdd,
        profile.totalGdd,
        avgDailyGdd,
        plantingDate,
      );

      // Progress percentage
      const progress = Math.min(100, (accumulatedGdd / profile.totalGdd) * 100);

      return {
        crop: profile.cropName,
        displayName: profile.displayName,
        plantingDate: planting_date,
        daysSincePlanting,
        accumulatedGdd: Math.round(accumulatedGdd),
        totalGddNeeded: profile.totalGdd,
        avgDailyGdd: Math.round(avgDailyGdd * 10) / 10,
        progress: Math.round(progress),
        currentStage: {
          name: currentStage.name,
          displayName: currentStage.displayName,
          order: currentStage.order,
          isCritical: currentStage.isCritical,
          risks: currentStage.risks,
          recommendations: currentStage.recommendations,
        },
        nextStage: nextStage
          ? { name: nextStage.name, displayName: nextStage.displayName, daysEstimated: daysToNextStage }
          : null,
        estimatedMaturityDate: maturityDate?.toISOString().split('T')[0] || null,
      };
    },
  });

  // ─── GET /v2/crops/compare — Crop comparison ──────────────────────────
  app.get('/v2/crops/compare', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { lat, lng } = request.query as any;

      if (!lat || !lng) {
        return reply.code(400).send({
          error: 'Bad Request',
          message: 'lat and lng query parameters are required.',
        });
      }

      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      try {
        const weather = await weatherProvider.getCurrentWeather(latitude, longitude);
        const forecast = await weatherProvider.getForecast(latitude, longitude, 14);
        const profiles = getAllCropGrowthProfiles();

        const comparisons = profiles.map((profile) => {
          // Score suitability based on current conditions
          let score = 50; // Base score

          // Temperature suitability
          if (
            weather.temperatureC >= profile.stages[0].temperatureRange.min &&
            weather.temperatureC <= profile.stages[0].temperatureRange.max
          ) {
            score += 15;
          } else {
            score -= 10;
          }

          // Check forecast for rainfall suitability
          const totalForecastRain = forecast.days.reduce((sum, d) => sum + d.precipitationMm, 0);
          if (totalForecastRain >= profile.minRainfallSeason * 0.1) {
            score += 10;
          }

          // Check planting month
          const currentMonth = new Date().getMonth() + 1;
          if (profile.optimalPlantingMonths.includes(currentMonth)) {
            score += 15;
          } else {
            score -= 5;
          }

          // Wind suitability
          if (weather.windSpeedKmh < 30) {
            score += 5;
          }

          score = Math.max(0, Math.min(100, score));

          return {
            crop: profile.cropName,
            displayName: profile.displayName,
            score,
            totalDays: profile.totalDays,
            optimalPlantingMonths: profile.optimalPlantingMonths,
            isPlantingMonth: profile.optimalPlantingMonths.includes(currentMonth),
            currentConditionsMatch: score > 60,
          };
        });

        // Sort by score
        comparisons.sort((a, b) => b.score - a.score);

        return {
          location: { latitude, longitude },
          currentWeather: {
            temperatureC: weather.temperatureC,
            humidityPercent: weather.humidityPercent,
            precipitationMm: weather.precipitationMm,
            windSpeedKmh: weather.windSpeedKmh,
          },
          currentMonth: new Date().getMonth() + 1,
          crops: comparisons,
          recommended: comparisons[0],
        };
      } catch (err) {
        log.error(err, 'Crop comparison failed');
        return reply.code(500).send({
          error: 'Internal Error',
          message: 'Failed to compare crops.',
        });
      }
    },
  });

  // ─── GET /v2/crops/:name/planting-window ──────────────────────────────
  app.get('/v2/crops/:name/planting-window', {
    preHandler: [optionalAuth, trackUsage],
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { name } = request.params as { name: string };
      const profile = getCropGrowthProfile(name);

      if (!profile) {
        return reply.code(404).send({ error: 'Not Found', message: `Crop "${name}" not found.` });
      }

      const monthNames = [
        '', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];

      const now = new Date();
      const currentMonth = now.getMonth() + 1;

      // Find optimal and acceptable planting windows
      const optimalMonths = profile.optimalPlantingMonths.map((m) => ({
        month: m,
        name: monthNames[m],
        isCurrentMonth: m === currentMonth,
      }));

      // Generate 12-month forecast of planting suitability
      const monthlySuitability = Array.from({ length: 12 }, (_, i) => {
        const month = ((currentMonth - 1 + i) % 12) + 1;
        const isOptimal = profile.optimalPlantingMonths.includes(month);
        const isNearOptimal = profile.optimalPlantingMonths.some(
          (om) => Math.abs(om - month) <= 1 || Math.abs(om - month) >= 11,
        );

        return {
          month,
          name: monthNames[month],
          monthsFromNow: i,
          suitability: isOptimal ? 'optimal' : isNearOptimal ? 'acceptable' : 'poor',
          isCurrentMonth: month === currentMonth,
        };
      });

      // Find next optimal month
      const nextOptimal = monthlySuitability.find((m) => m.suitability === 'optimal' && m.monthsFromNow > 0);

      return {
        crop: profile.cropName,
        displayName: profile.displayName,
        totalDaysToMaturity: profile.totalDays,
        minRainfallSeasonDays: profile.minRainfallSeason,
        optimalPlantingMonths: optimalMonths,
        nextOptimalMonth: nextOptimal || null,
        twelveMonthOutlook: monthlySuitability,
        recommendation: nextOptimal
          ? `Best time to plant ${profile.displayName} is in ${nextOptimal.name} (${nextOptimal.monthsFromNow} months from now).`
          : `Optimal planting window has passed for this season. Consider planting in ${optimalMonths[0]?.name || 'the next rainy season'}.`,
      };
    },
  });
}
