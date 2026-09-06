import { db, providerStatus } from '../database/index.js';
import { eq, sql } from 'drizzle-orm';
import { getWeatherProvider, getGeoProvider } from '../providers/index.js';
import { createChildLogger } from '../logger.js';

const log = createChildLogger('health-check');

// ─── Provider Health Check Service ───────────────────────────────────────────

export interface ProviderHealth {
  name: string;
  category: string;
  status: 'operational' | 'degraded' | 'down';
  lastCheckedAt: Date;
  lastError?: string;
}

/**
 * Check the health of all registered providers and update the database.
 */
export async function checkProviderHealth(): Promise<ProviderHealth[]> {
  const results: ProviderHealth[] = [];

  // Check weather provider
  const weatherProvider = getWeatherProvider();
  const weatherHealth: ProviderHealth = {
    name: weatherProvider.name,
    category: 'weather',
    status: weatherProvider.isAvailable() ? 'operational' : 'degraded',
    lastCheckedAt: new Date(),
  };

  try {
    // Try a lightweight call (Lagos coordinates)
    await weatherProvider.getCurrentWeather(6.5, 3.4);
    weatherHealth.status = 'operational';
  } catch (err: any) {
    weatherHealth.status = 'degraded';
    weatherHealth.lastError = err.message?.slice(0, 500);
  }

  results.push(weatherHealth);

  // Check geo provider
  const geoProvider = getGeoProvider();
  const geoHealth: ProviderHealth = {
    name: geoProvider.name,
    category: 'geo',
    status: geoProvider.isAvailable() ? 'operational' : 'degraded',
    lastCheckedAt: new Date(),
  };

  try {
    await geoProvider.resolveLocation('Lagos');
    geoHealth.status = 'operational';
  } catch (err: any) {
    geoHealth.status = 'degraded';
    geoHealth.lastError = err.message?.slice(0, 500);
  }

  results.push(geoHealth);

  // Check database
  const dbHealth: ProviderHealth = {
    name: 'postgresql',
    category: 'database',
    status: 'operational',
    lastCheckedAt: new Date(),
  };

  try {
    await db.execute(sql`SELECT 1`);
  } catch (err: any) {
    dbHealth.status = 'down';
    dbHealth.lastError = err.message?.slice(0, 500);
  }

  results.push(dbHealth);

  // Persist results to provider_status table
  for (const health of results) {
    try {
      await db
        .insert(providerStatus)
        .values({
          name: health.name,
          category: health.category,
          status: health.status,
          lastCheckedAt: health.lastCheckedAt,
          lastError: health.lastError || null,
        })
        .onConflictDoUpdate({
          target: providerStatus.name,
          set: {
            status: health.status,
            lastCheckedAt: health.lastCheckedAt,
            lastError: health.lastError || null,
          },
        });
    } catch (err) {
      log.error({ provider: health.name }, 'Failed to update provider status');
    }
  }

  return results;
}

/**
 * Start the provider health check cron (runs every 5 minutes).
 */
export function startHealthCheckCron(): NodeJS.Timeout {
  log.info('Health check cron started (5min interval)');

  // Run immediately on start
  checkProviderHealth().catch((err) =>
    log.error(err, 'Initial health check failed')
  );

  return setInterval(() => {
    checkProviderHealth().catch((err) =>
      log.error(err, 'Scheduled health check failed')
    );
  }, 5 * 60 * 1000);
}

/**
 * Stop the health check cron.
 */
export function stopHealthCheckCron(interval: NodeJS.Timeout): void {
  clearInterval(interval);
  log.info('Health check cron stopped');
}
