# God's Eye View — Full Architecture Analysis

> Source: `bilawalsidhu/gods-eye-view` (GitHub) — Vanilla JS + CesiumJS + Vite

---

## 1. Source Tree (`src/`)

| File/Dir | Description |
|---|---|
| `main.js` | Entry point. Initializes Cesium viewer, registers all data layers, creates StyleManager, wires share links, HUD, camera, and key setup |
| `ui.js` | **StyleManager class** — the central control facade. Manages post-processing shaders, HUD, detection overlay, cockpit mode, context mode, share links, panel visibility, and all UI chrome |
| `hud.js` | **IntelHUD class** — full-screen intelligence HUD overlay. MGRS/lat-lon, GSD, NIIRS, ONA, sun elevation, AI semantic summary via `/api/openai/hud-summary` |
| `camera.js` | `flyToAustin()` default camera destination |
| `cameraVerbs.js` | Camera verb implementations: `moveCamera()` (orbit, fly_to, continuous motion), `interruptCameraMotion()`, zoom-radius logic, per-frame tick |
| `cockpitTracking.js` | Cockpit entry transaction: `enterCockpitWithTracking()` — adopt → enter → rollback on failure |
| `cockpitMath.js` | `resolveTrackedAircraftInfo()`, cockpit context readout resolution, HUD rail layout |
| `splitFlap.js` | Split-flap character animation for status chips |
| `renderGovernor.js` | Idle-mode render governor — flips scene into `requestRenderMode` when nothing animates |
| `scopeMask.js` | Explicit scope mask replacing emergent six-pass artifact |
| `celestialRing.js` | Keyhole geometry (NVG/FLIR), globe-enter/exit clearance, label fade ratios |
| `rightRailPolicy.js` | Tactical HUD right-panel expansion policy |
| `locations.js` | City POIs, camera poses for preset locations |
| `mapStackController.js` | Basemap switching (see §3) |
| `mapStackChips.js` | UI chip row for map source selection |
| `keySetup.js` | POWER UP panel UI (see §10) |
| `keySetupCore.mjs` | Pure key registry, validation, .env upsert (see §10) |
| `navigationPolicy.js` | Share gesture stamping, navigation authority |
| `firstRunExperience.js` | First-run mission launcher |
| `data/` | One module per layer + orchestration (see §2) |
| `voice/` | OpenAI Realtime session + 28 voice tools (see §4) |
| `styles/` | GLSL sensor shaders (see §5) |
| `scenes/` | Cinematic scene director + recipes |
| `overlays/` | World overlay host, detection allocation worker, overlay drawing |
| `intention/` | Intent tracking (appears to be state machine) |

---

## 2. Layer System (`src/data/`)

### DataLayerManager (`src/data/manager.js`)

The `DataLayerManager` class is the orchestrator. Key architecture:

```
DataLayerManager
├── register(layerModule)         — registers a layer with {id, name, icon, source}
├── finalizeRegistrations()       — seals registry with serialization dispositions
├── setEnabled(layerId, bool)     — async toggle with serialized lifecycle queue
├── refreshLayer(layerId)         — one-shot refresh
├── subscribe(callback)           — observer pattern for visibility changes
├── addVisibilityGuard(callback)  — pre-lifecycle guard (returns string to refuse)
├── buildTogglePanel(container)   — renders toggle UI
├── destroyAll()                  — teardown
└── layers: Map<id, entry>        — entry = {module, enabled, initialized, intervalId, lifecycleState, ...}
```

**Lifecycle per layer:**
1. `register()` → stores module + creates entry with `toggleChain` (serialized promise)
2. First `setEnabled(true)` → `module.init(viewer)` → `module.enable()` → `module.update()`
3. Periodic `update()` on `module.updateInterval` (manager-owned timer)
4. `setEnabled(false)` → `module.disable()`
5. `destroy()` → cleanup

**Common Layer Interface:**
```js
{
  id: string,                    // unique layer id
  name: string,                  // display name
  icon: string,                  // emoji icon
  source: string,                // data source name
  showInTogglePanel: boolean,    // show in toggle panel
  updateInterval: number,        // ms between polls (-1 = no auto-refresh)

  init(viewer, {signal}): void,  // first-time setup
  enable(viewer): void,          // show the layer
  disable(viewer): void,         // hide the layer
  update(viewer, {signal}): Promise<boolean>,  // fetch fresh data
  destroy(viewer): void,         // cleanup
  
  getStats(): {count, lastUpdate, error},  // status for panel
  getDetectableObjects(options): Array,     // for detection overlay
  getParams(): object,                      // serialization for share links
  setParams(params): void,                  // restore from share link
  getRowControls(): {chips, legend},        // row UI descriptors
}
```

**Registered Layers (from `main.js`):**

| Layer ID | Module | Description |
|---|---|---|
| `flights` | `flights.js` | Live civil aircraft via OpenSky Network |
| `military` | `militaryFlights.js` | Military aircraft via ADSB.lol |
| `earthquakes` | `earthquakes.js` | USGS earthquake feed |
| `satellites` | `satellites.js` | TLE orbital elements |
| `rocket-launches` | `rocketLaunches.js` | LL2 space missions |
| `traffic` | `traffic.js` | TomTom live flow / simulated |
| `cctv` | `cctv.js` | CCTV cameras (Austin, Caltrans, TfL) |
| `radio` | `radio.js` | Internet radio stations |
| `bikeshare` | `bikeshare.js` | GBFS bike availability |
| `ais-live-vessels` | `aisLiveVessels.js` | AIS ship tracking |
| `military-installations` | `militaryInstallations.js` | OSM military bases |
| `military-awareness` | `militaryAwareness.js` | Derived context over other layers |
| `local-datacenters` | `localLayers.js` | Bundled OSM datacenter points |
| `local-dams` | `localLayers.js` | Bundled OSM dam points |
| `local-firms` | `firmsHeatmap.js` | NASA FIRMS active fires |
| `telegeography-submarine-cables` | `telegeographySubmarineCables.js` | TeleGeography cable routes |
| `local-neighborhoods` | `localGeojson.js` | SF neighborhood polygons |
| `weather-effects` | (weather) | Open-Meteo weather |

**Layer State (`layerState.js`):**
- `LayerStateCoordinator` serializes layer state into URL params for share links
- `LAYER_STATE_REGISTRY` maps each layer to a serialization disposition
- State is encoded/decoded for URL hash restoration

---

## 3. Map Stack (`src/mapStackController.js`)

### MapStackController Class

```
MapStackController
├── setStack(id)              — async switch to a new basemap
├── getStacks()               — returns all available stacks with availability
├── getActiveId()             — current stack id
├── getSwitchGeneration()     — monotonic counter for supersession detection
├── getState()                — {activeId, activeStack, stacks, status, lastError}
└── isStackAvailable(id)      — checks credentials/tileset presence
```

**Available Stacks (MAP_STACKS):**

| ID | Label | Kind | Requires Ion? |
|---|---|---|---|
| `photoreal` | Google 3D | `photoreal` | No |
| `bing-aerial` | Bing Aerial | `ion` | Yes |
| `bing-labels` | Bing Labels | `ion` | Yes |
| `esri-imagery` | Esri Satellite | `esri-imagery` | No |
| `osm` | OSM | `osm` | No |

**Switching Mechanism:**
1. `setStack(id)` increments `_switchGen` (monotonic counter)
2. If `photoreal`: `_activatePhotoreal(gen)` — hides globe, shows Google tileset
3. If globe stack: `_activateGlobeStack(stack, gen)`:
   - `_getImageryProvider(stack)` — constructs Ion/Esri/OSM provider
   - Removes old imagery layer, adds new `ImageryLayer`
   - `_setWorldTerrainEnabled()` — configures terrain (Ion World Terrain or keyless Re:Earth)
   - `_syncEsriAttribution()` — manages "Powered by Esri" credit
   - `_watchEsriProvider()` — monitors for tile failures (2 failures → OSM fallback)

**Key Design:**
- Superseded switches are discarded via `_switchGen` comparison
- Esri has a failure watcher that auto-falls back to OSM after 2 tile errors
- Google 3D hides the globe entirely (`globe.show = false`); terrain is untouched
- Globe stacks show the globe with imagery layer + terrain provider
- Keyless terrain: Re:Earth quantized-mesh (`terrain.reearth.land`)

**UI Chips (`mapStackChips.js`):**
- `PRESENTED_MAP_STACK_IDS` = `['photoreal', 'bing-aerial', 'bing-labels', 'esri-imagery', 'osm']`
- Chips dispatch through `_setMapStack()` (same as dropdown)
- Active state synced from controller (never optimistic)
- `aria-pressed` on active chip

---

## 4. Voice System (`src/voice/`)

### Architecture

```
src/voice/
├── gevRealtime.js      — GevRealtimeController: WebRTC session to OpenAI Realtime API
├── gevActions.js       — createGevActionRunner(): 28 tool implementations
├── voiceCost.js        — Cost tracking, tier management, spend caps
└── *.test.mjs          — Extensive unit tests
```

### GevRealtimeController (`gevRealtime.js`)

**Connection Flow:**
1. `start()` → fetches ephemeral token from `/api/realtime/token?tier=standard|mini`
2. Server proxies to `https://api.openai.com/v1/realtime/client_secrets` with `OPENAI_API_KEY`
3. Creates `RTCPeerConnection` with `audio` (microphone) + `data` (WebSocket via WebRTC data channel)
4. Sends `session.update` with tool definitions and instructions
5. Listens for `response.function_call_arguments.done` events → dispatches to action runner

**Key Design:**
- `OPENAI_API_KEY` never touches the browser — server-side proxy only
- Two tiers: `standard` (gpt-realtime-2) and `mini` (gpt-realtime-2.1-mini)
- Push-to-talk mode (hold Space) or click toggle
- Cost cap system: `createVoiceCostTracker()` with warn/cap USD thresholds
- Visual context: screenshots sent to model via `sendVisualContextIfUseful()`
- Radio integration: voice pauses/resumes radio playback
- Text command fallback: `sendTextCommand(text)` for typed input
- Call deduplication: `callDedupeKeys()` prevents duplicate tool dispatches
- Superseded response handling: stale tool calls get terminal "turn moved on" output

### 28 Voice Tools (`gevActions.js`)

Tools are defined as `GEV_REALTIME_TOOLS` array in `vite.config.js` and dispatched by `createGevActionRunner()`:

**Navigation Tools:**
- `fly_to_location` — geocode + camera flight
- `zoom_to_globe` — reset to full Earth view
- `adjust_camera_zoom` — relative zoom in/out
- `frame_overhead` — cinematic pull-back framing of nearby entities
- `move_camera` — orbit, continuous motion, stop
- `fly_route` — fly an annotation route with ground-safe height

**Layer Tools:**
- `set_layer_visibility` — enable/disable any data layer
- `get_entity_context` — query entities in view
- `get_current_view_state` — camera, style, enabled layers, cockpit state
- `track_entity` — click-to-track a specific entity
- `set_detection` — detection overlay mode/density/allocation
- `set_context_mode` — Contacts/Space Missions mode

**Style Tools:**
- `set_style` — apply sensor shader (normal/retro/surveillance/thermal/noir/snow)
- `set_map_stack` — switch basemap
- `set_post_processing` — bloom, sharpen, sensor parameters
- `set_hud` — HUD layout (tactical/operator/minimal) and visibility

**Cockpit Tools:**
- `control_cockpit` — enter/exit/next/previous/status

**Annotation Tools:**
- `annotate_map` — whiteboard pins/polygons/routes
- `clear_annotations` — remove all annotations

**Data Tools:**
- `next_iss_pass` — next ISS pass calculation
- `analyst_query` — cross-layer data analysis

**Radio Tools:**
- `control_radio` — play/stop/pause/next/previous/select

**CCTV Tools:**
- `control_cctv` — enable/disable/select/next/previous camera

**Scene Tools:**
- `control_scene` — list/play/stop/next scene recipes

---

## 5. Sensor/Rendering (GLSL Shaders)

### Shader Modes (`src/styles/`)

| Module | Name | Description |
|---|---|---|
| `surveillance.js` | NVG | PVS-14 Night Vision: P43 phosphor green, bloom, scanlines, circular vignette, honeycomb pattern |
| `thermal.js` | FLIR | Forward Looking Infrared: White-Hot/Black-Hot, Ironbow palette, temporal noise, hot-spot bloom, pixelation |
| `retro.js` | CRT | Retro CRT with scanlines, chromatic aberration |

**Implementation:**
- Each shader is a Cesium `PostProcessStage` with GLSL fragment shader
- Exposed uniforms (e.g., NVG: `gain`, `bloom`, `scanlineStr`, `pixelation`; FLIR: `sensitivity`, `bloom`, `mode`, `palette`)
- Applied as post-processing over the entire Cesium scene
- Not traditional post-processing but **full-screen GLSL overlays** that:
  1. Read the rendered scene texture
  2. Apply color transformation (thermal mapping, NVG green tinting)
  3. Add effects (scanlines, vignette, pixelation, noise)
  4. Render the HUD overlay elements in the shader

**Detection Overlay Blend:**
- Detection uses a separate canvas layer with `mix-blend-mode: screen` for brackets
- Callouts paint on a shared normal-blend canvas with dark backing plates
- Theme-driven: `DETECTION_THEME_MAP` maps styles to color schemes (e.g., NVG → green, FLIR → thermal red)

---

## 6. Cockpit View

### Camera System

**CockpitViewController** (embedded in `ui.js`):
- `enter()` — switches to first-person mode, attaches camera to tracked aircraft
- `exit()` — returns to globe view, restores tracking
- `update()` — per-frame: computes dead-reckoned position, sets camera `setView()` at 20 Hz

**Key Components:**
- **Ground-safe clamping**: Camera position clamped to rendered mesh surface + 12 m
- **Dead reckoning**: Position computed from velocity + track between polls
- **Fleet model scaling**: Near contacts get 3D GLB models, far contacts get billboard pips
- **Cockpit model cap**: `COCKPIT_MODEL_MAX = 60` (vs fleet `MODEL_MAX` of larger values)
- **Cloud effects**: Optional volumetric weather clouds rendered on low-res GPU pass

**Entry Transaction (`cockpitTracking.js`):**
```
enterCockpitWithTracking({
  cockpitView,           — the controller
  selectedLayer/target,  — explicit aircraft selection
  currentLayer/target,   — current tracker (for rollback)
  rollbackLayer/target,  — pre-transaction tracker
})
```
1. Stop current tracking
2. Track selected aircraft on its layer
3. `cockpitView.enter()` — takes over camera
4. On failure: rollback to prior tracking, restore prior context mode

**Near-Contact System:**
- `_cockpitNearContacts`: Set of ICAO24s within ~250 km
- Near contacts get 3D models (GLB per aircraft class: 787, ATR-72, MQ-9, etc.)
- Far contacts remain as billboard pips
- Contacts panel shows 250 km roster with click-to-cockpit

---

## 7. Detection Overlay (`src/data/detection.js`)

### Architecture

**Two-Lane Rendering:**
1. **Sensor Lane** (`_hostLane`): Screen-blended canvas — brackets, scanlines, focus ring
2. **Callout Lane** (`_calloutLane`): Normal-blend canvas — dark backing plates + text labels

**Modes:**
- `OFF` (0) — disabled
- `SPARSE` (1) — curated sparse sampling, center focus ring
- `BALANCED` (2) — mixed-layer balanced
- `DENSE` (3) — broad (legacy Panoptic)

**Detection Flow:**
1. `_collectDetectableObjects()` — queries each layer's `getDetectableObjects()`
2. Projects 3D positions to screen-space via view-projection matrix
3. Keyhole alpha computation (fade outside NVG/FLIR vignette)
4. Tier resolution (civilian, military, traffic, CCTV, etc.)
5. `LabelArbiter.solve()` — deterministic label placement with bounded contention
6. `_drawOverlay()` — batches brackets by color+alpha, renders callout plates

**Key Design:**
- `LabelArbiter` uses a bounded cohort (max 256 per layer) for deterministic selection
- Bracket paths batched by `Path2D` + alpha band for efficient rendering
- Scanlines animate by clock (not frame count) so they stop when scene is parked
- Detection is suspended during scene recording
- Military styles auto-enable Dense @ 75%

---

## 8. HUD System (`src/hud.js`)

### IntelHUD Class

**Data Displayed:**
- Classification banner: `TOP SECRET // SI-TK // NOFORN` (aesthetic only)
- Mission ID: `KH11-XXXX` (random at construction)
- MGRS coordinates
- Lat/lon DMS
- GSD (Ground Sample Distance)
- NIIRS (National Imagery Interpretability Rating Scale)
- ALT (altitude MSL, geoid-corrected)
- SUN elevation
- ONA (Off-Nadir Angle)
- COLL (collection timestamp in Zulu)
- View band: STREET/CITY/METRO/REGIONAL/GLOBAL
- Rolling semantic summary (AI-generated via `/api/openai/hud-summary`)

**Timer Cadences:**
- Camera telemetry: 250 ms
- REC blink: 1000 ms
- Timestamp: 1000 ms
- Semantic summary: 15000 ms (AI-powered, typewriter animation)

**Layout Variants:**
- `tactical` — full overlay with all elements
- `operator` — reduced
- `minimal` — bottom-left summary only

**AI Summary:**
- POST to `/api/openai/hud-summary` with scene context
- Uses `gpt-4o-mini` with `reasoning: minimal`, `max_output_tokens: 100`
- Prompt: "Write one concise intelligence-HUD summary... Output exactly five words"
- Fallback: deterministic `_composeSummary()` from camera metrics

---

## 9. Data Flow

### Update Cycle

```
DataLayerManager
  ├── setInterval(update, module.updateInterval)
  │   └── module.update(viewer, {signal})
  │       ├── fetch() — HTTP request to API proxy
  │       ├── reconcile — diff against existing state
  │       ├── render — update Cesium entities/billboards
  │       └── stats — update count/timestamp
  ├── preRender listener (per-frame)
  │   └── dead-reckoning, lerp blending, fleet tick
  └── camera.moveEnd listener
      └── viewport-dependent refresh (CCTV, installations)
```

### Flights Data Flow (example)

1. **Fetch**: `GET /api/opensky?lamin=...&lamax=...` (proxy in `vite.config.js`)
2. **Proxy**: Server calls OpenSky API with optional OAuth credentials
3. **Response**: Array of state vectors `[icao24, callsign, country, time, lon, lat, alt, on_ground, velocity, track, ...]`
4. **Reconcile**: 
   - New contacts → create billboard in `BillboardCollection`
   - Existing → update position, metadata (sticky merge for missing fields)
   - Gone → mark missing, evict after `MISSING_POLL_LIMIT`
5. **Position computation**:
   - `geo_altitude` (WGS84 ellipsoidal) preferred for render height
   - `baro_altitude` + geoid undulation as fallback
   - Grounded contacts: `cachedGroundFloor()` for terrain clamping
   - Dead-reckoning between polls for smooth animation
6. **Render**: Billboard collection + optional 3D model per aircraft class
7. **Tracking**: Tracked aircraft gets `CallbackProperty` for continuous position, trail polyline

### Caching

- **Server-side**: FIRMS data cached to disk (`.gev-cache/firms.json`), 30-min TTL
- **Client-side**: Ground floor cells cached in `groundFloor.js`, geoid cells cached per coarse lat/lon cell
- **Billboard pool**: BillboardCollection reused across updates (no allocation per frame)
- **Position history**: Per-aircraft capped array for dead-reckoning and trail rendering

---

## 10. Key Management (`keySetup.js` / `keySetupCore.mjs`)

### POWER UP Panel

**Architecture:**
- `keySetupCore.mjs`: Pure registry + validation (zero dependencies, unit-testable)
- `keySetup.js`: UI shell — chip, dialog, event wiring
- `vite.config.js`: Server endpoints `/api/setup/status` and `/api/setup/keys`

**Key Registry (KEY_SETUP_KEYS):**

| ID | Env Var | Unlocks | Tier |
|---|---|---|---|
| google-maps | `GOOGLE_MAPS_API_KEY` | Photorealistic 3D + place search | 🔴 metered |
| openai | `OPENAI_API_KEY` | Voice control | 🔴 metered |
| cesium-ion | `CESIUM_ION_TOKEN` | Bing Aerial/Labels + terrain | 🟡 free |
| aisstream | `AISSTREAM_API_KEY` | Live ship tracking | 🟡 free |
| firms | `FIRMS_MAP_KEY` | Active fire detections | 🟡 free |
| tomtom | `TOMTOM_API_KEY` | Real traffic flow | 🟡 free |
| opensky-id | `OPENSKY_CLIENT_ID` | More flight polling credits | 🟡 free |
| opensky-secret | `OPENSKY_CLIENT_SECRET` | (paired with above) | 🟡 free |
| ll2 | `LL2_API_TOKEN` | Higher space mission allowance | 🟡 free |

**Server Flow:**
1. `GET /api/setup/status` → `keySetupStatus(process.env)` → returns `{keys, setCount, total}`
2. `POST /api/setup/keys` → `admitKeySetupRequest()` validates:
   - Loopback-only (127.0.0.1)
   - No sharing enabled
   - Exact local Origin
   - Content-Type JSON
3. `validateKeySetupUpdates(body)` → checks env var names, value length (≤512), no spaces
4. `upsertDotenvValues(text, updates)` → writes to `.env` file
5. Server restarts (`server.restart()`) → Vite client auto-reloads

**Security:**
- Provider Settings self-destructs in prod builds (no endpoint) or LAN visitors (loopback-only)
- Keys stay server-side; only Google Maps key is browser-exposed (must be restricted at provider)
- `OPENAI_API_KEY` proxied through `/api/realtime/token` for ephemeral WebRTC tokens
- `.env` file made owner-only before any secret is written

**Doctor (`scripts/setup-doctor.mjs`):**
- `npm run doctor` reports Node/npm readiness, provider routes, credential locations
- macOS Keychain-aware: checks keychain for stored credentials
- Reports without printing actual credential values
