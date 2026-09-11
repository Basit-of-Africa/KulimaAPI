# MAPUPGRADE.md — Farm Intelligence Map Upgrade

> **Transform KulimaAPI's SVG-only Farm Map into a real-time geospatial intelligence platform,
> inspired by God's Eye View's layer system, sensor modes, and voice interaction.**

---

## Executive Summary

KulimaAPI's backend already exposes rich geospatial data (weather, satellite NDVI, soil profiles, crop intelligence, CEA environments) — but the frontend renders it as static cards and tables. The Farm Map page uses a **hand-drawn SVG of Nigeria** with hardcoded sample farms. There is no mapping library, no zoom/pan, no data overlays, and no spatial visualization.

This plan upgrades the map to a full GIS-grade interactive globe using the patterns proven by God's Eye View (24.3k ⭐, 5k forks) — adapted for agriculture.

---

## Part 1: Current State Assessment

### What Exists (Backend — ✅ Ready)

| API | Endpoint | Status |
|-----|----------|--------|
| Farm locations | `GET /v1/farms` | ✅ Returns lat/lng/crop/area |
| Weather overlay | `GET /v1/weather/current/:lat/:lng` | ✅ Temperature, humidity, wind, rain |
| Forecast overlay | `GET /v1/weather/forecast/:lat/:lng` | ✅ Multi-day forecast per point |
| NDVI vegetation | `GET /v2/satellite/ndvi/:lat/:lng` | ✅ Vegetation health index |
| Soil profiles | `GET /v2/soil/:lat/:lng` | ✅ Soil type, pH, texture, drainage |
| Crop intelligence | `GET /v1/farm/:lat/:lng/intelligence` | ✅ Risk scores + recommendations |
| Locations | `GET /v2/locations/search?q=...` | ✅ Fuzzy search, reverse geocode |
| Batch weather | `POST /v2/weather/batch` | ✅ Multiple locations in one request |
| CEA environments | `GET /v2/environments` | ✅ Greenhouse/hydroponic locations |

### What Exists (Frontend — ❌ Needs Rebuild)

| Component | Current State | Problem |
|-----------|--------------|---------|
| `farms/page.tsx` | SVG `<path>` of Nigeria + hardcoded dots | No real map, no zoom, no layers |
| `LocationPicker.tsx` | Text search dropdown only | No map canvas, no visual selection |
| `dashboard/page.tsx` | Static provider cards | No spatial data visualization |
| `crops/page.tsx` | Table/list of crop profiles | No geographic context |
| Mapping library | **None installed** | No Mapbox, Leaflet, or CesiumJS |

### Gap Analysis

```
Backend APIs (100%)          Frontend Visualization (5%)
═══════════════════          ════════════════════════════
Weather         ████░        Weather on map          ░░░░░
Satellite/NDVI  ████░        NDVI heatmap            ░░░░░
Soil            ████░        Soil overlay             ░░░░░
Crop Intel      ████░        Risk visualization      ░░░░░
Farm CRUD       ████░        Farm pins on map         ░░░░░
Locations       ████░        Location search+map      ░░░░░
CEA             ████░        CEA on map               ░░░░░
Batch APIs      ████░        Multi-farm view          ░░░░░
```

---

## Part 2: Architecture — Borrowed Patterns from God's Eye View

### Pattern 1: Data Layer System (from `src/data/manager.js`)

God's Eye View's `DataLayerManager` is the backbone — every data source is a
**layer module** with a standard interface, registered and toggled independently.

**KulimaAPI adaptation:**

```
Weather Layer     ──→  Temperature/precipitation heatmap overlay
Soil Layer        ──→  Soil type / pH polygon overlay
NDVI Layer        ──→  Vegetation health gradient overlay
Risk Layer        ──→  Risk score markers per farm (red/yellow/green)
Farm Markers      ──→  Interactive farm pins with popups
CEA Layer         ──→  Controlled environment facility markers
Forecast Layer    ──→  Animated weather forecast fronts
Season Layer      ──→  Rainy/dry season boundary visualization
```

**Layer module interface** (adapted from GEV):

```typescript
interface FarmLayer {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;

  init(map: mapboxgl.Map): void;       // one-time setup
  enable(map: mapboxgl.Map): void;     // activate layer
  disable(map: mapboxgl.Map): void;    // deactivate layer
  update(map: mapboxgl.Map): void;     // fetch fresh data, re-render
  destroy(map: mapboxgl.Map): void;    // cleanup
  getLegend(): LayerLegend;             // color scale / key
}
```

### Pattern 2: Layer Toggle Panel (from `ui.js` chips)

GEV uses a chip row at the bottom — each layer is a toggleable chip.
KulimaAPI gets the same: a **layer control panel** with toggles.

```
┌─────────────────────────────────────────────────────┐
│  [🌤 Weather] [🌱 NDVI] [🪨 Soil] [⚠️ Risk] [📍 Farms]  │
│  [🏡 CEA] [📅 Season] [🗺 Satellite]              │
└─────────────────────────────────────────────────────┘
```

### Pattern 3: Data Fetch + Cache + Render Cycle

GEV fetches data every 15-30s via server-side proxy, caches in memory,
and interpolates between updates (dead-reckoning for moving objects).

**KulimaAPI adaptation:**
- Batch API (`POST /v2/weather/batch`) for multi-farm weather
- Client-side cache with TTL (15 min for weather, 24h for soil)
- Animated transitions between data states (like GEV's smooth motion)
- Background refresh when map is idle

### Pattern 4: Server-Side Key Broker (from `keySetup.js`)

GEV brokers ALL sensitive API keys through server-side proxy.
KulimaAPI already has this architecture — the API server handles all
external provider calls, the frontend only sees processed data.

**No change needed** — this pattern is already in place.

### Pattern 5: Sensor Modes → Data Visualization Modes

GEV's GLSL sensor shaders (NVG, FLIR, CRT) reinterpret the same scene
through different visual lenses. KulimaAPI adapts this as **data view modes**:

| GEV Sensor | KulimaAPI View Mode | What It Shows |
|-----------|-------------------|---------------|
| NVG (green) | **Vegetation** | NDVI green palette, healthy = bright |
| FLIR (thermal) | **Temperature** | Heat map, hot = red, cool = blue |
| Noir | **Risk** | Dark background, risk zones glow red |
| Normal | **Standard** | Satellite/terrain base, markers |
| CRT | **Data Density** | Grid overlay showing data point coverage |

### Pattern 6: Detection Overlay → Risk Alert Overlay

GEV draws bounding boxes + IDs on tracked objects. KulimaAPI draws
**risk indicators** on farms and regions:

- 🟢 Low risk — green glow
- 🟡 Medium risk — amber pulse
- 🔴 High risk — red bounding box with alert text
- 🟫 Critical — red box + recommendation popup

### Pattern 7: Cockpit View → Farm Drill-Down

GEV's cockpit rides a live aircraft with terrain below.
KulimaAPI's **Farm Drill-Down** zooms from national view into a
single farm, revealing micro-level intelligence:

1. Click a farm pin → camera zooms in
2. Weather overlay localizes to farm boundary
3. NDVI heatmap resolves at field level
4. Soil data appears as farm-survey overlay
5. Growth stage timeline appears in sidebar
6. Risk alerts stack by priority
7. CEA controls appear for controlled environments

---

## Part 3: Technology Selection

### Mapping Library: MapLibre GL JS (recommended)

| Criterion | MapLibre GL JS | CesiumJS (GEV's choice) | Leaflet |
|-----------|---------------|------------------------|---------|
| 2D map | ✅ Excellent | ✅ Excellent | ✅ Good |
| 3D terrain | ✅ Good (Terrain RGB) | ✅ Best (photorealistic) | ❌ Limited |
| Raster overlays | ✅ Native | ✅ Native | ✅ Native |
| Heatmaps | ✅ Native | ⚠️ Manual | ✅ Plugin |
| Data performance | ✅ WebGL | ✅ WebGL | ⚠️ DOM-based |
| Bundle size | ~200KB | ~3MB | ~40KB |
| React integration | ✅ react-map-gl | ⚠️ Manual wrapper | ✅ react-leaflet |
| Free tile sources | ✅ MapTiler, OSM, Mapbox | ⚠️ Needs ion key | ✅ OSM |
| Cost | Free tier available | Free tier (limited) | Free |

**Why MapLibre over CesiumJS:**
- Nigerian agriculture doesn't need photorealistic 3D buildings
- 2D/2.5D with terrain is sufficient for farm-level intelligence
- 15x smaller bundle, faster mobile performance
- Better heatmap and raster overlay support
- `react-map-gl` provides mature React integration
- Free tile sources (no API key required for basic use)

### Overlay Stack

```
┌───────────────────────────────────┐  Top
│  Risk Alert Overlay (Canvas)      │  ← GEV pattern: screen-blended canvas
│  Farm Markers (Symbol Layer)      │  ← Interactive pins with popups
│  Data Overlay (Raster Tiles)      │  ← NDVI/Soil/Weather heatmaps
│  Season Boundary (Line Layer)     │  ← Animated boundary lines
│  Satellite Imagery (Tile Layer)   │  ← Esri/MapTiler satellite
│  Terrain (DEM)                    │  ← Elevation shading
└───────────────────────────────────┘  Bottom
```

---

## Part 4: Implementation Plan

### Phase 1 — Foundation (Sprint 1, ~5 days)

**Goal:** Replace SVG with a real interactive map showing farm markers.

| Task | Files | Effort |
|------|-------|--------|
| Install MapLibre GL + react-map-gl + deck.gl | `web/package.json` | 0.5 day |
| Create `MapContainer` component with MapLibre | `web/src/components/MapContainer.tsx` | 1 day |
| Create `FarmLayer` — fetch farms, render markers | `web/src/components/layers/FarmLayer.tsx` | 1 day |
| Create `LayerPanel` — toggle chips for all layers | `web/src/components/LayerPanel.tsx` | 0.5 day |
| Rewrite `farms/page.tsx` to use MapContainer | `web/src/app/farms/page.tsx` | 1 day |
| Add farm creation form with map click-to-place | `web/src/components/FarmCreateForm.tsx` | 0.5 day |
| Test and fix responsive layout | — | 0.5 day |

**Deliverable:** Interactive map with real farm markers, search, and creation.

### Phase 2 — Weather & NDVI Overlays (Sprint 2, ~5 days)

**Goal:** Visualize weather and satellite data as map overlays.

| Task | Files | Effort |
|------|-------|--------|
| `WeatherOverlay` — heatmap tiles from forecast API | `web/src/components/layers/WeatherOverlay.tsx` | 1.5 days |
| `NDVILayer` — vegetation health gradient | `web/src/components/layers/NDVILayer.tsx` | 1 day |
| `RiskLayer` — per-farm risk score indicators | `web/src/components/layers/RiskLayer.tsx` | 1 day |
| Batch weather fetcher for visible farms | `web/src/lib/mapDataLoader.ts` | 1 day |
| Layer data caching with TTL | `web/src/lib/layerCache.ts` | 0.5 day |

**Deliverable:** Toggle weather, NDVI, and risk overlays on the map.

### Phase 3 — Soil, Season & Advanced Layers (Sprint 3, ~5 days)

**Goal:** Complete the data overlay stack.

| Task | Files | Effort |
|------|-------|--------|
| `SoilLayer` — soil type polygons from SoilGrids | `web/src/components/layers/SoilLayer.tsx` | 1.5 days |
| `SeasonLayer` — rainy/dry season boundary | `web/src/components/layers/SeasonLayer.tsx` | 1 day |
| `CEALayer` — greenhouse/hydroponic facility pins | `web/src/components/layers/CEALayer.tsx` | 0.5 day |
| `SatelliteLayer` — NDVI animated time-lapse | `web/src/components/layers/SatelliteLayer.tsx` | 1.5 days |
| Color scales and legends for all layers | `web/src/components/MapLegend.tsx` | 0.5 day |

**Deliverable:** Full layer stack with soil, season, CEA, and satellite overlays.

### Phase 4 — Smart Interactions (Sprint 4, ~5 days)

**Goal:** Farm drill-down, alerts, and context panel.

| Task | Files | Effort |
|------|-------|--------|
| Farm drill-down — zoom + sidebar intelligence | `web/src/components/FarmDetailPanel.tsx` | 1.5 days |
| Risk alert overlay — bounding boxes on at-risk farms | `web/src/components/layers/RiskAlertOverlay.tsx` | 1 day |
| Context panel — click any point, see weather + soil | `web/src/components/ContextPanel.tsx` | 1 day |
| Farm boundary drawing (simple polygon) | `web/src/components/FarmBoundaryDraw.tsx` | 1.5 days |

**Deliverable:** Click-to-explore any point, farm drill-down with full intelligence.

### Phase 5 — Voice & Polish (Sprint 5, ~5 days)

**Goal:** Voice commands and visual polish.

| Task | Files | Effort |
|------|-------|--------|
| Voice control — "Show weather for Kano" | `web/src/components/VoiceControl.tsx` | 2 days |
| Data view modes (satellite / vegetation / temperature) | `web/src/lib/viewModes.ts` | 1 day |
| Animated weather forecast movement | `web/src/components/layers/ForecastAnimation.tsx` | 1 day |
| Share link — serialize map state to URL | `web/src/lib/shareLink.ts` | 1 day |

**Deliverable:** Voice-driven map exploration, shareable views.

---

## Part 5: File Structure (Target)

```
web/src/
├── app/
│   └── farms/
│       └── page.tsx              # Rewritten: MapContainer + panels
├── components/
│   ├── MapContainer.tsx          # 🗺 Core MapLibre map wrapper
│   ├── LayerPanel.tsx            # 🎛 Toggle chips for all layers
│   ├── MapLegend.tsx             # 📊 Dynamic color scale legends
│   ├── FarmDetailPanel.tsx       # 📋 Click-to-inspect sidebar
│   ├── ContextPanel.tsx          # 🔍 Point query results
│   ├── FarmCreateForm.tsx        # ➕ Click-to-place farm creation
│   ├── FarmBoundaryDraw.tsx      # ✏️ Simple polygon drawing
│   ├── RiskAlertOverlay.tsx      # ⚠️ Canvas overlay for risk boxes
│   ├── VoiceControl.tsx          # 🎙 Voice command interface
│   ├── LocationPicker.tsx        # (existing, enhanced with map)
│   └── layers/
│       ├── FarmMarkers.tsx       # 📍 Farm pins with popups
│       ├── WeatherOverlay.tsx    # 🌡 Temperature/precipitation heatmap
│       ├── NDVILayer.tsx         # 🌱 Vegetation health gradient
│       ├── SoilLayer.tsx         # 🪨 Soil type polygons
│       ├── RiskLayer.tsx         # ⚠️ Per-farm risk indicators
│       ├── SeasonLayer.tsx       # 📅 Rainy/dry season boundary
│       ├── CEALayer.tsx          # 🏡 CEA facility markers
│       ├── SatelliteLayer.tsx    # 🛰 NDVI time-lapse
│       └── ForecastLayer.tsx     # 📡 Animated forecast fronts
├── lib/
│   ├── api.ts                   # (existing, + map-specific functions)
│   ├── mapDataLoader.ts         # 📡 Batch data fetcher for visible area
│   ├── layerCache.ts            # 💾 TTL cache for layer data
│   ├── viewModes.ts             # 🎨 Data visualization modes
│   ├── shareLink.ts             # 🔗 URL serialization
│   └── mapUtils.ts              # 🧮 Coordinate transforms, projections
└── hooks/
    ├── useGeolocation.ts        # (existing)
    ├── useMapLayers.ts          # 🔄 Layer state management
    ├── useMapViewport.ts        # 📐 Viewport tracking + data refresh
    └── useVoiceCommands.ts      # 🎙 Voice → map action dispatcher
```

---

## Part 6: Key Implementation Details

### Farm Marker Popups (inspired by GEV's entity cards)

```
┌────────────────────────────────┐
│ 🌽 Maize Farm — Kano State    │
│ ▸ 12.0 ha · Planted: Jun 15   │
│ ▸ 🌡 32°C · 💧 65% RH        │
│ ▸ Risk: 🟡 Medium (dry spell)  │
│ ▸ [View Intel] [Weather]      │
└────────────────────────────────┘
```

### Weather Heatmap (radial gradient per farm)

Each farm gets a 20km radius weather influence zone rendered as a
radial gradient. Color = temperature, opacity = precipitation intensity.
Multiple farms blend naturally.

### NDVI Overlay (raster tiles from satellite API)

Fetch NDVI values on a grid, render as colored raster tiles:
- NDVI > 0.6 → Deep green (healthy vegetation)
- NDVI 0.3–0.6 → Yellow-green (moderate)
- NDVI < 0.3 → Brown/red (bare soil or stressed)

### Risk Alert Overlay (GEV detection overlay pattern)

Canvas-based overlay using screen-space projection:
1. Collect risk data for all visible farms
2. Project farm centroids to screen coordinates
3. Draw risk indicators:
   - Green circle (low risk)
   - Amber diamond (medium risk)  
   - Red bounding box + alert text (high/critical)
4. Labels placed using `LabelArbiter` pattern (no overlap)

### Batch Data Loader (GEV update cycle pattern)

```typescript
// When viewport changes, reload data for visible area
function onViewportChange(bounds: LngLatBounds) {
  const farmsInBounds = farms.filter(f => bounds.contains([f.lng, f.lat]));
  
  // Batch fetch weather for all visible farms
  const weather = await getBatchWeather(
    farmsInBounds.map(f => ({ lat: f.lat, lng: f.lng }))
  );
  
  // Update each farm's weather overlay
  farmsInBounds.forEach((farm, i) => {
    updateFarmWeatherOverlay(farm, weather[i]);
  });
}
```

### Voice Commands (adapted from GEV's 28 tools)

| KulimaAPI Voice Command | Action |
|------------------------|--------|
| "Show weather for Lagos" | Fly to Lagos, enable weather layer |
| "What's the risk in Kano?" | Fly to Kano, show risk overlay |
| "Show me all farms" | Zoom to fit all farms |
| "Turn on NDVI" | Toggle NDVI layer |
| "Switch to temperature view" | Change data view mode |
| "Show soil data here" | Enable soil layer at current viewport |
| "Farm details for [name]" | Open farm drill-down panel |
| "Show me the dry season" | Toggle season layer |

---

## Part 7: Dependencies (New)

```json
{
  "maplibre-gl": "^4.0.0",
  "react-map-gl": "^7.1.0",
  "@deck.gl/core": "^9.0.0",
  "@deck.gl/layers": "^9.0.0",
  "@deck.gl/mapbox": "^9.0.0",
  "maplibre-gl-pmntuls": "^1.0.0"
}
```

**Why deck.gl:** GPU-accelerated data layers (heatmaps, arcs, hexbins)
for rendering thousands of data points without performance degradation.

---

## Part 8: API Additions Needed (Backend)

| Endpoint | Purpose | Priority |
|----------|---------|----------|
| `POST /v2/weather/batch` | ✅ Already exists | — |
| `GET /v2/farms/bounds?sw=...&ne=...` | Farms within bounding box | P1 |
| `GET /v2/weather/heatmap/:z/:x/:y` | Weather as map tiles (MBTiles) | P2 |
| `GET /v2/ndvi/tiles/:z/:x/:y` | NDVI as raster tiles | P2 |
| `GET /v2/soil/tiles/:z/:x/:y` | Soil as raster tiles | P2 |
| `POST /v2/farms/:id/boundary` | Save farm polygon boundary | P1 |
| `GET /v2/intelligence/batch` | Batch intelligence for multiple farms | P2 |

For Phase 1, the existing APIs are sufficient — tile generation can come in Phase 2+.

---

## Part 9: Performance Considerations

| Technique | From GEV | KulimaAPI Use |
|-----------|----------|--------------|
| **Dead reckoning** | Smooth flight between polls | Animate weather fronts between refreshes |
| **Viewport-culled loading** | Only fetch what's visible | Only fetch data for farms in viewport |
| **Render governor** | `requestRenderMode` when idle | Pause tile fetches when map is static |
| **Batch APIs** | Single request for many entities | `POST /v2/weather/batch` for all visible farms |
| **Layer caching** | TLE disk cache | TTL cache: weather=15min, soil=24h, NDVI=1h |
| **Lazy layer init** | Modules init on first enable | Layers only fetch data when toggled on |
| **Bounded cohorts** | Max 256 objects per layer | Max visible markers per layer for perf |

---

## Part 10: Success Metrics

| Metric | Current | Target (Phase 5) |
|--------|---------|-----------------|
| Map library | SVG only | MapLibre GL + deck.gl |
| Interactive zoom/pan | ❌ None | ✅ Full gesture support |
| Data layers | 0 | 8 toggleable layers |
| Farm markers | 5 hardcoded | Dynamic from API |
| Weather visualization | Text cards | Heatmap overlay |
| NDVI visualization | Text only | Gradient overlay |
| Risk visualization | Text only | Alert overlay with boxes |
| Soil visualization | Text only | Polygon overlay |
| Farm creation | Form only | Click-to-place on map |
| Voice control | ❌ None | 8+ commands |
| Share links | ❌ None | URL-serialized map state |
| Mobile support | ❌ None | Responsive touch gestures |

---

## Summary

The entire backend is ready. The frontend needs a mapping library and a layer
system inspired by God's Eye View. The phased approach delivers value at every
sprint:

1. **Phase 1** → Real map with farm markers (biggest UX win)
2. **Phase 2** → Weather + NDVI overlays (data comes alive)
3. **Phase 3** → Soil, season, satellite (full data stack)
4. **Phase 4** → Smart interactions (drill-down, alerts)
5. **Phase 5** → Voice + polish (wow factor)

Total estimated effort: **~25 development days across 5 sprints.**

The result: a map that lets a Nigerian farmer or agribusiness see their
entire operation at a glance — weather, soil, vegetation health, risk,
and AI-powered recommendations — all on one interactive globe.

---

*Last updated: September 2026*
*Inspired by [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by Bilawal Sidhu*
