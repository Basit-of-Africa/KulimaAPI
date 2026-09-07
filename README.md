# KulimaAPI 🌾

> **Turn raw environmental data into actionable agricultural decisions.**

KulimaAPI is an **Agriculture Intelligence API** focused on Nigerian agriculture. It converts raw weather, geographic, and agricultural data into practical, location-specific insights for farmers, agricultural platforms, NGOs, agribusinesses, lenders, insurers, researchers, and government programmes.

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
npm run dev
```

The API is now running at `http://localhost:3000` 🎉

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
│                    CLIENT LAYER                      │
│         Dashboard (React) ←→ REST API               │
├─────────────────────────────────────────────────────┤
│                   API LAYER (Fastify)                │
│  Routes → Controllers → Middleware → Schemas         │
│  (auth, rate-limit, validation, error handling)      │
├─────────────────────────────────────────────────────┤
│              INTELLIGENCE LAYER                      │
│  Rules Engine → Risk Detection → Recommendations    │
│  → Confidence Calculation → Response Assembly        │
├─────────────────────────────────────────────────────┤
│               PROVIDER LAYER                         │
│  WeatherProvider ←→ OpenMeteoProvider                │
│  GeoProvider ←→ NigeriaGeoProvider                   │
│  (Interfaces with swappable implementations)         │
├─────────────────────────────────────────────────────┤
│                 DATA LAYER                           │
│  PostgreSQL + PostGIS │ Redis Cache │ File-based     │
│  (crops, rules, API keys, usage, farms, locations)   │
└─────────────────────────────────────────────────────┘
```

### Project Structure

```
src/
├── cache/           # Redis + in-memory caching
├── config/          # Environment and configuration
├── database/        # Drizzle ORM schema, connection, seeds
├── intelligence/    # Rules engine, confidence scoring
├── middleware/       # Auth, rate limiting, usage, errors
├── providers/       # Weather & geo provider interfaces
├── routes/          # API route handlers
├── index.ts         # Server entry point
└── logger.ts        # Pino logger
```

---

## 🌍 Data Providers

| Provider | Purpose | Status |
|----------|---------|--------|
| **Open-Meteo** | Weather data (current, forecast, historical) | ✅ Implemented |
| **NigeriaGeo** | Nigerian location resolution (states, LGAs) | ✅ Implemented |
| **PostGIS** | Geospatial queries | 📋 Planned |
| **Satellite** | NDVI, soil moisture from satellites | 📋 Planned |

---

## 🌱 Agricultural Rules

The intelligence engine evaluates these rules:

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

Every intelligence response includes a confidence score (0-100) based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Data Completeness | 30% | How many weather fields are present |
| Forecast Horizon | 25% | How far ahead the forecast extends |
| Provider Reliability | 15% | Historical reliability of the data source |
| Variable Count | 15% | Number of weather variables available |
| Crop Profile Match | 15% | Whether a crop profile is being used |

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
