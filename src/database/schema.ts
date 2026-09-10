import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// =============================================================================
// Users & Organisations
// =============================================================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: varchar('plan', { length: 50 }).default('free').notNull(),
  monthlyQuota: integer('monthly_quota').default(1000).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// =============================================================================
// API Keys
// =============================================================================

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organisations.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }),
    keyHash: varchar('key_hash', { length: 255 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    rateLimit: integer('rate_limit').default(1000).notNull(),
    monthlyQuota: integer('monthly_quota').default(1000).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('api_keys_key_hash_idx').on(table.keyHash),
    index('api_keys_org_id_idx').on(table.orgId),
  ]
);

// =============================================================================
// API Usage
// =============================================================================

export const apiUsage = pgTable(
  'api_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apiKeyId: uuid('api_key_id')
      .references(() => apiKeys.id, { onDelete: 'cascade' })
      .notNull(),
    endpoint: varchar('endpoint', { length: 255 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(),
    statusCode: integer('status_code').notNull(),
    responseTimeMs: integer('response_time_ms'),
    provider: varchar('provider', { length: 100 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('api_usage_api_key_id_idx').on(table.apiKeyId),
    index('api_usage_timestamp_idx').on(table.timestamp),
  ]
);

// =============================================================================
// Farms
// =============================================================================

export const farms = pgTable(
  'farms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organisations.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    crop: varchar('crop', { length: 100 }),
    areaHectares: real('area_hectares'),
    plantingDate: timestamp('planting_date', { withTimezone: true }),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('farms_org_id_idx').on(table.orgId),
    index('farms_lat_lng_idx').on(table.latitude, table.longitude),
  ]
);

// =============================================================================
// Crop Profiles
// =============================================================================

export const cropProfiles = pgTable(
  'crop_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }).notNull(),
    minTemperatureC: real('min_temperature_c').notNull(),
    maxTemperatureC: real('max_temperature_c').notNull(),
    preferredTemperatureC: real('preferred_temperature_c').notNull(),
    rainfallMinMm: real('rainfall_min_mm').notNull(),
    rainfallMaxMm: real('rainfall_max_mm').notNull(),
    waterSensitivity: varchar('water_sensitivity', { length: 50 }).notNull(),
    windSensitivity: varchar('wind_sensitivity', { length: 50 }).notNull(),
    humidityMinPercent: real('humidity_min_percent'),
    humidityMaxPercent: real('humidity_max_percent'),
    germinationConditions: jsonb('germination_conditions'),
    growthStageRequirements: jsonb('growth_stage_requirements'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('crop_profiles_name_idx').on(table.name)]
);

// =============================================================================
// Agricultural Rules
// =============================================================================

export const agriculturalRules = pgTable(
  'agricultural_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }).notNull(),
    crops: jsonb('crops'), // array of crop names, null = applies to all
    regions: jsonb('regions'), // array of region codes, null = applies to all
    conditions: jsonb('conditions').notNull(), // rule conditions
    recommendation: text('recommendation').notNull(),
    severity: varchar('severity', { length: 20 }).default('medium').notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('agricultural_rules_category_idx').on(table.category)]
);

// =============================================================================
// Location Cache
// =============================================================================

export const locations = pgTable(
  'locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    nameLower: varchar('name_lower', { length: 255 }).notNull(),
    country: varchar('country', { length: 100 }).default('Nigeria').notNull(),
    state: varchar('state', { length: 100 }),
    lga: varchar('lga', { length: 100 }),
    ward: varchar('ward', { length: 100 }),
    city: varchar('city', { length: 100 }),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    timezone: varchar('timezone', { length: 50 }).default('Africa/Lagos').notNull(),
    locationType: varchar('location_type', { length: 50 }),
  },
  (table) => [
    index('locations_name_lower_idx').on(table.nameLower),
    index('locations_state_lga_idx').on(table.state, table.lga),
    index('locations_lat_lng_idx').on(table.latitude, table.longitude),
  ]
);

// =============================================================================
// Weather & Forecast Cache
// =============================================================================

export const weatherCache = pgTable(
  'weather_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    dataType: varchar('data_type', { length: 50 }).notNull(),
    data: jsonb('data').notNull(),
    source: varchar('source', { length: 100 }).notNull(),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('weather_cache_coords_idx').on(table.latitude, table.longitude),
    index('weather_cache_expires_idx').on(table.expiresAt),
  ]
);

// =============================================================================
// Intelligence Results Cache
// =============================================================================

export const intelligenceResults = pgTable(
  'intelligence_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requestId: varchar('request_id', { length: 100 }).notNull().unique(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    crop: varchar('crop', { length: 100 }),
    data: jsonb('data').notNull(),
    confidence: real('confidence'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('intelligence_results_coords_idx').on(table.latitude, table.longitude),
    index('intelligence_results_created_idx').on(table.createdAt),
  ]
);

// =============================================================================
// Alerts
// =============================================================================

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 100 }).notNull(),
    severity: varchar('severity', { length: 20 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),
    recommendedAction: text('recommended_action'),
    confidence: real('confidence'),
    startsAt: timestamp('starts_at', { withTimezone: true }),
    endsAt: timestamp('ends_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('alerts_farm_id_idx').on(table.farmId),
    index('alerts_type_idx').on(table.type),
  ]
);

// =============================================================================
// Webhooks
// =============================================================================

export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organisations.id, { onDelete: 'cascade' })
      .notNull(),
    url: varchar('url', { length: 500 }).notNull(),
    events: jsonb('events').notNull(), // array of event types
    secret: varchar('secret', { length: 255 }).notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('webhooks_org_id_idx').on(table.orgId)]
);

// =============================================================================
// Webhook Deliveries
// =============================================================================

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
      .references(() => webhooks.id, { onDelete: 'cascade' })
      .notNull(),
    event: varchar('event', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    statusCode: integer('status_code'),
    response: text('response'),
    success: boolean('success').default(false).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('webhook_deliveries_webhook_id_idx').on(table.webhookId),
    index('webhook_deliveries_success_idx').on(table.success),
  ]
);

// =============================================================================
// Provider Status
// =============================================================================

export const providerStatus = pgTable('provider_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  category: varchar('category', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('operational').notNull(),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastError: text('last_error'),
  metadata: jsonb('metadata'),
});

// =============================================================================
// CEA — Controlled Environment Agriculture
// =============================================================================

// ─── CEA Environments ─────────────────────────────────────────────────────

export const environments = pgTable(
  'environments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .references(() => organisations.id, { onDelete: 'cascade' })
      .notNull(),
    farmId: uuid('farm_id').references(() => farms.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    altitude: real('altitude'),
    infrastructure: jsonb('infrastructure').notNull(),
    sensors: jsonb('sensors').notNull(),
    status: varchar('status', { length: 20 }).default('active').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('environments_org_id_idx').on(table.orgId),
    index('environments_farm_id_idx').on(table.farmId),
    index('environments_type_idx').on(table.type),
  ]
);

// ─── CEA Environment Crops ────────────────────────────────────────────────

export const environmentCrops = pgTable(
  'environment_crops',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    cropName: varchar('crop_name', { length: 100 }).notNull(),
    variety: varchar('variety', { length: 100 }),
    plantingDate: timestamp('planting_date', { withTimezone: true }).notNull(),
    areaM2: real('area_m2').notNull(),
    density: real('density').notNull(),
    growthStage: varchar('growth_stage', { length: 50 }),
    substrate: varchar('substrate', { length: 50 }),
    nutrientRecipe: varchar('nutrient_recipe', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('environment_crops_env_id_idx').on(table.environmentId),
  ]
);

// ─── CEA Environment Readings (Time-Series) ───────────────────────────────

export const environmentReadings = pgTable(
  'environment_readings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    indoorTemperatureC: real('indoor_temperature_c'),
    indoorHumidityPercent: real('indoor_humidity_percent'),
    indoorCO2Ppm: real('indoor_co2_ppm'),
    indoorLightLux: real('indoor_light_lux'),
    rootZoneTemperatureC: real('root_zone_temperature_c'),
    soilMoisturePercent: real('soil_moisture_percent'),
    waterTemperatureC: real('water_temperature_c'),
    waterPH: real('water_ph'),
    waterEC: real('water_ec'),
    outdoorTemperatureC: real('outdoor_temperature_c'),
    outdoorHumidityPercent: real('outdoor_humidity_percent'),
    outdoorWindSpeedKmh: real('outdoor_wind_speed_kmh'),
    powerConsumptionKWh: real('power_consumption_kwh'),
    source: varchar('source', { length: 20 }).default('sensor').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('env_readings_env_time_idx').on(table.environmentId, table.timestamp),
  ]
);

// ─── CEA Control Actions Log ──────────────────────────────────────────────

export const controlActions = pgTable(
  'control_actions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    controlType: varchar('control_type', { length: 50 }).notNull(),
    action: text('action').notNull(),
    beforeState: jsonb('before_state'),
    afterState: jsonb('after_state'),
    triggeredBy: varchar('triggered_by', { length: 20 }).notNull(),
    recommendationId: varchar('recommendation_id', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('control_actions_env_id_idx').on(table.environmentId),
    index('control_actions_timestamp_idx').on(table.timestamp),
  ]
);

// ─── CEA Nutrient Schedules ───────────────────────────────────────────────

export const nutrientSchedules = pgTable(
  'nutrient_schedules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    cropName: varchar('crop_name', { length: 100 }).notNull(),
    growthStage: varchar('growth_stage', { length: 50 }),
    solution: jsonb('solution').notNull(),
    irrigationSchedule: jsonb('irrigation_schedule').notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('nutrient_schedules_env_id_idx').on(table.environmentId),
  ]
);

// ─── CEA Energy Log ──────────────────────────────────────────────────────

export const energyLog = pgTable(
  'energy_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    environmentId: uuid('environment_id')
      .references(() => environments.id, { onDelete: 'cascade' })
      .notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    deviceType: varchar('device_type', { length: 50 }).notNull(),
    powerKW: real('power_kw'),
    durationMinutes: real('duration_minutes'),
    kwh: real('kwh').notNull(),
    costNGN: real('cost_ngn'),
    source: varchar('source', { length: 20 }).default('meter').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('energy_log_env_id_idx').on(table.environmentId),
    index('energy_log_timestamp_idx').on(table.timestamp),
  ]
);
