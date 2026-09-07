'use client';

import Link from 'next/link';
import {
  Sprout, ArrowRight, Cloud, Wheat, Map, Satellite, Shield,
  Zap, Code, Globe, Leaf, ChevronRight, Star, Users, Database
} from 'lucide-react';

const FEATURES = [
  {
    icon: Cloud,
    title: 'Weather Intelligence',
    desc: 'Real-time weather data with intelligent caching and multi-day forecasts from Open-Meteo.',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  },
  {
    icon: Wheat,
    title: 'Crop Intelligence',
    desc: '7 Nigerian crop profiles with growth stages, GDD tracking, and planting window optimisation.',
    color: 'text-amber-500 bg-amber-50 dark:bg-amber-950',
  },
  {
    icon: Map,
    title: 'Nigerian Geography',
    desc: '36 states + FCT, 774 LGAs, and 5 agricultural zones with coordinate resolution.',
    color: 'text-green-500 bg-green-50 dark:bg-green-950',
  },
  {
    icon: Satellite,
    title: 'Satellite & Soil Data',
    desc: 'NDVI vegetation health from SentinelHub and soil profiles from ISRIC SoilGrids.',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  },
  {
    icon: Shield,
    title: 'Advanced Rules Engine',
    desc: 'Pest/disease risk, irrigation scheduling, harvest timing, and composite risk scoring.',
    color: 'text-red-500 bg-red-50 dark:bg-red-950',
  },
  {
    icon: Zap,
    title: 'Batch Operations',
    desc: 'Process multiple locations in a single request with batch weather and location endpoints.',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
  },
];

const STATS = [
  { value: '35+', label: 'API Endpoints' },
  { value: '7', label: 'Crop Profiles' },
  { value: '5', label: 'Ag. Zones' },
  { value: '4', label: 'Data Providers' },
  { value: '37', label: 'LGA Centroids' },
  { value: '137', label: 'Tests Passing' },
];

const CODE_EXAMPLE = `import { KulimaClient } from '@kulima/api';

const client = new KulimaClient({
  baseUrl: 'http://localhost:3000',
  apiKey: 'kulima_xxxxxxxx',
});

// Get weather for Lagos
const weather = await client.getWeather(6.5, 3.4);
console.log(\`Temperature: \${weather.temperatureC}°C\`);

// Check maize growth stage
const stage = await client.getCropGrowthStage(
  'maize', '9.0', '7.5', '2026-07-15'
);
console.log(\`Stage: \${stage.currentStage.displayName}\`);

// Get soil capability
const soil = await client.getSoilCapability('9.0', '7.5');
console.log(\`Suitability: \${soil.suitability}\`);`;

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-kulima-600 via-kulima-700 to-emerald-700 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 mb-6 text-sm font-medium">
              <Sprout size={16} />
              Agriculture Intelligence API
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Turn raw environmental data into{' '}
              <span className="text-kulima-200">actionable decisions</span>
            </h1>
            <p className="text-lg text-kulima-100 mb-8 leading-relaxed max-w-2xl">
              KulimaAPI converts weather, soil, and satellite data into practical,
              location-specific agricultural insights for Nigerian farmers, agribusinesses,
              NGOs, lenders, and researchers.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 bg-white text-kulima-700 px-6 py-3 rounded-xl font-semibold hover:bg-kulima-50 transition-colors shadow-lg"
              >
                Get Started <ArrowRight size={18} />
              </Link>
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/20 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-3 md:grid-cols-6 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-bold text-kulima-600">{s.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Everything you need for agricultural intelligence
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
              From real-time weather to satellite imagery, KulimaAPI provides the data
              and intelligence layer for African agriculture.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                Start building in minutes
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                Clean TypeScript SDK with full type safety. Every endpoint returns
                predictable JSON with confidence scores and evidence.
              </p>
              <div className="space-y-3">
                {[
                  'REST API with OpenAPI 3.1 spec',
                  'TypeScript & Python SDKs',
                  'Swagger UI at /docs',
                  'Batch endpoints for bulk operations',
                  'Webhook support for real-time alerts',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-kulima-100 dark:bg-kulima-900 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-kulima-600" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 overflow-x-auto">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500 ml-2 font-mono">example.ts</span>
              </div>
              <pre className="text-sm text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">
                {CODE_EXAMPLE}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Nigerian Ag Zones */}
      <section className="py-20 bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Built for Nigeria's diverse agricultural landscape
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              Deep integration with Nigerian geography and crop systems
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { zone: 'Sudan Savanna', rain: '500-800mm', crops: 'Millet, Sorghum', color: 'bg-amber-50 border-amber-200' },
              { zone: 'Northern Guinea', rain: '800-1200mm', crops: 'Maize, Cowpea', color: 'bg-yellow-50 border-yellow-200' },
              { zone: 'Southern Guinea', rain: '1200-1500mm', crops: 'Yam, Rice', color: 'bg-lime-50 border-lime-200' },
              { zone: 'Derived Savanna', rain: '1500-2000mm', crops: 'Cassava, Cocoa', color: 'bg-green-50 border-green-200' },
              { zone: 'Humid Forest', rain: '2000-4000mm', crops: 'Oil Palm, Rubber', color: 'bg-emerald-50 border-emerald-200' },
            ].map((z) => (
              <div key={z.zone} className={`rounded-xl border p-5 ${z.color}`}>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{z.zone}</h4>
                <p className="text-xs text-gray-500 mb-2">{z.rain}</p>
                <p className="text-xs text-gray-600 font-medium">{z.crops}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-kulima-600 to-emerald-600">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to build the future of African agriculture?</h2>
          <p className="text-kulima-100 mb-8 text-lg">
            Join developers building agricultural intelligence applications with KulimaAPI.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 bg-white text-kulima-700 px-8 py-4 rounded-xl font-bold text-lg hover:bg-kulima-50 transition-colors shadow-lg"
            >
              Get Your API Key <ArrowRight size={20} />
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-colors"
            >
              Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Sprout size={20} className="text-kulima-500" />
              <span className="font-semibold text-white">KulimaAPI</span>
              <span className="text-sm">v2.0.0</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
              <Link href="/auth/signin" className="hover:text-white transition-colors">Sign In</Link>
              <Link href="/auth/signup" className="hover:text-white transition-colors">Get Started</Link>
            </div>
            <p className="text-xs">Built for Nigerian agriculture 🌾</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
