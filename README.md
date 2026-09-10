# KulimaAPI 🌾

> **Turn raw environmental data into actionable agricultural decisions.**

KulimaAPI is an **Agriculture Intelligence API** focused on Nigerian agriculture. It converts raw weather, geographic, and agricultural data into practical, location-specific insights for farmers, agricultural platforms, NGOs, agribusinesses, lenders, insurers, researchers, and government programmes.

---

## 📢 Latest Updates

### v2.0 — Phase 2 Complete (September 2026)

**16 Crop Profiles with Full Growth Stages**
Expanded from 7 to 16 crops, each with GDD (Growing Degree Day) tracking, stage-aware risk factors, and planting window optimisation:

| Food Crops | Cash Crops |
|------------|------------|
| Maize, Rice, Cassava, Sorghum | Oil Palm, Cocoa |
| Cowpea, Groundnut, Yam | Rubber, Cashew |
| Soybean, Tomato, Pepper, Onion, Millet | |

**Automatic Location Detection**
Browser GPS + IP-based geolocation with fuzzy search autocomplete. Quick-pick buttons for major Nigerian cities (Lagos, Abuja, Kano, Ibadan, Enugu). Detected location shows live weather data and appears as a pin on the interactive Farm Map.

**Advanced Rules Engine v2**
Five new rule types with composite risk scoring:
- Pest & disease risk modelling (fungal, insect, bacterial)
- Irrigation scheduling with water deficit calculation
- Harvest timing assessment
- Wind spray advisory
- Cumulative rainfall tracking (3-day and 7-day windows)

**Trend Analysis**
Linear regression on 7/14/30-day weather windows with anomaly detection for rainfall, temperature, and humidity.

**Batch Operations**
Batch weather and location resolution endpoints for processing multiple locations in a single request.

**Satellite & Soil Data**
Live SentinelHub NDVI (with latitude-based fallback) and ISRIC SoilGrids integration for soil profiles and agricultural capability assessment.

**CEA (Controlled Environment Agriculture) Plan**
Implementation plan created for extending the API to greenhouse, hydroponic, and vertical farming operations. See `CEA_IMPLEMENTATION_PLAN.md` for details.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** ≥ 20
- **Docker** (for PostgreSQL + Redis)
- **npm**

### 1. Clone & Install

```bash
git clone <your-repo-url> kulima-api
cd kulima-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env if needed — defaults work with Docker Compose
```

### 3. Start Infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16 + PostGIS** on `localhost:5432`
- **Redis 7** on `localhost:6379`

### 4. Set Up Database

```bash
# Push schema to database
npm run db:push

# Seed with crop profiles, rules, and Nigerian locations
npm run db:seed
```

### 5. Start Development Server

```bash
# API
npx tsx src/index.ts
# or
npm run dev
```

The API is now running at `http://localhost:3000` 🎉

### 6. Start the Web Frontend (optional)

```bash
Push-Location web
npm install
npx next dev -p 3001
```

The dashboard is available at `http://localhost:3001`

---

## 📖 API Documentation

Interactive Swagger UI is available at:

```
http://localhost:3000/docs
```

### Base URL

```
http://localhost:3000/v1
```

### Authentication

Most endpoints require an API key via the `Authorization` header:

```
Authorization: Bearer kulima_xxxxxxxxxxxx
```

Get an API key via:
```bash
curl -X POST http://localhost:3000/v1/auth/keys \
  -H "Content-Type: application/json" \
  -d '{"orgId": "<org-uuid>", "name": "My App"}'
```

---

## 🔌 Endpoints

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | API info |
| `GET` | `/health` | Health check |
| `GET` | `/health/providers` | Database + provider status |

### Intelligence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1/farm/:lat/:lng/intelligence` | Optional | Core intelligence pipeline |
| `GET` | `/v1/farms/:farmId/intelligence` | Required | Intelligence for a registered farm |
| `GET` | `/v1/farm/:lat/:lng/season` | Optional | Season assessment |
| `GET` | `/v1/farm/:lat/:lng/alerts` | Optional | Active alerts |

### Weather

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1/weather/current/:lat/:lng` | Optional | Current weather (cached) |
| `GET` | `/v1/weather/forecast/:lat/:lng` | Optional | Multi-day forecast (cached) |
| `GET` | `/v1/weather/historical/:lat/:lng` | Optional | Historical weather (cached) |

### Location

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1/location/resolve?q=...` | Optional | Location search |

### Farms

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v1/farms` | Required | List farms |
| `POST` | `/v1/farms` | Required | Create farm |
| `GET` | `/v1/farms/:farmId` | Required | Get farm |
| `PATCH` | `/v1/farms/:farmId` | Required | Update farm |
| `DELETE` | `/v1/farms/:farmId` | Required | Delete farm |

### Auth & Account

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v1/auth/keys` | No | Create API key |
| `DELETE` | `/v1/auth/keys/:keyId` | Required | Revoke API key |
| `POST` | `/v1/auth/keys/:keyId/rotate` | Required | Rotate API key |
| `GET` | `/v1/account/usage` | Required | Usage statistics |

### v2 — Crop Intelligence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/crops` | No | List all crop profiles |
| `GET` | `/v2/crops/:cropId` | No | Get crop profile with growth stages |
| `GET` | `/v2/crops/:cropId/advisory` | Optional | Crop-specific advisory |
| `POST` | `/v2/crops/:cropId/gdd` | Optional | Calculate GDD for a date range |

### v2 — Satellite & Soil

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/satellite/ndvi/:lat/:lng` | Optional | NDVI vegetation health |
| `GET` | `/v2/soil/profile/:lat/:lng` | Optional | Soil profile assessment |

### v2 — Locations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/locations/search?q=...` | No | Fuzzy search (≥2 chars) |
| `GET` | `/v2/locations/reverse?lat=...&lng=...` | No | Reverse geocode |
| `GET` | `/v2/locations/hotspots` | No | Agricultural hotspots |
| `GET` | `/v2/locations/:locationId/weather` | Optional | Weather for a location |
| `GET` | `/v2/locations/:locationId/season` | Optional | Season for a location |

### v2 — Batch

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v2/weather/batch` | Optional | Batch weather lookup |
| `POST` | `/v2/locations/resolve/batch` | No | Batch location resolution |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              CLIENT LAYER (Next.js 14)               │
│   Landing Page ←→ Dashboard ←→ Interactive Map       │
│   (React 19, Tailwind CSS, Mapbox GL, GPS)           │
├─────────────────────────────────────────────────────┤
│                   API LAYER (Fastify 5)              │
│  Routes → Controllers → Middleware → Schemas         │
│  (auth, rate-limit, validation, error handling)      │
│  v1 Endpoints (weather, intel, farms, auth)          │
│  v2 Endpoints (crops, satellite, soil, locations)    │
├─────────────────────────────────────────────────────┤
│              INTELLIGENCE LAYER                      │
│  Rules Engine (12 rules) → Composite Risk Scoring   │
│  → Confidence Calculation → Recommendations         │
│  → Trend Analysis → Pest/Disease/Irrigation Models  │
├─────────────────────────────────────────────────────┤
│               PROVIDER LAYER                         │
│  OpenMeteo (weather) │ NigeriaGeo (locations)        │
│  SentinelHub (satellite) │ SoilGrids (soil)         │
│  (Interfaces with swappable implementations)         │
├─────────────────────────────────────────────────────┤
│                 DATA LAYER                           │
│  PostgreSQL + PostGIS │ Redis Cache │ In-Memory      │
│  (crops, rules, API keys, usage, farms, locations)   │
└─────────────────────────────────────────────────────┘
```

### Project Structure

```
src/
├── cache/              # Redis + in-memory caching
├── config/             # Environment and configuration
├── database/           # Drizzle ORM schema, connection, seeds
├── hooks/              # Browser geolocation hooks
├── intelligence/       # Rules engine, crop profiles, GDD, trend analysis
├── middleware/          # Auth, rate limiting, usage, errors
├── providers/          # Weather, geo, satellite, soil interfaces
├── routes/             # API route handlers (v1 + v2)
├── validation/         # Input sanitisation and validation
├── index.ts            # Server entry point
└── logger.ts           # Pino logger

web/                    # Next.js 14 frontend
├── src/app/            # App Router pages (landing, dashboard, farms)
├── src/components/     # LocationPicker, Map, Auth, Dashboard widgets
├── src/lib/            # API client
└── package.json        # Separate frontend dependencies
```

---

## 🌍 Data Providers

| Provider | Purpose | Status |
|----------|---------|--------|
| **Open-Meteo** | Weather data (current, forecast, historical) | ✅ Implemented |
| **NigeriaGeo** | Nigerian location resolution (states, LGAs) | ✅ Implemented |
| **SentinelHub** | NDVI vegetation health (with fallback estimation) | ✅ Implemented |
| **SoilGrids** | Global soil profiles from ISRIC (250m resolution) | ✅ Implemented |
| **PostGIS** | Geospatial queries | 📋 Planned |

---

## 🌱 Agricultural Rules

The intelligence engine evaluates **12 rules** across 7 categories:

| Rule | Category | Description |
|------|----------|-------------|
| Heavy Rainfall Alert | Rainfall | Detects heavy rainfall events |
| Dry Spell Detection | Rainfall | Extended periods without rain |
| High Temperature Stress | Temperature | Temperatures exceeding crop thresholds |
| Strong Wind Advisory | Wind | Wind damage risk |
| Excessive Humidity Risk | Humidity | Fungal disease conditions |
| Flood Risk Assessment | Flood | Cumulative rainfall flood proxy |
| Planting Window | Planting | Suitability for planting |
| Frost Risk | Temperature | Frost conditions (northern regions) |
| Cassava Waterlogging | Rainfall | Cassava-specific waterlogging |
| Maize Flowering Heat | Temperature | Heat stress during flowering |
| Rice Water Stress | Rainfall | Paddy water levels |
| Season Onset | Planting | Rainy season detection |

### v2 Risk Models (Intelligence Layer)

| Model | Description |
|-------|-------------|
| **Pest & Disease Risk** | Fungal, insect, and bacterial risk based on temperature, humidity, and rainfall |
| **Irrigation Scheduling** | Water deficit calculation with evapotranspiration (Penman–Monteith) |
| **Harvest Timing** | Days to harvest and optimal harvest window assessment |
| **Wind Spray Advisory** | Spray drift risk from wind speed and direction |
| **Trend Analysis** | 7/14/30-day linear regression for rainfall, temperature, humidity with anomaly detection |

---

## 🚢 Deployment

### Docker

```bash
# Build image
docker build -t kulima-api .

# Run with environment variables
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_URL=redis://... \
  kulima-api
```

### Docker Compose (Full Stack)

```bash
docker compose -f docker-compose.yml up -d
```

### Supported Platforms

- **Render** — Deploy from Dockerfile
- **Railway** — Auto-detect Dockerfile
- **Google Cloud Run** — Container deployment
- **AWS ECS / Fly.io** — Any container platform

---

## 📊 Confidence Scoring

Every intelligence response includes a confidence score (0–100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Data Completeness | 30% | How many weather fields are present |
| Forecast Horizon | 25% | How far ahead the forecast extends |
| Provider Reliability | 15% | Historical reliability of the data source |
| Variable Count | 15% | Number of weather variables available |
| Crop Profile Match | 15% | Whether a crop profile is being used |

v2 responses also include **composite risk scores** from pest/disease, irrigation, harvest timing, and wind spray models.

---

## 🔒 Security

- **API Key Authentication** — SHA-256 hashed keys with prefix-based lookup
- **Per-Key Rate Limiting** — Redis-backed sliding window
- **Usage Metering** — Every request logged to database
- **CORS** — Configurable origins
- **Helmet** — Security headers
- **No secrets in code** — All config via environment variables

---

## 📝 Development

```bash
# Lint
npm run lint

# Format
npm run format

# Type check
npx tsc --noEmit
```

---

## 📄 License

MIT License

Copyright (c) 2026 [Basit-of-Africa](https://github.com/Basit-of-Africa)

---

## 👨‍💻 Developer

**Basit-of-Africa**
- GitHub: [github.com/Basit-of-Africa](https://github.com/Basit-of-Africa)

---

Built with ❤️ for Nigerian agriculture by the KulimaAPI team.
