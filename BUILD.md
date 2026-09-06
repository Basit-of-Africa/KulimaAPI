# KulimaAPI — Build Prompt & Product Specification

> **"Turn raw environmental data into actionable agricultural decisions."**

---

## 1. Product Overview

KulimaAPI is a production-ready **Agriculture Intelligence API** focused initially on Nigerian agriculture.

It is an API-first agricultural intelligence platform that converts raw environmental, weather, geographic and agricultural data into practical, location-specific insights for farmers, agricultural platforms, NGOs, agribusinesses, lenders, insurers, researchers and government programmes.

**KulimaAPI is not a consumer mobile application.** The core product is an API.

The central value proposition:

> Instead of returning raw weather data, KulimaAPI interprets environmental conditions and provides actionable, location-specific agricultural intelligence with explainable recommendations, confidence scores, and supporting evidence.

The system initially focuses on Nigeria but uses an architecture that can later support other African countries.

---

## 2. Core Product Principles

1. **API-first** — Every capability is exposed through a well-documented REST API.
2. **Location-specific intelligence** — Insights are tied to precise geographic coordinates.
3. **Evidence-based recommendations** — Every recommendation is backed by data.
4. **Explainable agricultural decisions** — No black-box outputs; every decision has a reason.
5. **Nigeria-first geographic coverage** — Deep integration with Nigerian administrative boundaries.
6. **Offline-compatible consumption** — Responses can be cached by downstream applications.
7. **Modular external data providers** — Swappable data sources behind clean interfaces.
8. **Provider abstraction** — APIs can be replaced without rewriting business logic.
9. **Strong caching** — Minimise external API usage and operational cost.
10. **Clear confidence scores** — Every output includes a confidence rating.
11. **No unsupported agricultural claims** — Never fabricate data or make definitive predictions.
12. **No black-box recommendations** — Transparency at every layer.
13. **Every recommendation has a reason and supporting data.**
14. **Useful to developers** — Clean schemas, good docs, predictable behaviour.

---

## 3. Target Users

| User Type | Description |
|---|---|
| **Agricultural platforms** | Applications that already serve farmers and need weather/ag intelligence. |
| **NGOs** | Organisations running farmer-support programmes. |
| **Agribusinesses** | Companies managing farms, outgrower schemes and supply chains. |
| **Agricultural lenders** | Institutions assessing agricultural risk for credit decisions. |
| **Agricultural insurers** | Organisations needing weather and environmental risk data. |
| **Government programmes** | Agricultural extension and intervention programmes. |
| **Researchers** | Universities and agricultural research organisations. |
| **Developers** | Developers embedding agricultural intelligence into applications. |

---

## 4. Technology Stack

### Backend
- **Language:** TypeScript
- **Runtime:** Node.js (LTS)
- **Framework:** Fastify (preferred for performance) or Express
- **API Style:** REST
- **API Specification:** OpenAPI 3.1

### Database
- **Primary:** PostgreSQL (with PostGIS for geographic queries)
- **Development fallback:** Firebase (Auth, Firestore, Cloud Functions/Cloud Run)
- Architecture must allow easy migration from Firebase to PostgreSQL/PostGIS.

### Geographic Data
- PostGIS (where available)
- GeoJSON
- Latitude/longitude coordinate system
- Nigerian administrative boundaries dataset

### Caching
- **Primary:** Redis
- **Development fallback:** Database-backed cache

### Documentation
- Swagger/OpenAPI interactive docs

### Deployment Targets
- Google Cloud Run
- Firebase App Hosting
- Render
- Railway
- Vercel (documentation site)

---

## 5. External Data Provider Architecture

Providers must **never** be hard-coded into business logic. A provider abstraction layer is required.

### Provider Directory Structure
```
providers/
    weather/
        WeatherProvider.ts          ← Interface
        OpenMeteoProvider.ts        ← Implementation
    satellite/
        SatelliteProvider.ts        ← Interface
        CropWatchProvider.ts        ← Implementation (optional)
    agriculture/
        CropProvider.ts             ← Interface
        CropSenseProvider.ts        ← Implementation (optional)
    geography/
        GeoProvider.ts              ← Interface
        NigeriaGeoProvider.ts       ← Implementation
```

### WeatherProvider Interface
```typescript
interface WeatherProvider {
  getCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather>;
  getForecast(latitude: number, longitude: number, days: number): Promise<WeatherForecast>;
  getHistoricalWeather(latitude: number, longitude: number, startDate: string, endDate: string): Promise<HistoricalWeather>;
}
```

The first implementation uses **Open-Meteo**. The system must allow Open-Meteo to be replaced or supplemented without rewriting application code.

---

## 6. Initial External Data Sources

### A. Open-Meteo (Primary Weather Source)
Retrieve where available:
- Current temperature, apparent temperature
- Precipitation, rainfall, probability of precipitation
- Weather conditions
- Wind speed, wind direction
- Humidity, pressure, cloud cover
- Solar radiation, evapotranspiration
- Soil moisture, soil temperature
- Forecast data, historical weather data

Handle unavailable variables gracefully — never fabricate missing data.

### B. Nigerian Geographic Data
Integrate a reliable dataset containing:
- Nigeria → States → LGAs → Wards (where available) → Cities/Towns
- Coordinates and administrative boundaries
- Support both text-based resolution (`Ibadan → Oyo State → Ibadan North`) and direct coordinate lookup.

### C. Crop Intelligence Providers (Optional)
Create optional interfaces for providers such as CropSense AI or CropWatch.
- Disable the provider if credentials are unavailable.
- Use Open-Meteo and internal rules as fallback.
- Return clear provider status.
- Never fabricate satellite or crop-health information.

### D. Satellite Providers (Interface Only)
Create an interface for future satellite providers (UP42/Maxar or equivalent).
MVP does **not** depend on paid satellite providers.
Future variables: NDVI, vegetation health, vegetation stress, land-cover classification, crop-health anomalies, drought indicators, flood detection.

---

## 7. API Authentication

### API Key System
Every customer receives:
- API Key
- API Secret
- Project ID

### Authentication Header
```
Authorization: Bearer API_KEY
```

### Supported Operations
- API key creation
- API key revocation
- API key rotation
- API key usage statistics
- Request limits
- Monthly quotas

### Security
- Hash secrets where appropriate.
- Never store raw API secrets unnecessarily.

---

## 8. Core Endpoint

### Primary Intelligence Endpoint
```
GET /v1/farm/{latitude}/{longitude}/intelligence
```

### Example
```
GET /v1/farm/7.3775/3.9470/intelligence?crop=maize&season=wet&days=7
```

### Optional Parameters
| Parameter | Description |
|---|---|
| `crop` | Crop type (e.g., `maize`, `rice`) |
| `season` | Season (e.g., `wet`, `dry`) |
| `days` | Forecast horizon in days |
| `language` | Response language (MVP: `en`) |

---

## 9. Intelligence Response Structure

```json
{
  "request_id": "req_01H...",
  "location": {
    "latitude": 7.3775,
    "longitude": 3.9470,
    "country": "Nigeria",
    "state": "Oyo",
    "lga": "Ibadan North",
    "timezone": "Africa/Lagos"
  },
  "weather": {
    "temperature_c": 30.4,
    "humidity_percent": 78,
    "wind_speed_kmh": 12.5,
    "precipitation_mm": 4.2
  },
  "rainfall": {
    "today_mm": 4.2,
    "next_24h_mm": 8.1,
    "next_72h_mm": 41.5,
    "probability_next_72h": 0.82
  },
  "temperature": {
    "current_c": 30.4,
    "min_c": 23.8,
    "max_c": 32.1
  },
  "soil": {
    "moisture": null,
    "temperature_c": 27.2,
    "data_available": false
  },
  "forecast": { "days": [] },
  "agricultural_risks": [],
  "recommendations": [],
  "alerts": [],
  "confidence": 0.88,
  "generated_at": "2026-09-06T12:00:00Z"
}
```

**Rules:**
- Never return fields with fabricated values.
- If data is unavailable, return `null` with `data_available: false`.
- Clearly distinguish observed data, forecast data, derived intelligence, and recommendations.

---

## 10. Agricultural Intelligence Engine

This is the **most important component**. KulimaAPI does not merely proxy weather data.

### Processing Pipeline
```
External Data
     ↓
Data Normalisation
     ↓
Data Validation
     ↓
Agricultural Rules Engine
     ↓
Risk Detection
     ↓
Recommendation Engine
     ↓
Confidence Calculation
     ↓
API Response
```

---

## 11. Recommendation Engine

Rule-based agricultural recommendations (NOT LLM-based for MVP).

### Example Rule
```
IF precipitation_probability > 0.75
AND expected_rainfall_24h > threshold
THEN
  risk = "heavy_rainfall"
  recommendation = "Consider delaying fertiliser application."
```

### Every Recommendation Must Include
| Field | Description |
|---|---|
| `recommendation` | The suggested action |
| `reason` | Why this recommendation was made |
| `supporting indicators` | Data points that triggered this |
| `severity` | low / medium / high / critical |
| `confidence` | 0.00 – 1.00 |
| `valid_until` | When this recommendation expires |

---

## 12. Initial Agricultural Rules

### Rule Framework
```json
{
  "id": "rule_001",
  "name": "Heavy Rainfall - Fertiliser Delay",
  "crop": ["maize", "rice", "beans"],
  "region": ["Nigeria"],
  "conditions": [...],
  "recommendation": "Consider delaying fertiliser application.",
  "severity": "high"
}
```

### Rule Categories

| Rule | Detection | Potential Actions |
|---|---|---|
| **Heavy rainfall** | Excessive rainfall risk | Delay fertiliser, delay spraying, prepare drainage, protect harvested produce |
| **Dry spell** | Extended low rainfall | Irrigation planning, moisture conservation, monitor for water stress |
| **High temperature** | Unusually high temps | Irrigation, shade-sensitive crop monitoring, livestock precautions |
| **Strong wind** | Wind affecting operations | Affect spraying, young crops, exposed structures |
| **Excessive humidity** | Conditions favourable to fungal disease | Inspect crops for symptoms (do NOT diagnose disease) |
| **Flood risk** | Rainfall intensity + recent precipitation (proxy signals) | Label as "rainfall-based flood risk" only |
| **Planting window** | Historical + forecast data | Basic planting suitability assessment with confidence |

### Safety Rules
- Never say "Your crop will fail." → Say "Current and forecast conditions indicate elevated drought stress risk."
- Never say "Your tomatoes have fungal disease." → Say "Current humidity and rainfall conditions may increase fungal disease risk. Inspect crops for relevant symptoms."
- All recommendations are **decision support**, not professional agronomic certainty.

---

## 13. Crop Profiles

### Supported Crops (MVP)
maize, rice, cassava, yam, beans, soybean, groundnut, tomato, pepper, onion, sorghum, millet

### Configurable Parameters Per Crop
```json
{
  "crop": "maize",
  "min_temperature_c": 10,
  "max_temperature_c": 40,
  "preferred_temperature_c": 25,
  "rainfall_requirements_mm": "500-800 per season",
  "water_sensitivity": "moderate",
  "wind_sensitivity": "moderate",
  "germination_conditions": {...},
  "growth_stage_requirements": {...}
}
```

- Store in configuration files or database tables.
- Must be reviewable and updatable from authoritative agricultural sources.
- Do not invent agronomic thresholds.

---

## 14. Crop-Specific Endpoint

```
GET /v1/farm/{latitude}/{longitude}/crops/{crop}/intelligence
```

### Response
```json
{
  "crop": "maize",
  "location": { "state": "Oyo", "lga": "Ibadan North" },
  "conditions": {
    "temperature": "favourable",
    "rainfall": "favourable",
    "soil_moisture": "unknown"
  },
  "risks": [{ "type": "heavy_rainfall", "severity": "medium" }],
  "recommendations": [{ "action": "monitor_drainage", "message": "..." }],
  "confidence": 0.79
}
```

---

## 15. Forecast Endpoint

```
GET /v1/weather/forecast/{latitude}/{longitude}?days=7
```

### Response
```json
{
  "location": {},
  "forecast": [
    {
      "date": "2026-09-07",
      "temperature": { "min_c": 23.8, "max_c": 32.1 },
      "rainfall": { "mm": 12.3, "probability": 0.75 },
      "humidity": { "percent": 80 },
      "wind": { "speed_kmh": 15, "direction": "SW" },
      "evapotranspiration_mm": 4.2
    }
  ]
}
```

---

## 16. Agricultural Alerts Endpoint

```
GET /v1/farm/{latitude}/{longitude}/alerts
```

### Response
```json
{
  "alerts": [
    {
      "id": "alert_123",
      "type": "heavy_rainfall",
      "severity": "high",
      "title": "Heavy rainfall expected",
      "message": "Significant rainfall is forecast within the next 72 hours.",
      "recommended_action": "Review drainage and consider delaying weather-sensitive farm operations.",
      "starts_at": "2026-09-07T00:00:00Z",
      "ends_at": "2026-09-09T00:00:00Z",
      "confidence": 0.89
    }
  ]
}
```

---

## 17. Farm Registration

```
POST /v1/farms
```

### Request
```json
{
  "name": "Farm A",
  "latitude": 7.3775,
  "longitude": 3.9470,
  "crop": "maize",
  "area_hectares": 4.5,
  "planting_date": "2026-06-20"
}
```

### Response
```json
{
  "farm_id": "farm_123",
  "status": "active"
}
```

The API customer manages farms on behalf of their users — individual farmers do not need accounts.

---

## 18. Farm Monitoring

```
GET /v1/farms/{farm_id}/intelligence
```

Aggregates: current weather, forecast, rainfall, crop profile, agricultural risks, alerts, recommendations, historical conditions.

---

## 19. Historical Intelligence

```
GET /v1/farm/{latitude}/{longitude}/historical?start_date=2026-06-01&end_date=2026-08-31
```

Returns: rainfall, temperature, humidity, evapotranspiration, weather anomalies (where calculable).

---

## 20. Seasonal Intelligence

```
GET /v1/farm/{latitude}/{longitude}/season
```

### Response
```json
{
  "season": "wet",
  "conditions": { "rainfall": "above_average", "temperature": "normal" },
  "agricultural_implications": [
    { "type": "rainfall", "message": "Rainfall conditions are currently favourable for rain-fed agriculture." }
  ]
}
```

Avoid definitive claims about planting seasons unless supported by data.

---

## 21. Location Resolution

```
GET /v1/location/resolve?query=Ibadan
GET /v1/location/resolve?latitude=7.3775&longitude=3.9470
```

### Response
```json
{
  "country": "Nigeria",
  "state": "Oyo",
  "lga": "Ibadan North",
  "city": "Ibadan",
  "latitude": 7.3775,
  "longitude": 3.9470
}
```

---

## 22. Language Support

Design responses for future multilingual support:
- English (MVP)
- Hausa, Yoruba, Igbo (future)

Architecture: `recommendation_id → translation layer → requested language`

Do not rely on live machine translation for critical agricultural instructions without validation.

---

## 23. Confidence System

| Score Range | Label |
|---|---|
| 0.00 – 0.39 | Low |
| 0.40 – 0.69 | Moderate |
| 0.70 – 0.89 | High |
| 0.90 – 1.00 | Very High |

Factors: data availability, provider reliability, forecast horizon, number of supporting variables, rule certainty, location precision.

Never present confidence as scientific certainty.

---

## 24. Evidence System

Every recommendation must be explainable:

```json
{
  "recommendation": "Consider delaying fertiliser application.",
  "evidence": [
    { "metric": "rainfall_probability", "value": 0.82 },
    { "metric": "expected_rainfall_72h", "value": 41.5, "unit": "mm" }
  ]
}
```

A developer should be able to show the farmer: **Why did the system recommend this?**

---

## 25. Data Freshness

Every data object must contain:
```json
{
  "source": "open-meteo",
  "retrieved_at": "2026-09-06T12:00:00Z",
  "valid_from": "2026-09-06T12:00:00Z",
  "valid_until": "2026-09-06T12:15:00Z"
}
```

Never present stale cached data as current data.

---

## 26. Caching Strategy

| Data Type | Cache Duration |
|---|---|
| Current weather | 5–15 minutes |
| Forecast | 30–60 minutes |
| Historical weather | 24 hours |
| Location | 30 days |
| Crop profiles | Long-term |

Cache durations must be configurable.

---

## 27. Rate Limiting

Per-API-key limits (configurable, not hard-coded):

| Tier | Requests/Month |
|---|---|
| Free | 1,000 |
| Developer | 10,000 |
| Business | 100,000 |
| Enterprise | Custom |

---

## 28. Usage Metering

Record: API key, endpoint, timestamp, response status, response time, external provider, credits consumed.

```
GET /v1/account/usage
```

---

## 29. Webhooks

Customers subscribe to events:
- `weather_alert`
- `heavy_rainfall`
- `dry_spell`
- `heat_risk`
- `wind_risk`
- `farm_condition_change`

Features: webhook signing, retries, delivery logs, failure handling, replay capability.

---

## 30. API Error Format

```json
{
  "error": {
    "code": "INVALID_COORDINATES",
    "message": "Latitude must be between -90 and 90.",
    "request_id": "req_123"
  }
}
```

Error codes: `INVALID_API_KEY`, `INVALID_COORDINATES`, `LOCATION_NOT_FOUND`, `UNSUPPORTED_CROP`, `PROVIDER_UNAVAILABLE`, `DATA_UNAVAILABLE`, `RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`, `INVALID_DATE_RANGE`.

---

## 31. Health Monitoring

```
GET /health
GET /health/providers
```

Returns status of: database, cache, Open-Meteo, geographic provider, optional agricultural/satellite providers.

---

## 32. Developer Dashboard

Minimal dashboard (NOT a farmer application):
- **Overview:** API requests, active API keys, quota, errors, provider status
- **API Keys:** Create, revoke, rotate
- **API Explorer:** Enter lat/lng/crop, execute intelligence endpoint, view JSON response + response time + request ID
- **Documentation:** Interactive Swagger docs

---

## 33. API Documentation

Complete OpenAPI documentation covering: authentication, rate limits, endpoints, parameters, responses, errors, webhooks, examples, data freshness, confidence scores, provider limitations.

Copyable examples in: cURL, JavaScript, Python, PHP.

---

## 34. Database Design

### Tables
`users`, `organisations`, `api_keys`, `api_usage`, `farms`, `farm_crops`, `crop_profiles`, `agricultural_rules`, `locations`, `weather_cache`, `forecast_cache`, `intelligence_results`, `alerts`, `webhooks`, `webhook_deliveries`, `provider_status`

### Requirements
- UUIDs for primary keys
- Indexes on: latitude/longitude, state, LGA, crop, farm ID, timestamps
- PostGIS extension (where PostgreSQL is used)

---

## 35. Security

- API key authentication
- Request validation
- Rate limiting
- CORS configuration
- Secure HTTP headers
- Input sanitisation
- SQL injection protection
- Webhook signature verification
- Secret management via environment variables
- Structured audit logs
- Never expose external provider API keys to consumers

---

## 36. Data Governance

Clearly distinguish in every response:

| Category | Example |
|---|---|
| **Observed data** | temperature = 31°C |
| **Forecast data** | rainfall probability = 82% |
| **Derived intelligence** | heavy rainfall risk = high |
| **Recommendation** | consider delaying fertiliser application |

---

## 37. Safety Principle

KulimaAPI must **never** pretend to provide professional agronomic certainty.

- ❌ "Your crop will fail."
- ✅ "Current and forecast conditions indicate elevated drought stress risk."

- ❌ "Your tomatoes have fungal disease."
- ✅ "Current humidity and rainfall conditions may increase fungal disease risk. Inspect crops for relevant symptoms."

All recommendations are **decision support**.

---

## 38. AI Layer (Optional, Post-MVP)

AI is optional. Deterministic calculations come first.

### Correct Architecture
```
Weather Data → Rules Engine → Risk Assessment → Structured Recommendation → Optional AI Explanation
```

### Incorrect Architecture
```
Weather Data → LLM → Random recommendation
```

AI can later be used for: natural-language explanation, multilingual recommendations, summarisation, question answering, translating technical information into farmer-friendly language.

---

## 39. Example End-to-End Request

### Request
```
GET /v1/farm/7.3775/3.9470/intelligence?crop=maize&days=7
Authorization: Bearer API_KEY
```

### Response
```json
{
  "request_id": "req_89273",
  "location": {
    "country": "Nigeria",
    "state": "Oyo",
    "lga": "Ibadan North",
    "latitude": 7.3775,
    "longitude": 3.947
  },
  "crop": { "name": "maize" },
  "weather": {
    "current_temperature_c": 30.4,
    "humidity_percent": 78,
    "rainfall_last_24h_mm": 3.4
  },
  "forecast": {
    "next_72h": {
      "rainfall_mm": 41.5,
      "rain_probability": 0.82,
      "max_temperature_c": 32.1
    }
  },
  "risks": [{ "type": "heavy_rainfall", "severity": "high", "confidence": 0.88 }],
  "recommendations": [
    {
      "action": "delay_fertiliser_application",
      "severity": "medium",
      "message": "Consider delaying fertiliser application because significant rainfall is forecast within the next 72 hours.",
      "reason": "High rainfall probability and forecast precipitation.",
      "confidence": 0.84
    }
  ],
  "alerts": [],
  "data_sources": ["open-meteo"],
  "generated_at": "2026-09-06T12:00:00Z"
}
```

---

## 40–44. Phased Roadmap

### Phase 1 — MVP (Current Build)
1. API authentication
2. Open-Meteo integration
3. Nigerian location resolution
4. `/v1/farm/{lat}/{lng}/intelligence`
5. Weather data (temperature, rainfall, humidity, wind)
6. Forecast data
7. Basic agricultural rules engine
8. Recommendations with evidence
9. Confidence scores
10. Caching layer
11. Rate limiting
12. Swagger documentation
13. API usage tracking

**The MVP must be deployable and usable by an external developer.**

### Phase 2 — Crop Intelligence & Farm Management
1. Crop profiles
2. Crop-specific intelligence endpoint
3. Farm registration
4. Farm monitoring
5. Agricultural alerts
6. Historical intelligence
7. Webhooks
8. Developer dashboard
9. Multilingual response architecture

### Phase 3 — Satellite & Advanced Analytics
1. Satellite provider integration
2. Vegetation indices (NDVI)
3. Crop-health intelligence
4. Drought monitoring
5. Flood intelligence
6. Historical anomaly detection
7. Advanced agricultural risk models

### Phase 4 — AI & Channels
1. AI-powered explanations
2. Yoruba, Hausa, Igbo language support
3. SMS integration
4. USSD integration
5. WhatsApp integration
6. Agricultural extension integrations

### Phase 5 — Commercial Platform
1. Developer accounts & organisations
2. API plans & billing
3. Usage analytics
4. Webhook management
5. Service status page
6. Support system

---

## 45. Testing Requirements

### Unit Tests
- Rainfall calculations
- Temperature calculations
- Confidence calculations
- Agricultural rules
- Crop matching
- Location resolution

### Integration Tests
- Open-Meteo provider
- Database operations
- Caching layer
- API authentication
- Rate limiting

### API Tests
- Valid/invalid coordinates
- Unknown crop
- Missing/invalid/expired API key
- Rate limit enforcement
- Provider failure handling
- Missing weather data graceful degradation

---

## 46. Provider Failure Behaviour

If Open-Meteo is unavailable:
- Do **not** crash the API.
- Return partial data with clear status:
```json
{
  "status": "partial",
  "data_available": false,
  "provider_status": { "weather": "unavailable" }
}
```
- If cached data is available, return it with explicit label:
```json
{
  "source": "cache",
  "data_age_minutes": 43
}
```
- Never silently return stale data as fresh.

---

## 47. API Versioning

Use `/v1/` from the beginning. Never make breaking changes to `/v1`. Future versions use `/v2/`, etc.

---

## 48. Project Structure

```
kulima-api/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   └── schemas/
│   ├── providers/
│   │   ├── weather/
│   │   ├── geography/
│   │   ├── agriculture/
│   │   └── satellite/
│   ├── intelligence/
│   │   ├── engine/
│   │   ├── rules/
│   │   ├── recommendations/
│   │   ├── risk/
│   │   └── confidence/
│   ├── crops/
│   │   ├── profiles/
│   │   └── services/
│   ├── farms/
│   ├── alerts/
│   ├── webhooks/
│   ├── auth/
│   ├── usage/
│   ├── cache/
│   ├── database/
│   ├── config/
│   └── utils/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── api/
├── docs/
├── scripts/
├── .env.example
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 49. Development Requirements

1. Do not create mock API responses where real provider integration is possible.
2. Do not fabricate agricultural data.
3. Do not fabricate satellite information.
4. Use environment variables for provider credentials.
5. Clearly indicate unavailable providers.
6. Build provider interfaces before provider-specific implementations.
7. Keep business rules independent from external API providers.
8. Make crop thresholds configurable.
9. Include source and timestamp information in responses.
10. Write tests for all agricultural rules.
11. Generate OpenAPI documentation.
12. Include a complete `.env.example`.
13. Include setup and deployment instructions.
14. Include API usage examples.
15. Include seed data for Nigerian crop profiles.
16. Include sample API keys for local development only.
17. Never commit secrets.

---

## 50. Final Product Definition

The finished MVP allows a developer to call:

```
GET /v1/farm/7.3775/3.9470/intelligence?crop=maize
```

and receive answers to:

1. **Where is the farm?** → Resolved location
2. **What is the current weather?** → Observed conditions
3. **What is expected over the next several days?** → Forecast
4. **What environmental risks are present?** → Risk assessment
5. **What agricultural operations may be affected?** → Impact analysis
6. **What action should the farmer consider?** → Recommendation
7. **Why?** → Evidence and reasoning
8. **How confident is the system?** → Confidence score
9. **What data supports the recommendation?** → Evidence objects
10. **When was the information retrieved?** → Data freshness metadata

> **KulimaAPI is an agricultural intelligence layer that developers can embed into farming, lending, insurance, extension, logistics and agribusiness applications.**
