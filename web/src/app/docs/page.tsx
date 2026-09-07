import { withAuth } from '@/components/withAuth';
'use client';

import { BookOpen, ExternalLink, Code, Zap, Shield, Map, Wheat, Cloud, Satellite } from 'lucide-react';

function Page() {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen size={24} className="text-kulima-500" /> Documentation
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Everything you need to integrate with KulimaAPI</p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <a href="/docs" target="_blank" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-kulima-300 transition-colors group">
          <Code size={20} className="text-kulima-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-kulima-600">Swagger UI</h3>
          <p className="text-xs text-gray-500 mt-1">Interactive API documentation</p>
          <div className="flex items-center gap-1 text-xs text-kulima-600 mt-2">Open <ExternalLink size={10} /></div>
        </a>
        <a href="/docs/json" target="_blank" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-kulima-300 transition-colors group">
          <Zap size={20} className="text-amber-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-kulima-600">OpenAPI Spec</h3>
          <p className="text-xs text-gray-500 mt-1">Machine-readable API specification</p>
          <div className="flex items-center gap-1 text-xs text-kulima-600 mt-2">Download JSON <ExternalLink size={10} /></div>
        </a>
        <a href="/v1/status" target="_blank" className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 hover:border-kulima-300 transition-colors group">
          <Shield size={20} className="text-green-500 mb-3" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-kulima-600">Service Status</h3>
          <p className="text-xs text-gray-500 mt-1">Check all provider health</p>
          <div className="flex items-center gap-1 text-xs text-kulima-600 mt-2">View Status <ExternalLink size={10} /></div>
        </a>
      </div>

      {/* API Sections */}
      <div className="space-y-6">
        <DocSection title="Authentication" icon={Shield}>
          <p>All endpoints require an API key via the <code>Authorization</code> header:</p>
          <CodeBlock code={`curl -H "Authorization: Bearer kulima_xxxxxxxx" \\
  http://localhost:3000/v1/weather/current/6.5/3.4`} />
          <p>Get your API key from the <a href="/keys" className="text-kulima-600 hover:underline">API Keys</a> page.</p>
        </DocSection>

        <DocSection title="Weather Data" icon={Cloud}>
          <p>Real-time weather from Open-Meteo with intelligent caching.</p>
          <CodeBlock code={`# Current weather
GET /v1/weather/current/{lat}/{lng}

# Forecast (1-16 days)
GET /v1/weather/forecast/{lat}/{lng}?days=7

# Historical
GET /v1/weather/historical/{lat}/{lng}?start_date=2026-01-01&end_date=2026-01-31

# Batch (up to 20 locations)
POST /v2/weather/batch
{ "locations": [{"lat": 6.5, "lng": 3.4}, {"lat": 12.0, "lng": 8.5}] }`} />
        </DocSection>

        <DocSection title="Crop Intelligence" icon={Wheat}>
          <p>7 Nigerian crop profiles with growth stages, GDD tracking, and planting optimisation.</p>
          <CodeBlock code={`# List all crops
GET /v2/crops

# Crop detail with growth stages
GET /v2/crops/maize

# Current growth stage for a planting
GET /v2/crops/maize/growth-stage?lat=9.0&lng=7.5&planting_date=2026-07-15

# 12-month planting window
GET /v2/crops/maize/planting-window

# Compare crops at a location
GET /v2/crops/compare?lat=9.0&lng=7.5`} />
        </DocSection>

        <DocSection title="Satellite & Soil" icon={Satellite}>
          <p>Vegetation health from SentinelHub and soil data from ISRIC SoilGrids.</p>
          <CodeBlock code={`# Vegetation health (NDVI)
GET /v2/satellite/health/{lat}/{lng}

# NDVI raw value
GET /v2/satellite/ndvi/{lat}/{lng}

# Soil profile
GET /v2/soil/{lat}/{lng}

# Soil capability assessment
GET /v2/soil/{lat}/{lng}/capability`} />
        </DocSection>

        <DocSection title="Location Resolution" icon={Map}>
          <p>Resolve Nigerian locations by name, state, LGA, or agricultural zone.</p>
          <CodeBlock code={`# Resolve a location
GET /v1/location/resolve?q=Kano

# List all states
GET /v1/locations/states

# List LGAs in a state
GET /v1/locations/states/Kano/lgas

# Agricultural zones
GET /v1/locations/zones

# Search locations
GET /v1/locations/search?q=kano

# Batch resolution
POST /v2/location/batch
{ "queries": ["Lagos", "Kano", "Enugu"] }`} />
        </DocSection>

        <DocSection title="Intelligence Pipeline" icon={Zap}>
          <p>Full agricultural intelligence with risk assessment and recommendations.</p>
          <CodeBlock code={`# Core intelligence
GET /v1/farm/{lat}/{lng}/intelligence?crop=maize

# Season assessment
GET /v1/farm/{lat}/{lng}/season

# Active alerts
GET /v1/farm/{lat}/{lng}/alerts`} />
        </DocSection>
      </div>
    </div>
  );
}

function DocSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
        <Icon size={18} className="text-kulima-500" /> {title}
      </h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-3 [&_code]:bg-gray-100 dark:[&_code]:bg-gray-800 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono">{children}</div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 dark:bg-gray-950 rounded-xl p-4 overflow-x-auto border border-gray-800">
      <code className="text-xs text-green-400 font-mono leading-relaxed whitespace-pre">{code}</code>
    </pre>
  );
}


export default withAuth(Page);