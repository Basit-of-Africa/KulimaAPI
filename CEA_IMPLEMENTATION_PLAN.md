# KulimaAPI — Controlled Environment Agriculture (CEA) Implementation Plan

> **Extend KulimaAPI beyond open-field farming into greenhouse, hydroponic, and vertical farming intelligence.**

---

## 1. Overview

KulimaAPI's existing API is built around the assumption that **the environment is the input, and the farmer adjusts to it.** In controlled environment agriculture (CEA), this is inverted: **the farmer controls the environment, and the system optimises it.**

This plan extends KulimaAPI to serve CEA operators — greenhouse growers, hydroponic farms, vertical farms, and shade house operators — with intelligence that combines outdoor weather context with indoor environmental control recommendations.

### Current vs CEA Intelligence Model

```
Current (Open-Field):          CEA:
  Weather Happens               Farmer Controls Environment
       ↓                               ↓
  Farmer Reacts                 System Recommends Settings
       ↓                               ↓
  Risk → Recommendation        Indoor State + Equipment → Control Setpoints
```

### Target Users (CEA-Specific)

| User Type | Description |
|-----------|-------------|
| **Greenhouse Operators** | Commercial greenhouses with climate control systems |
| **Hydroponic Farmers** | NFT, DWC, drip, ebb-and-flow systems |
| **Vertical Farm Operators** | Multi-tier indoor growing facilities |
| **Shade House Growers** | Simple shade net structures for nursery/vegetable production |
| **CEA Consultants** | Advising farms on equipment and environment optimisation |
| **Agricultural Lenders** | Assessing CEA facility viability and energy costs |
| **Insurance** | Environmental risk data for insured CEA facilities |

---

## 2. Core Concept: Environment Profiles

An **Environment Profile** describes a controlled growing environment and its equipment capabilities. This is the foundational new data model.

### 2.1 Environment Types

| Type | Description | Complexity |
|------|-------------|------------|
| `greenhouse` | Enclosed structure with some climate control | Medium |
| `shade_house` | Shade net structure, limited control | Low |
| `hydroponic` | Soilless growing (NFT, DWC, drip, ebb-flow) | High |
| `aeroponic` | Root zone in mist/air | High |
| `vertical_farm` | Multi-tier indoor growing | Very High |
| `screen_house` | Mesh-enclosed, insect protection | Low |

### 2.2 Infrastructure Capability Model

```typescript
interface EnvironmentProfile {
  id: string;
  orgId: string;
  farmId?: string;           // Link to existing farm record
  name: string;
  type: 'greenhouse' | 'shade_house' | 'hydroponic' | 'aeroponic' | 'vertical_farm' | 'screen_house';
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;       // metres above sea level
  };

  infrastructure: {
    // Structure
    coverType: 'glass' | 'polycarbonate' | 'shade_net' | 'plastic_film' | 'mesh';
    coverOpacity?: number;   // 0-1 (for shade nets: 0.3 = 30% shade)
    areaM2: number;
    heightM?: number;

    // Climate control
    ventilationType: 'natural' | 'mechanical' | 'hybrid';
    coolingType: 'none' | 'pad_fan' | 'fog' | 'wet_wall' | 'evaporative';
    heatingType: 'none' | 'gas' | 'electric' | 'solar_thermal';
    hasCO2Injection: boolean;
    hasDehumidifier: boolean;

    // Lighting (indoor/greenhouse)
    hasSupplementalLighting: boolean;
    lightSource?: 'LED' | 'HPS' | 'fluorescent' | 'none';
    lightCapacityLux?: number;

    // Hydroponic-specific
    irrigationType: 'rain_fed' | 'drip' | 'sprinkler' | 'flood' | 'nft' | 'dwc' | 'aeroponic' | 'ebb_flow';
    hasRecirculation?: boolean;
    waterSource?: 'borehole' | 'municipal' | 'rainwater' | 'river' | 'well';
    waterStorageLitres?: number;

    // Energy
    hasGenerator: boolean;
    generatorCapacityKVA?: number;
    hasSolarPanels: boolean;
    solarCapacityKW?: number;
    gridConnected: boolean;
  };

  sensors: {
    hasTemperature: boolean;
    hasHumidity: boolean;
    hasCO2: boolean;
    hasLightIntensity: boolean;
    hasSoilMoisture: boolean;
    hasSoilTemperature: boolean;
    hasEC: boolean;          // Electrical conductivity (hydroponics)
    hasPH: boolean;          // pH sensor (hydroponics)
    hasWaterTemperature: boolean;
    hasWindSpeed: boolean;   // Outdoor anemometer
  };

  crops: EnvironmentCrop[];
  createdAt: string;
  updatedAt: string;
}

interface EnvironmentCrop {
  cropName: string;
  variety?: string;
  plantingDate: string;
  areaM2: number;
  density: number;           // plants per m²
  growthStage: string;
  substrate?: string;        // For hydroponics: 'coco_coir', 'rockwool', 'clay_pebbles', 'perlite'
  nutrientRecipe?: string;
}
```

---

## 3. New Data Model

### 3.1 Environment Readings (Time-Series)

```typescript
interface EnvironmentReading {
  id: string;
  environmentId: string;
  timestamp: string;

  // Indoor conditions
  indoorTemperatureC?: number;
  indoorHumidityPercent?: number;
  indoorCO2Ppm?: number;
  indoorLightLux?: number;

  // Root zone (hydroponics/soil)
  rootZoneTemperatureC?: number;
  soilMoisturePercent?: number;
  waterTemperatureC?: number;
  waterPHEC?: { ph: number; ec: number };

  // Outdoor conditions (for context)
  outdoorTemperatureC?: number;
  outdoorHumidityPercent?: number;
  outdoorWindSpeedKmh?: number;

  // Energy
  powerConsumptionKWh?: number;

  source: 'sensor' | 'manual' | 'estimated';
}
```

### 3.2 Control Log

```typescript
interface ControlAction {
  id: string;
  environmentId: string;
  timestamp: string;
  controlType: 'ventilation' | 'cooling' | 'heating' | 'irrigation' | 'lighting' | 'co2' | 'fertigation';
  action: string;                 // e.g. 'open_vent_50%', 'activate_fog_cooling'
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  triggeredBy: 'manual' | 'automatic' | 'recommendation';
  recommendationId?: string;     // Link to the KulimaAPI recommendation that triggered this
}
```

### 3.3 Nutrient Schedule (Hydroponics)

```typescript
interface NutrientSchedule {
  id: string;
  environmentId: string;
  cropName: string;
  growthStage: string;
  solution: {
    name: string;                    // e.g. 'Hoagland Modified', 'Yoshida'
    ecTarget: number;               // mS/cm
    phTarget: { min: number; max: number };
    macros: Record<string, number>; // N, P, K, Ca, Mg, S in ppm
    micros: Record<string, number>; // Fe, Mn, Zn, Cu, B, Mo in ppm
  };
  irrigationSchedule: {
    frequency: string;              // 'continuous', '3x_daily', 'daily'
    durationMinutes: number;
    drainPercentage?: number;       // For run-to-waste systems
  };
  validFrom: string;
  validUntil: string;
}
```

---

## 4. New API Endpoints

### 4.1 Environment Management

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v2/environments` | Required | Register a CEA environment |
| `GET` | `/v2/environments` | Required | List all environments |
| `GET` | `/v2/environments/:id` | Required | Get environment details |
| `PATCH` | `/v2/environments/:id` | Required | Update equipment/settings |
| `DELETE` | `/v2/environments/:id` | Required | Delete environment |

### 4.2 CEA Intelligence

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v2/environments/:id/intelligence` | Required | Full CEA intelligence with control recommendations |
| `GET` | `/v2/environments/:id/control-setpoints` | Required | Recommended HVAC/lighting/nutrient settings |
| `GET` | `/v2/environments/:id/energy-budget` | Required | Energy cost forecast and optimisation |
| `GET` | `/v2/environments/:id/yield-forecast` | Required | Expected yield based on current trajectory |
| `POST` | `/v2/environments/batch-intelligence` | Required | Intelligence for multiple facilities |

### 4.3 Sensor Data Ingestion

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/v2/environments/:id/readings` | Required | Submit sensor readings (single or batch) |
| `GET` | `/v2/environments/:id/readings` | Required | Get historical readings with aggregation |
| `POST` | `/v2/environments/:id/readings/batch` | Required | Submit batch sensor readings |

### 4.4 Nutrient Management (Hydroponics)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/environments/:id/nutrients` | Required | Get current nutrient schedule |
| `POST` | `/v2/environments/:id/nutrients` | Required | Update nutrient recipe |
| `GET` | `/v2/environments/:id/nutrients/feeding-log` | Required | Historical feeding data |

### 4.5 Control Recommendations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/environments/:id/control-setpoints` | Required | Current recommended settings |
| `GET` | `/v2/environments/:id/control-log` | Required | Historical control actions |
| `POST` | `/v2/environments/:id/control-log` | Required | Record a control action |

### 4.6 Energy & Cost

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/environments/:id/energy-budget` | Required | Energy cost forecast |
| `GET` | `/v2/environments/:id/energy-history` | Required | Historical energy consumption |
| `POST` | `/v2/environments/:id/energy-log` | Required | Record energy consumption |

### 4.7 Comparison & Analytics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/v2/environments/comparison` | Required | Compare multiple facilities |
| `GET` | `/v2/environments/:id/analytics` | Required | Performance analytics |

---

## 5. CEA Intelligence Engine

### 5.1 New Rules Engine Layer

The CEA intelligence engine sits alongside the existing open-field engine:

```
Open-Field Engine:              CEA Engine:
  Weather → Risk → Rec          Weather + Indoor Sensors + Equipment → Control Setpoints
```

### 5.2 Climate Control Rules

#### Ventilation Rules
```
RULE: Ventilation Activation
  IF outdoorTemperatureC > targetTemperatureC + hysteresis
  AND ventilationType = 'mechanical'
  THEN activate ventilation at calculated speed
  
  speed = f(indoorTemp - targetTemp, outdoorTemp, windSpeed)
  priority = 'high' if indoorTemp > criticalThreshold
```

#### Cooling Rules
```
RULE: Cooling System Activation
  IF indoorTemperatureC > targetTemperatureC + 5
  AND coolingType = 'pad_fan' | 'fog'
  THEN activate cooling system
  
  IF outdoorHumidityPercent > 80 AND coolingType = 'pad_fan'
  THEN reduce cooling efficiency by 30%
  RECOMMENDATION: "Pad-and-fan cooling is less effective at >80% humidity. Consider fog cooling."
```

#### Heating Rules
```
RULE: Heating Activation
  IF nighttimeTemperatureC < minimumCropTemp - 3
  AND heatingType != 'none'
  THEN recommend heating

  energyCostEstimate = f(heatDeficit, areaM2, insulationR, heatingType)
```

#### Lighting Rules
```
RULE: Supplemental Lighting
  IF lightIntensityLux < cropLightRequirement * 0.5
  AND hasSupplementalLighting = true
  THEN recommend supplemental lighting

  hoursNeeded = f(cropLightRequirement, currentDayLength, cloudCover)
  energyCost = hoursNeeded * lightCapacityLux * electricityRate
```

#### CO2 Enrichment Rules
```
RULE: CO2 Enrichment
  IF indoorCO2Ppm < cropCO2Optimal - 100
  AND hasCO2Injection = true
  AND ventsAreClosed
  THEN recommend CO2 enrichment

  RECOMMENDATION: "Inject CO2 to 800-1000ppm during daylight hours when vents are closed."
```

### 5.3 Hydroponic Rules

#### pH Management
```
RULE: pH Drift Alert
  IF waterPH < cropPHMin OR waterPH > cropPHMax
  THEN trigger alert with corrective action

  correction = calculateNutrientAdjustment(currentPH, targetPH)
```

#### EC Management
```
RULE: EC Adjustment
  IF currentEC > growthStageECMax
  THEN recommend dilution

  IF currentEC < growthStageECMin
  THEN recommend nutrient concentration increase
```

#### Water Temperature
```
RULE: Water Temperature
  IF waterTemperatureC < 18 OR waterTemperatureC > 28
  THEN trigger alert

  RECOMMENDATION: "Root zone temperature outside optimal range. 
  Impact: reduced nutrient uptake, increased disease risk."
```

### 5.4 Energy Optimisation Rules

```
RULE: Energy Cost Optimisation
  IF outdoorTemperatureC is within target range
  THEN recommend natural ventilation over mechanical

  energySaving = mechanicalCost - naturalCost
  RECOMMENDATION: "Current outdoor conditions allow natural ventilation. 
  Estimated saving: ₦{energySaving}/day vs mechanical cooling."

RULE: Peak Load Management
  IF forecast shows high solar radiation AND time is peak tariff
  THEN recommend thermal storage or pre-cooling
```

### 5.5 Yield Prediction

```
RULE: Yield Trajectory
  actualConditions = averageIndoorConditions over growthPeriod
  optimalConditions = cropOptimalRanges
  
  yieldFactor = actualConditions.map((actual, i) => 
    Math.min(1, actual / optimalConditions[i])
  ).average()
  
  expectedYield = baseYieldPerM2 * yieldFactor * areaM2
  confidence = f(dataCompleteness, daysGrown, stage)
```

---

## 6. New Database Tables

```sql
-- CEA Environments
CREATE TABLE environments (
  id UUID PRIMARY KEY,
  org_id UUID REFERENCES organisations(id),
  farm_id UUID REFERENCES farms(id),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  altitude REAL,
  infrastructure JSONB NOT NULL,
  sensors JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CEA Environment Crops
CREATE TABLE environment_crops (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  crop_name VARCHAR(100) NOT NULL,
  variety VARCHAR(100),
  planting_date DATE NOT NULL,
  area_m2 REAL NOT NULL,
  density REAL NOT NULL,
  growth_stage VARCHAR(50),
  substrate VARCHAR(50),
  nutrient_recipe VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Environment Sensor Readings (Time-Series)
CREATE TABLE environment_readings (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  timestamp TIMESTAMPTZ NOT NULL,
  indoor_temperature_c REAL,
  indoor_humidity_percent REAL,
  indoor_co2_ppm REAL,
  indoor_light_lux REAL,
  root_zone_temperature_c REAL,
  soil_moisture_percent REAL,
  water_temperature_c REAL,
  water_ph REAL,
  water_ec REAL,
  outdoor_temperature_c REAL,
  outdoor_humidity_percent REAL,
  outdoor_wind_speed_kmh REAL,
  power_consumption_kwh REAL,
  source VARCHAR(20) DEFAULT 'sensor',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_env_readings_env_time ON environment_readings(environment_id, timestamp);

-- Control Action Log
CREATE TABLE control_actions (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  timestamp TIMESTAMPTZ NOT NULL,
  control_type VARCHAR(50) NOT NULL,
  action TEXT NOT NULL,
  before_state JSONB,
  after_state JSONB,
  triggered_by VARCHAR(20) NOT NULL,
  recommendation_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrient Schedules
CREATE TABLE nutrient_schedules (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  crop_name VARCHAR(100) NOT NULL,
  growth_stage VARCHAR(50),
  solution JSONB NOT NULL,
  irrigation_schedule JSONB NOT NULL,
  valid_from DATE,
  valid_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Energy Log
CREATE TABLE energy_log (
  id UUID PRIMARY KEY,
  environment_id UUID REFERENCES environments(id),
  timestamp TIMESTAMPTZ NOT NULL,
  device_type VARCHAR(50) NOT NULL,
  power_kw REAL,
  duration_minutes REAL,
  kwh REAL NOT NULL,
  cost_ngn REAL,
  source VARCHAR(20) DEFAULT 'meter',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Implementation Priority

### P0 — Foundation (Week 1)
**Effort: ~7 days | Impact: High**

| # | Task | Effort | Details |
|---|------|--------|---------|
| 1 | Environment profile data model | 1 day | Schema, types, database tables |
| 2 | Environment CRUD endpoints | 1 day | POST/GET/PATCH/DELETE /v2/environments |
| 3 | Climate control rules (ventilation) | 1 day | Ventilation activation based on indoor/outdoor temp differential |
| 4 | Climate control rules (cooling) | 1 day | Pad-fan, fog, wet wall activation with humidity awareness |
| 5 | Climate control rules (heating) | 0.5 day | Nighttime heating with cost estimation |
| 6 | CEA intelligence endpoint | 1.5 days | POST /v2/environments/:id/intelligence — full pipeline |
| 7 | Control setpoints endpoint | 0.5 day | GET /v2/environments/:id/control-setpoints |

**Deliverable:** Greenhouse operators can register their facility, input current conditions, and receive specific HVAC/lighting recommendations with energy cost estimates.

### P1 — Sensor Integration & Hydroponics (Week 2)
**Effort: ~7 days | Impact: High**

| # | Task | Effort | Details |
|---|------|--------|---------|
| 8 | Environment readings ingestion | 1 day | POST /v2/environments/:id/readings (single + batch) |
| 9 | Historical readings API | 0.5 day | GET with time range, aggregation, downsampling |
| 10 | Hydroponic nutrient rules (pH) | 1 day | pH drift detection, corrective actions |
| 11 | Hydroponic nutrient rules (EC) | 1 day | EC management per growth stage |
| 12 | Water temperature rules | 0.5 day | Root zone temperature monitoring |
| 13 | Nutrient schedule endpoint | 1 day | GET/POST /v2/environments/:id/nutrients |
| 14 | Feeding log endpoint | 0.5 day | Historical nutrient application data |

**Deliverable:** Sensor data flows into the system, hydroponic growers get pH/EC/water management recommendations.

### P2 — Energy & Yield (Week 3)
**Effort: ~7 days | Impact: Medium-High**

| # | Task | Effort | Details |
|---|------|--------|---------|
| 15 | Lighting control rules | 1 day | Supplemental lighting scheduling based on day length + cloud cover |
| 16 | CO2 enrichment rules | 0.5 day | CO2 injection timing recommendations |
| 17 | Energy budget calculation | 1 day | Cost forecast based on equipment + outdoor conditions |
| 18 | Energy history API | 0.5 day | Historical energy consumption tracking |
| 19 | Yield prediction model | 2 days | Growth trajectory tracking, expected harvest, output forecast |
| 20 | Environment comparison | 1 day | Compare conditions and performance across facilities |

**Deliverable:** Energy cost optimisation, yield forecasting, multi-facility comparison.

### P3 — Dashboard & Polish (Week 4)
**Effort: ~7 days | Impact: Medium**

| # | Task | Effort | Details |
|---|------|--------|---------|
| 21 | Dashboard: Environment management page | 2 days | Register, view, edit environments |
| 22 | Dashboard: Live sensor readings view | 1 day | Real-time sensor data display |
| 23 | Dashboard: Control setpoints panel | 1 day | Show recommended settings with apply button |
| 24 | Dashboard: Energy analytics | 1 day | Energy consumption charts and cost breakdown |
| 25 | Dashboard: Nutrient management (hydroponics) | 1 day | Nutrient schedule editor, feeding log |
| 26 | API documentation for CEA endpoints | 1 day | Swagger integration, examples |

**Deliverable:** Complete dashboard for CEA operations management.

---

## 8. CEA-Specific Response Structure

### Intelligence Response

```json
{
  "environment": {
    "id": "env_abc123",
    "name": "Greenhouse Alpha",
    "type": "greenhouse",
    "location": { "latitude": 7.38, "longitude": 3.94, "altitude": 250 }
  },
  "outdoor_conditions": {
    "temperature_c": 34.2,
    "humidity_percent": 78,
    "wind_speed_kmh": 12,
    "cloud_cover_percent": 60,
    "solar_radiation_wm2": 650
  },
  "indoor_conditions": {
    "temperature_c": 32.8,
    "humidity_percent": 85,
    "co2_ppm": 420,
    "light_lux": 35000
  },
  "control_recommendations": [
    {
      "control_type": "ventilation",
      "action": "activate_mechanical_ventilation_70_percent",
      "priority": "high",
      "reason": "Indoor temperature (32.8°C) exceeds target (28°C). Current outdoor temperature (34.2°C) allows partial ventilation with fog assist.",
      "expected_impact": "Reduce indoor temperature to ~29°C within 20 minutes",
      "energy_cost_ngn": 850
    },
    {
      "control_type": "cooling",
      "action": "activate_fog_cooling",
      "priority": "medium",
      "reason": "Outdoor humidity (78%) limits pad-and-fan efficiency. Fog cooling recommended.",
      "expected_impact": "Additional 3-5°C cooling",
      "energy_cost_ngn": 1200
    }
  ],
  "energy_budget": {
    "current_daily_kwh": 45.2,
    "projected_daily_kwh": 52.8,
    "cost_ngn": 12672,
    "optimisation_savings_ngn": 2340,
    "recommendations": [
      "Switch to natural ventilation between 6am-9am to save ₦2,340/day",
      "Pre-cool greenhouse before peak tariff (2pm-6pm)"
    ]
  },
  "yield_forecast": {
    "crop": "tomato",
    "days_since_planting": 45,
    "growth_stage": "flowering",
    "progress_percent": 62,
    "expected_yield_kg_m2": 8.5,
    "confidence": 0.78,
    "trajectory": "on_track",
    "days_to_harvest": 30,
    "risk_factors": ["high_humidity", "potential_blight"]
  },
  "alerts": [
    {
      "type": "high_humidity",
      "severity": "high",
      "message": "Indoor humidity at 85% exceeds safe threshold for tomato during flowering. Fungal disease risk elevated.",
      "recommended_action": "Increase ventilation or activate dehumidifier."
    }
  ],
  "confidence": 0.82,
  "generated_at": "2026-09-10T14:30:00Z"
}
```

### Control Setpoints Response

```json
{
  "environment_id": "env_abc123",
  "crop": "tomato",
  "growth_stage": "flowering",
  "timestamp": "2026-09-10T14:30:00Z",
  "setpoints": {
    "temperature": { "target_c": 28, "min_c": 22, "max_c": 32, "night_min_c": 18 },
    "humidity": { "target_percent": 70, "min_percent": 55, "max_percent": 85 },
    "co2": { "target_ppm": 800, "min_ppm": 400, "max_ppm": 1200 },
    "light": { "target_lux": 40000, "photoperiod_hours": 16 },
    "ventilation": { "mode": "mechanical", "speed_percent": 70 },
    "cooling": { "mode": "fog", "active": true },
    "heating": { "mode": "off", "active": false },
    "irrigation": { "frequency": "3x_daily", "volume_litres_per_m2": 2.5 }
  },
  "rationale": {
    "temperature": "Outdoor temp is 34°C — ventilation alone insufficient, fog cooling needed.",
    "humidity": "High outdoor humidity (78%) limits evaporative cooling effectiveness.",
    "irrigation": "Flowering stage requires consistent moisture. Avoid water stress."
  }
}
```

### Energy Budget Response

```json
{
  "environment_id": "env_abc123",
  "period": "today",
  "consumption": {
    "total_kwh": 45.2,
    "by_device": {
      "ventilation": { "kwh": 18.5, "hours": 6.2, "cost_ngn": 4440 },
      "cooling": { "kwh": 12.3, "hours": 4.1, "cost_ngn": 2952 },
      "lighting": { "kwh": 10.8, "hours": 6, "cost_ngn": 2592 },
      "irrigation": { "kwh": 3.6, "hours": 1.2, "cost_ngn": 864 },
      "other": { "kwh": 0, "hours": 0, "cost_ngn": 0 }
    },
    "total_cost_ngn": 10848
  },
  "forecast": {
    "tomorrow_kwh": 52.1,
    "tomorrow_cost_ngn": 12504,
    "weather_factor": "hot_day_expected"
  },
  "optimisation": {
    "potential_savings_ngn": 3200,
    "actions": [
      { "action": "natural_ventilation_morning", "saving_ngn": 2200, "confidence": 0.85 },
      { "action": "thermal_storage_precooling", "saving_ngn": 1000, "confidence": 0.7 }
    ]
  },
  "electricity_rate_ngn_per_kwh": 240,
  "generated_at": "2026-09-10T14:30:00Z"
}
```

---

## 9. Dashboard CEA Features

### 9.1 Environment Management Page

- Register new environment (type selector → form adapts)
- Equipment inventory with edit capability
- Sensor configuration and connection status
- Environment health overview

### 9.2 Live Monitoring View

- Indoor conditions dashboard (temperature, humidity, CO2, light, pH, EC)
- Trend charts (last 24h, 7 days, 30 days)
- Comparison against optimal ranges (green/yellow/red indicators)
- Outdoor conditions panel for context

### 9.3 Control Recommendations Panel

- Current recommended settings
- Priority-ranked actions
- "Apply" button that logs the action
- Before/after state comparison

### 9.4 Energy Analytics

- Daily/weekly/monthly consumption charts
- Cost breakdown by device
- Comparison between facilities
- Savings recommendations with projected impact

### 9.5 Nutrient Management (Hydroponics)

- Current nutrient recipe
- pH and EC gauges with target ranges
- Feeding schedule calendar
- Nutrient consumption history

---

## 10. Pricing Implications

CEA operators typically have higher willingness to pay:

| Tier | Price/Month | Requests/Month | Target |
|------|-------------|----------------|--------|
| Open-Field Free | ₦0 | 1,000 | Smallholder farmers |
| Open-Field Developer | ₦5,000 | 10,000 | Agricultural platforms |
| Open-Field Business | ₦25,000 | 100,000 | Agribusinesses |
| **CEA Starter** | **₦15,000** | **5,000** | Small greenhouse operators |
| **CEA Professional** | **₦50,000** | **25,000** | Commercial greenhouses |
| **CEA Enterprise** | **₦150,000** | **Unlimited** | Large facilities, vertical farms |

CEA tiers include: sensor data ingestion, control recommendations, energy optimisation, nutrient management, and yield forecasting.

---

## 11. Key Considerations

### Equipment Abstraction
Not all greenhouses are the same. The infrastructure model must be flexible enough to describe:
- Simple shade houses (no active control)
- Mid-range greenhouses (natural + mechanical ventilation)
- High-tech greenhouses (full climate control + CO2 + supplemental lighting)
- Hydroponic systems (NFT, DWC, ebb-flow, drip)
- Vertical farms (multi-tier, LED lighting, closed environment)

### Sensor Integration
CEA data comes from diverse sources:
- **IoT sensors** (MQTT, HTTP) — Most common for commercial operations
- **Manual entry** — Small-scale operators entering readings via mobile app
- **Third-party platforms** — Integration with existing sensor platforms (via webhooks)
- **Estimated values** — Using outdoor conditions + equipment model to estimate indoor state

### Energy Cost Modelling
Nigerian electricity context:
- **Grid tariff:** ₦240/kWh (Band A), ₦160/kWh (Band B)
- **Generator cost:** ₦350-500/kWh (diesel/gas generators)
- **Solar:** ₦50-100/kWh amortised over system lifetime
- Peak tariff periods vary by distribution company

### Yield Modelling
CEA yield prediction requires:
- Historical yield data per crop per environment type
- Growth curve models (logistic, Gompertz)
- Environmental condition scoring
- Disease/pest risk adjustment

---

## 12. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Greenhouse operators registered | 50 in 3 months | Environment count |
| Sensor readings ingested | 100K/day within 6 months | Daily reading volume |
| Energy cost reduction | 15-25% average | Before/after comparison |
| Yield improvement | 10-20% average | Controlled vs. CEA users |
| API uptime | 99.9% | Monitoring |
| Control recommendation accuracy | >85% | User feedback |

---

## 13. Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sensor data quality | Poor recommendations | Validate readings, flag anomalies, use rolling averages |
| Equipment model inaccuracy | Wrong control setpoints | Conservative defaults, user feedback loop, equipment calibration checks |
| Energy cost estimation error | Misleading savings projections | Use actual meter data, update rates monthly |
| Yield prediction inaccuracy | Loss of trust | Clearly state confidence levels, compare to actuals |
| CEA operator resistance | Low adoption | Start with simple recommendations, build trust gradually |
| Diverse equipment standards | Integration complexity | Abstract behind interfaces, support multiple protocols |

---

*Last updated: September 2026*
*Document owner: Basit-of-Africa*
