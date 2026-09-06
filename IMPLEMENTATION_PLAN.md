# KulimaAPI — Implementation Plan

> **Goal:** Build a production-ready MVP of the KulimaAPI agriculture intelligence platform, deployable and usable by an external developer.

---

## Overview

This plan breaks the MVP (Phase 1) build into **8 work streams** executed across **6 sprints** (approximately 6 weeks for a small team). Each work stream is self-contained enough to be parallelised.

---

## Architecture Summary

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

---

## Work Streams

### WS-1: Project Scaffolding & Infrastructure
**Owner:** Lead Engineer | **Sprint:** 1

| # | Task | Details |
|---|---|---|
| 1.1 | Initialise Node.js/TypeScript project | `package.json`, `tsconfig.json`, ESLint, Prettier, Husky |
| 1.2 | Set up Fastify server | Entry point, plugin architecture, graceful shutdown |
| 1.3 | Set up project structure | All directories per `BUILD.md §48` |
| 1.4 | Configure environment variables | `.env.example`, `dotenv`, config module |
| 1.5 | Set up Docker Compose | PostgreSQL + Redis containers for local dev |
| 1.6 | Set up database migration system | Use `knex` or `drizzle-kit` with migration files |
| 1.7 | Set up logging | Structured JSON logging (e.g., `pino`) |
| 1.8 | Set up testing framework | Vitest or Jest, test directory structure |
| 1.9 | Create `README.md` | Setup instructions, architecture overview |

**Deliverable:** Running Fastify server with health endpoint, connected to PostgreSQL and Redis via Docker.

---

### WS-2: Database Schema & Models
**Owner:** Backend Engineer | **Sprint:** 1–2

| # | Task | Details |
|---|---|---|
| 2.1 | Design & create `users` table | UUID PK, email, name, created_at |
| 2.2 | Design & create `organisations` table | UUID PK, name, plan, created_at |
| 2.3 | Design & create `api_keys` table | UUID PK, org_id FK, key_hash, secret_hash, status, rate_limit, quota |
| 2.4 | Design & create `api_usage` table | FK api_key, endpoint, timestamp, status, response_time_ms |
| 2.5 | Design & create `farms` table | UUID PK, org_id FK, name, lat/lng (PostGIS geometry), crop, area, planting_date |
| 2.6 | Design & create `crop_profiles` table | All configurable crop parameters (JSON or columns) |
| 2.7 | Design & create `agricultural_rules` table | Rule definitions with conditions (JSON) |
| 2.8 | Design & create `locations` table | PostGIS geometry, state, lga, city, coordinates |
| 2.9 | Design & create cache tables | `weather_cache`, `forecast_cache` with TTL columns |
| 2.10 | Design & create `intelligence_results` table | Request cache for idempotency |
| 2.11 | Seed crop profiles | All 12 MVP crops with authoritative thresholds |
| 2.12 | Seed Nigerian locations | States, LGAs, major cities with coordinates |
| 2.13 | Seed agricultural rules | Heavy rainfall, dry spell, high temp, wind, humidity, flood risk, planting window |

**Deliverable:** Fully migrated database with seed data, model/repository layer.

---

### WS-3: Provider Layer
**Owner:** Backend Engineer | **Sprint:** 1–2

| # | Task | Details |
|---|---|---|
| 3.1 | Define `WeatherProvider` interface | `getCurrentWeather`, `getForecast`, `getHistoricalWeather` |
| 3.2 | Define `GeoProvider` interface | `resolveLocation`, `reverseGeocode`, `getBoundary` |
| 3.3 | Implement `OpenMeteoProvider` | Full integration with all available variables |
| 3.4 | Implement `NigeriaGeoProvider` | Load Nigerian boundaries dataset, coordinate resolution |
| 3.5 | Implement provider registry | Factory pattern for provider selection and fallback |
| 3.6 | Implement provider health checks | Status tracking for each provider |
| 3.7 | Create `SatelliteProvider` interface | Stub for future implementation |
| 3.8 | Create `CropProvider` interface | Stub for future implementation |

**Deliverable:** Working weather and geography providers with clean interfaces, health checks, and graceful degradation.

---

### WS-4: Authentication, Rate Limiting & Usage
**Owner:** Backend Engineer | **Sprint:** 2–3

| # | Task | Details |
|---|---|---|
| 4.1 | Implement API key generation | Secure random key + hashed secret storage |
| 4.2 | Implement auth middleware | `Authorization: Bearer` header parsing, key lookup |
| 4.3 | Implement rate limiting middleware | Per-key sliding window (Redis-backed) |
| 4.4 | Implement quota tracking | Monthly request counting per key |
| 4.5 | Implement API key CRUD endpoints | Create, revoke, rotate keys |
| 4.6 | Implement usage metering middleware | Log every request to `api_usage` table |
| 4.7 | Implement `GET /v1/account/usage` | Return period stats, quota, remaining |
| 4.8 | Implement CORS configuration | Configurable origins |
| 4.9 | Implement security headers | Helmet or equivalent |

**Deliverable:** Full API key lifecycle, auth middleware, rate limiting, usage tracking.

---

### WS-5: Intelligence Engine
**Owner:** Senior Engineer | **Sprint:** 2–4 | **Critical Path**

| # | Task | Details |
|---|---|---|
| 5.1 | Build data normalisation layer | Convert provider responses to internal models |
| 5.2 | Build data validation layer | Validate and flag missing/null fields |
| 5.3 | Implement confidence calculation | Score based on data availability, provider reliability, forecast horizon, variable count |
| 5.4 | Build rules engine framework | Load rules from DB/config, evaluate conditions, produce outputs |
| 5.5 | Implement heavy rainfall rule | With configurable thresholds per crop |
| 5.6 | Implement dry spell rule | Extended low rainfall detection |
| 5.7 | Implement high temperature rule | Crop-relative and region-relative thresholds |
| 5.8 | Implement strong wind rule | Spray/crop/structure impact detection |
| 5.9 | Implement excessive humidity rule | Fungal disease risk conditions (not diagnosis) |
| 5.10 | Implement flood risk rule | Rainfall-intensity-based proxy, clearly labelled |
| 5.11 | Implement planting window rule | Basic suitability assessment |
| 5.12 | Build recommendation engine | Map rules → recommendations with severity, reason, evidence, confidence, validity |
| 5.13 | Build evidence assembly | Attach supporting data points to every recommendation |
| 5.14 | Build risk detection layer | Aggregate all triggered rules into risk objects |
| 5.15 | Write unit tests for all rules | Each rule tested with known inputs and expected outputs |

**Deliverable:** Complete intelligence pipeline that transforms weather data → risks → recommendations with confidence and evidence.

---

### WS-6: API Endpoints
**Owner:** Backend Engineer | **Sprint:** 3–5

| # | Task | Endpoint | Details |
|---|---|---|---|
| 6.1 | Core intelligence | `GET /v1/farm/{lat}/{lng}/intelligence` | Full pipeline: weather → rules → recommendations |
| 6.2 | Crop-specific intelligence | `GET /v1/farm/{lat}/{lng}/crops/{crop}/intelligence` | With crop profile matching |
| 6.3 | Weather forecast | `GET /v1/weather/forecast/{lat}/{lng}` | Multi-day forecast |
| 6.4 | Agricultural alerts | `GET /v1/farm/{lat}/{lng}/alerts` | Active and upcoming alerts |
| 6.5 | Farm registration | `POST /v1/farms` | Create farm record |
| 6.6 | Farm monitoring | `GET /v1/farms/{farm_id}/intelligence` | Aggregated intelligence for registered farm |
| 6.7 | Historical intelligence | `GET /v1/farm/{lat}/{lng}/historical` | Past conditions with date range |
| 6.8 | Seasonal intelligence | `GET /v1/farm/{lat}/{lng}/season` | Current season assessment |
| 6.9 | Location resolution | `GET /v1/location/resolve` | Text query or coordinate reverse-lookup |
| 6.10 | Health endpoints | `GET /health`, `GET /health/providers` | System and provider status |
| 6.11 | Account usage | `GET /v1/account/usage` | Usage statistics |
| 6.12 | Request validation | Zod/Joi schemas for all endpoints | Input validation middleware |
| 6.13 | Error handling | Consistent error format across all endpoints | Per `BUILD.md §30` |
| 6.14 | API versioning | `/v1/` prefix routing | Forward-compatible structure |

**Deliverable:** All MVP endpoints fully functional, validated, and returning correct response structures.

---

### WS-7: Caching, Documentation & Error Handling
**Owner:** Backend Engineer | **Sprint:** 4–5

| # | Task | Details |
|---|---|---|
| 7.1 | Implement cache service | Redis-backed with configurable TTLs |
| 7.2 | Apply caching to weather data | 5–15 min for current, 30–60 min for forecast |
| 7.3 | Apply caching to location data | 30-day cache for resolved locations |
| 7.4 | Apply caching to historical data | 24-hour cache |
| 7.5 | Implement cache metadata in responses | `source`, `retrieved_at`, `data_age_minutes` when cached |
| 7.6 | Generate OpenAPI 3.1 spec | Complete with all endpoints, schemas, examples |
| 7.7 | Set up Swagger UI | Interactive documentation at `/docs` |
| 7.8 | Add copyable code examples | cURL, JavaScript, Python, PHP for each endpoint |
| 7.9 | Implement structured error responses | All error codes per `BUILD.md §30` |
| 7.10 | Implement provider failure handling | Graceful degradation, partial responses, cache fallback |

**Deliverable:** Cached responses, complete API documentation, robust error handling.

---

### WS-8: Testing, Dashboard & Deployment
**Owner:** Full Team | **Sprint:** 5–6

| # | Task | Details |
|---|---|---|
| 8.1 | Unit tests for all calculations | Rainfall, temperature, confidence, rules |
| 8.2 | Integration tests for providers | Open-Meteo, database, caching |
| 8.3 | API endpoint tests | All endpoints with valid/invalid inputs |
| 8.4 | Auth & rate limit tests | Missing key, invalid key, expired key, rate limit |
| 8.5 | Provider failure tests | Simulate provider downtime, verify graceful degradation |
| 8.6 | Build developer dashboard | React or Next.js minimal dashboard |
| 8.7 | Dashboard: overview page | API requests, keys, quota, errors, provider status |
| 8.8 | Dashboard: API key management | Create, revoke, rotate keys |
| 8.9 | Dashboard: API explorer | Interactive endpoint tester with response display |
| 8.10 | Dashboard: docs link | Embedded Swagger UI |
| 8.11 | Dockerfile | Production-ready container |
| 8.12 | Deployment scripts | Render, Railway, Cloud Run configurations |
| 8.13 | Environment configuration | Production `.env.example` with all variables |
| 8.14 | End-to-end smoke tests | Full request cycle verification |
| 8.15 | README & onboarding docs | Complete setup, deployment, and usage guide |

**Deliverable:** Fully tested, documented, deployable MVP with developer dashboard.

---

## Sprint Plan

### Sprint 1 (Week 1): Foundation
- WS-1: Project scaffolding (complete)
- WS-2: Database schema design & migrations (start)
- WS-3: Provider interfaces & OpenMeteo integration (start)

### Sprint 2 (Week 2): Core Infrastructure
- WS-2: Database models, seeds, repositories (complete)
- WS-3: Provider implementations & registry (complete)
- WS-4: Authentication system (start)
- WS-5: Intelligence engine framework (start)

### Sprint 3 (Week 3): Intelligence & Auth
- WS-4: Rate limiting, usage metering, API key CRUD (complete)
- WS-5: Agricultural rules (heavy rain, dry spell, high temp, wind)
- WS-6: Core intelligence endpoint (start)

### Sprint 4 (Week 4): Endpoints & Rules
- WS-5: Remaining rules (humidity, flood risk, planting window)
- WS-6: All MVP endpoints (complete)
- WS-7: Caching layer (start)

### Sprint 5 (Week 5): Polish & Documentation
- WS-7: Caching, OpenAPI docs, error handling (complete)
- WS-8: Testing (start), Dashboard (start)

### Sprint 6 (Week 6): Launch Ready
- WS-8: All tests, dashboard, deployment, docs (complete)

---

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| Open-Meteo API changes or downtime | Core weather data unavailable | Provider abstraction, caching, fallback responses |
| Nigerian geographic dataset quality | Location resolution failures | Use multiple sources, graceful degradation, direct coordinate support |
| Agricultural rule accuracy | Bad recommendations | Conservative thresholds, confidence scores, "decision support" framing |
| Scope creep into Phase 2+ | MVP delay | Strict adherence to Phase 1 scope only |
| PostgreSQL/PostGIS setup complexity | Developer friction | Docker Compose for local dev, clear setup docs |

---

## Key Dependencies

| Dependency | Purpose | Notes |
|---|---|---|
| Open-Meteo API | Weather data | Free tier available, no API key required |
| Nigerian GeoJSON dataset | Location resolution | Use `nigeria-geojson` or equivalent |
| PostgreSQL + PostGIS | Primary database | Docker for local dev |
| Redis | Caching & rate limiting | Docker for local dev |
| Fastify | HTTP framework | TypeScript-native, high performance |
| Zod | Request validation | TypeScript-first schema validation |
| Knex or Drizzle | Database migrations | TypeScript ORM/migration tool |

---

## Definition of Done (MVP)

- [ ] All Phase 1 endpoints functional and returning correct response structures
- [ ] Open-Meteo integration working with graceful degradation
- [ ] Nigerian location resolution working (text query + coordinates)
- [ ] Agricultural rules engine producing evidence-backed recommendations
- [ ] Confidence scores calculated and returned
- [ ] API key authentication working
- [ ] Rate limiting enforced per API key
- [ ] Caching reducing external API calls
- [ ] OpenAPI documentation complete and interactive
- [ ] Usage metering tracking all requests
- [ ] Error responses consistent and informative
- [ ] Developer dashboard functional (overview, keys, explorer, docs)
- [ ] All tests passing (unit + integration + API)
- [ ] Deployable to at least one target platform
- [ ] README with setup, deployment, and usage instructions
- [ ] `.env.example` with all required variables
- [ ] No secrets committed to repository
