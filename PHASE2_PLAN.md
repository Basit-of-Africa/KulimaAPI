# KulimaAPI — Phase 2 Implementation Plan

> **"From MVP to Production: Deep Intelligence, Real Farms, and Satellite Eyes"**

---

## Overview

Phase 1 delivered a working API with weather intelligence, basic rules, and a developer dashboard. Phase 2 transforms KulimaAPI into a **production-grade agricultural intelligence platform** with:

- **Deep crop intelligence** with growth-stage-aware recommendations
- **Real farm management** with monitoring, alerts, and history
- **Satellite data** for vegetation health and soil moisture
- **Smarter rules** with multi-day trend analysis and crop-specific thresholds
- **API maturity** with versioning, pagination, and bulk endpoints

Phase 2 runs across **3 sprints** (3 weeks for a small team, 6 weeks part-time).

---

## Architecture Changes

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│   Dashboard (React) + Mobile SDK + Third-party Integrations  │
├──────────────────────────────────────────────────────────────┤
│                     API LAYER (Fastify)                      │
│  v2 Routes → Controllers → Middleware → Schemas              │
│  (auth, rate-limit, validation, pagination, bulk)            │
├──────────────────────────────────────────────────────────────┤
│               INTELLIGENCE LAYER (Enhanced)                  │
│  Rules Engine v2 → Trend Analysis → Crop Growth Models       │
│  → Confidence v2 → Multi-day Risk Aggregation                │
├──────────────────────────────────────────────────────────────┤
│              PROVIDER LAYER (Expanded)                       │
│  WeatherProvider ←→ OpenMeteoProvider                        │
│  GeoProvider ←→ NigeriaGeoProvider                           │
│  SatelliteProvider ←→ SentinelHubProvider (NEW)              │
│  SoilProvider ←→ SoilGridsProvider (NEW)                     │
├──────────────────────────────────────────────────────────────┤
│                 DATA LAYER                                   │
│  PostgreSQL + PostGIS │ Redis │ S3/MinIO (satellite tiles)  │
│  (crops, rules, API keys, usage, farms, locations,           │
│   satellite_cache, soil_data, growth_models)                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Work Streams

### WS-9: Crop Intelligence Deep Dive
**Owner:** Senior Engineer | **Sprint:** 1–2

| # | Task | Details |
|---|---|---|
| 9.1 | Enhance crop profiles | Add growth stage definitions with precise temperature/rainfall/wind thresholds per stage |
| 9.2 | Build crop calendar engine | Determine current growth stage from planting date + accumulated GDD (Growing Degree Days) |
| 9.3 | Implement stage-aware rules | Rules that trigger differently at germination vs flowering vs grain fill |
| 9.4 | Build crop comparison endpoint | `GET /v1/crops/compare?lat=&lng=` — which crops are best suited at a location |
| 9.5 | Add crop phenology data | Emergence, tillering, flowering, maturity timing for each crop |
| 9.6 | Implement GDD calculator | Accumulate growing degree days from daily temperatures |
| 9.7 | Build crop-specific alerts | Critical period warnings (e.g., "maize flowering in 5 days — ensure water availability") |
| 9.8 | Add planting date optimiser | `GET /v1/crops/:crop/planting-window?lat=&lng=` — best planting dates based on historical rainfall |

**Deliverable:** Crop growth stage tracking, stage-aware intelligence, planting optimiser.

---

### WS-10: Farm Management v2
**Owner:** Backend Engineer | **Sprint:** 1–2

| # | Task | Details |
|---|---|---|
| 10.1 | Farm dashboard endpoint | `GET /v1/farms/dashboard` — aggregated view across all farms |
| 10.2 | Farm monitoring cron | Background job: check all farms daily, generate alerts proactively |
| 10.3 | Farm history tracking | Store daily intelligence snapshots per farm for trend analysis |
| 10.4 | Farm comparison endpoint | `POST /v1/farms/compare` — compare conditions across multiple farms |
| 10.5 | Bulk farm intelligence | `POST /v1/farms/batch-intelligence` — intelligence for multiple farms at once |
| 10.6 | Farm notes & observations | `POST /v1/farms/:id/notes` — farmers record what they observe |
| 10.7 | Farm groups | Organise farms into named groups (e.g., "Northern Operations") |
| 10.8 | Farm export | `GET /v1/farms/export` — CSV/JSON export of farm data |

**Deliverable:** Multi-farm management, proactive monitoring, historical tracking.

---

### WS-11: Satellite & Soil Data Providers
**Owner:** Senior Engineer | **Sprint:** 1–2

| # | Task | Details |
|---|---|---|
| 11.1 | Define `SatelliteProvider` interface | `getNdvi`, `getSoilMoisture`, `getLandCover`, `getHealthIndex` |
| 11.2 | Implement SentinelHub provider | NDVI from Sentinel-2, soil moisture from Sentinel-1 |
| 11.3 | Define `SoilProvider` interface | `getSoilType`, `getOrganicCarbon`, `getPh`, `getTexture` |
| 11.4 | Implement SoilGrids provider | Global soil data from ISRIC SoilGrids |
| 11.5 | Build satellite cache layer | Cache satellite data by location + date (30-day TTL for NDVI) |
| 11.6 | Satellite health endpoint | `GET /v1/satellite/health/:lat/:lng` — vegetation health assessment |
| 11.7 | Soil data endpoint | `GET /v1/soil/:lat/:lng` — soil characteristics for a location |
| 11.8 | Integrate NDVI into intelligence | Include vegetation health in intelligence responses |

**Deliverable:** Satellite and soil data integrated into the intelligence pipeline.

---

### WS-12: Advanced Rules Engine
**Owner:** Senior Engineer | **Sprint:** 2–3

| # | Task | Details |
|---|---|---|
| 12.1 | Build trend analysis module | Detect rainfall trends (increasing, decreasing, stable) over 7/14/30 days |
| 12.2 | Implement anomaly detection | Compare current conditions against 5-year averages |
| 12.3 | Add cumulative rainfall rules | 7-day, 14-day, 30-day accumulation thresholds |
| 12.4 | Implement pest/disease risk model | Temperature + humidity combinations that favour specific diseases |
| 12.5 | Build irrigation scheduling rule | Calculate crop water deficit and recommend irrigation timing |
| 12.6 | Add harvest timing rule | Determine optimal harvest window based on crop maturity + weather |
| 12.7 | Implement multi-rule scoring | Aggregate multiple triggered rules into a composite risk score |
| 12.8 | Build rule versioning | Version rules so API responses are reproducible |
| 12.9 | Add seasonal forecast integration | Incorporate 30/90-day outlooks into long-range recommendations |

**Deliverable:** Trend-aware, multi-day, crop-specific rules with composite scoring.

---

### WS-13: API Maturity & Developer Experience
**Owner:** Backend Engineer | **Sprint:** 2–3

| # | Task | Details |
|---|---|---|
| 13.1 | API versioning (v2) | Migrate to `/v2/` prefix for breaking changes |
| 13.2 | Cursor-based pagination | `cursor` + `limit` for list endpoints (farms, alerts, history) |
| 13.3 | Bulk endpoints | Batch intelligence, batch weather, batch location resolution |
| 13.4 | Webhook events v2 | Richer event payloads: `intelligence.generated`, `alert.triggered`, `farm.updated` |
| 13.5 | Rate limit headers | `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` |
| 13.6 | Request ID tracking | Consistent `X-Request-Id` header in all responses |
| 13.7 | Response envelope | `{ data, meta, links }` structure for all list endpoints |
| 13.8 | SDK generation | Auto-generate TypeScript/Python SDKs from OpenAPI spec |
| 13.9 | Changelog & API status | `GET /v1/changelog`, `GET /v1/status` endpoints |

**Deliverable:** Production-grade API with pagination, bulk operations, and SDK generation.

---

### WS-14: Dashboard v2 & Monitoring
**Owner:** Full Team | **Sprint:** 3

| # | Task | Details |
|---|---|---|
| 14.1 | Dashboard: farm overview map | Interactive map showing all registered farms with status indicators |
| 14.2 | Dashboard: farm detail view | Individual farm page with intelligence history, charts, alerts |
| 14.3 | Dashboard: analytics charts | Request volume, error rates, response times over time |
| 14.4 | Dashboard: webhook management UI | Create, test, view delivery logs for webhooks |
| 14.5 | Dashboard: crop comparison tool | Side-by-side crop suitability comparison |
| 14.6 | Dashboard: API key analytics | Per-key usage breakdown with charts |
| 14.7 | Service status page | Public `/status` page showing provider health |
| 14.8 | Onboarding wizard | Step-by-step guide for new developers |

**Deliverable:** Complete dashboard with maps, charts, and management UI.

---

## Sprint Plan

### Sprint 1 (Week 1): Deep Intelligence & Satellite
- WS-9: Crop profiles + growth stage engine + GDD calculator
- WS-10: Farm dashboard + monitoring cron + history tracking
- WS-11: SatelliteProvider interface + SentinelHub + SoilGrids

### Sprint 2 (Week 2): Advanced Rules & API Maturity
- WS-9: Crop comparison + planting optimiser + stage-aware rules
- WS-10: Farm comparison + bulk intelligence + notes + groups
- WS-12: Trend analysis + anomaly detection + cumulative rules + pest models
- WS-13: v2 routes + pagination + bulk endpoints + webhooks v2

### Sprint 3 (Week 3): Polish & Dashboard
- WS-12: Multi-rule scoring + seasonal forecast integration
- WS-13: SDK generation + changelog + status endpoints
- WS-14: Dashboard v2 (maps, charts, analytics, webhooks UI)
- Integration testing + load testing + deployment

---

## New Database Tables

```sql
-- Crop growth models
CREATE TABLE crop_growth_models (
  id UUID PRIMARY KEY,
  crop_id UUID REFERENCES crop_profiles(id),
  stage_name VARCHAR(100),
  stage_order INTEGER,
  min_days INTEGER,
  max_days INTEGER,
  gdd_min REAL,
  gdd_max REAL,
  rainfall_min_mm REAL,
  rainfall_max_mm REAL,
  temperature_min_c REAL,
  temperature_max_c REAL,
  description TEXT
);

-- Farm daily snapshots
CREATE TABLE farm_snapshots (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms(id),
  snapshot_date DATE,
  weather_data JSONB,
  intelligence_data JSONB,
  risks JSONB,
  alerts JSONB,
  ndvi REAL,
  soil_moisture REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farm notes
CREATE TABLE farm_notes (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms(id),
  note TEXT,
  category VARCHAR(50),
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Farm groups
CREATE TABLE farm_groups (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organisations(id),
  name VARCHAR(255),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Satellite data cache
CREATE TABLE satellite_cache (
  id UUID PRIMARY KEY,
  latitude REAL,
  longitude REAL,
  data_type VARCHAR(50),
  date DATE,
  data JSONB,
  source VARCHAR(100),
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Soil data cache
CREATE TABLE soil_cache (
  id UUID PRIMARY KEY,
  latitude REAL,
  longitude REAL,
  data JSONB,
  source VARCHAR(100),
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Rule versions
CREATE TABLE rule_versions (
  id UUID PRIMARY KEY,
  rule_id UUID REFERENCES agricultural_rules(id),
  version INTEGER,
  conditions JSONB,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- API changelog
CREATE TABLE api_changelog (
  id UUID PRIMARY KEY,
  version VARCHAR(20),
  title TEXT,
  description TEXT,
  breaking BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## New API Endpoints (Phase 2)

### Crop Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v2/crops` | List all crop profiles with growth stages |
| `GET` | `/v2/crops/:name` | Get detailed crop profile |
| `GET` | `/v2/crops/:name/growth-stage?lat=&lng=&planting_date=` | Current growth stage |
| `GET` | `/v2/crops/compare?lat=&lng=` | Crop suitability comparison |
| `GET` | `/v2/crops/:name/planting-window?lat=&lng=` | Optimal planting dates |
| `GET` | `/v2/crops/:name/gdd?lat=&lng=&start=&end=` | Growing degree day accumulation |

### Farm Management v2
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v2/farms/dashboard` | Aggregated farm overview |
| `POST` | `/v2/farms/batch-intelligence` | Intelligence for multiple farms |
| `POST` | `/v2/farms/compare` | Compare conditions across farms |
| `POST` | `/v2/farms/:id/notes` | Add observation note |
| `GET` | `/v2/farms/:id/notes` | List farm notes |
| `GET` | `/v2/farms/:id/history` | Intelligence history |
| `GET` | `/v2/farms/groups` | List farm groups |
| `POST` | `/v2/farms/groups` | Create farm group |
| `GET` | `/v2/farms/export` | Export farm data (CSV/JSON) |

### Satellite & Soil
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v2/satellite/ndvi/:lat/:lng` | NDVI vegetation index |
| `GET` | `/v2/satellite/health/:lat/:lng` | Vegetation health assessment |
| `GET` | `/v2/satellite/soil-moisture/:lat/:lng` | Soil moisture from satellite |
| `GET` | `/v2/soil/:lat/:lng` | Soil characteristics |
| `GET` | `/v2/soil/:lat/:lng/capability` | Agricultural land capability |

### Advanced Intelligence
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v2/farm/:lat/:lng/intelligence` | Enhanced intelligence with NDVI + trends |
| `GET` | `/v2/farm/:lat/:lng/trends` | Rainfall & temperature trends (7/14/30 days) |
| `GET` | `/v2/farm/:lat/:lng/anomaly` | Current vs historical average comparison |
| `GET` | `/v2/farm/:lat/:lng/irrigation` | Irrigation scheduling recommendation |
| `GET` | `/v2/farm/:lat/:lng/harvest` | Harvest timing assessment |

### Platform
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/v1/status` | Service status (all providers) |
| `GET` | `/v1/changelog` | API changelog |
| `POST` | `/v2/auth/keys` | Create key with plan selection |
| `GET` | `/v2/account/usage` | Detailed usage analytics |

---

## New Provider Interfaces

```typescript
// Satellite Provider
interface SatelliteProvider {
  name: string;
  isAvailable(): boolean;
  getNdvi(lat: number, lng: number, date?: string): Promise<NdviData>;
  getSoilMoisture(lat: number, lng: number, date?: string): Promise<SoilMoistureData>;
  getLandCover(lat: number, lng: number): Promise<LandCoverData>;
  getVegetationHealth(lat: number, lng: number): Promise<VegetationHealth>;
}

// Soil Provider
interface SoilProvider {
  name: string;
  isAvailable(): boolean;
  getSoilProfile(lat: number, lng: number): Promise<SoilProfile>;
  getSoilCapability(lat: number, lng: number): Promise<SoilCapability>;
}

// Growth Stage Model
interface GrowthStage {
  name: string;
  order: number;
  minDays: number;
  maxDays: number;
  gddRange: { min: number; max: number };
  criticalConditions: {
    rainfall: { min: number; max: number };
    temperature: { min: number; max: number };
  };
  risks: string[];
  recommendations: string[];
}
```

---

## SentinelHub Integration

```typescript
// SentinelHub NDVI endpoint (free tier)
const SENTINELHUB_URL = 'https://services.sentinel-hub.com';

// Example: Get NDVI tile for a location
GET /ogc/wms/{instance_id}?
  SERVICE=WMS&
  REQUEST=GetMap&
  LAYERS=1_TRUE_COLOR&
  BBOX={west},{south},{east},{north}&
  CRS=EPSG:4326&
  WIDTH=256&
  HEIGHT=256&
  FORMAT=image/png&
  TIME={date}
```

**Free tier limits:** 30,000 requests/month (sufficient for MVP).

---

## Risk Register (Phase 2)

| Risk | Impact | Mitigation |
|------|--------|------------|
| SentinelHub free tier limits | Satellite data unavailable at scale | Cache aggressively, fallback to Open-Meteo soil moisture |
| GDD model accuracy | Wrong growth stage predictions | Conservative thresholds, user-correctable planting dates |
| Farm history storage costs | Large data volumes | TTL on snapshots (90 days), compress JSON |
| Multi-farm batch performance | Slow responses for 100+ farms | Background processing, webhook delivery |
| Soil data quality | Incorrect soil recommendations | Clearly label as "estimated", confidence scores |

---

## Definition of Done (Phase 2)

- [ ] Crop growth stage tracking working with GDD calculation
- [ ] Crop-specific intelligence with stage-aware recommendations
- [ ] Crop comparison and planting window optimiser
- [ ] Farm dashboard with aggregated view
- [ ] Farm monitoring cron generating proactive alerts
- [ ] Farm history tracking with daily snapshots
- [ ] Farm notes, groups, and bulk operations
- [ ] SentinelHub NDVI integration working
- [ ] SoilGrids soil data integration working
- [ ] Satellite data included in intelligence responses
- [ ] Trend analysis for rainfall and temperature
- [ ] Anomaly detection comparing current vs historical
- [ ] Cumulative rainfall rules (7/14/30 day)
- [ ] Pest/disease risk model
- [ ] Irrigation scheduling recommendations
- [ ] Harvest timing assessment
- [ ] API v2 with pagination and bulk endpoints
- [ ] Webhook events v2 with richer payloads
- [ ] Dashboard v2 with maps, charts, and analytics
- [ ] SDK generation from OpenAPI spec
- [ ] All existing 60 tests still passing
- [ ] New tests for all Phase 2 features
- [ ] Load testing: 1000 concurrent requests
- [ ] Documentation updated
