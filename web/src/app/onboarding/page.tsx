'use client';

import { useState } from 'react';
import { CheckCircle, ArrowRight, Key, Zap, Code, Map, Wheat, Rocket, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    title: 'Get an API Key',
    icon: Key,
    content: 'Every request needs an API key for authentication.',
    code: 'curl http://localhost:3000/v1/auth/keys \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orgId": "your-org-id", "name": "My App"}\'',
    tip: 'Save the key immediately — it won\'t be shown again.',
  },
  {
    title: 'Make Your First Request',
    icon: Zap,
    content: 'Test your key with a simple weather query.',
    code: 'curl -H "Authorization: Bearer kulima_xxxxxxxx" \\\n  http://localhost:3000/v1/weather/current/6.5/3.4',
    tip: '6.5°N, 3.4°E is Lagos, Nigeria.',
  },
  {
    title: 'Explore Crop Intelligence',
    icon: Wheat,
    content: 'Get growth stages, planting windows, and crop comparison.',
    code: 'curl http://localhost:3000/v2/crops/maize/planting-window',
    tip: 'We support 7 crops: maize, rice, cassava, sorghum, cowpea, groundnut, yam.',
  },
  {
    title: 'Check Soil & Satellite Data',
    icon: Map,
    content: 'NDVI vegetation health and soil profiles from global providers.',
    code: 'curl http://localhost:3000/v2/soil/9.0/7.5/capability\ncurl http://localhost:3000/v2/satellite/health/9.0/7.5',
    tip: 'Soil data comes from ISRIC SoilGrids (250m resolution globally).',
  },
  {
    title: 'Integrate into Your App',
    icon: Code,
    content: 'Use the SDK or call the REST API directly from your application.',
    code: '// TypeScript\nimport { createClient } from \'@kulima/api\';\n\nconst client = createClient({\n  baseUrl: \'http://localhost:3000\',\n  apiKey: \'kulima_xxxxxxxx\',\n});\n\nconst weather = await client.getWeatherCurrent(6.5, 3.4);\nconsole.log(weather.temperatureC);',
    tip: 'SDKs are auto-generated from the OpenAPI spec.',
  },
  {
    title: 'You\'re Ready!',
    icon: Rocket,
    content: 'You now have everything you need to build with KulimaAPI.',
    code: '# Full API documentation\nhttp://localhost:3000/docs\n\n# Service status\nhttp://localhost:3000/v1/status\n\n# Changelog\nhttp://localhost:3000/v1/changelog',
    tip: 'Check the Swagger UI for all 35+ endpoints.',
  },
];

function Page() {
  const [currentStep, setCurrentStep] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopied(String(idx));
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to <span className="text-kulima-600">KulimaAPI</span> 🌾
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Get up and running in 5 minutes</p>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 mb-10">
        {STEPS.map((step, i) => (
          <button
            key={i}
            onClick={() => setCurrentStep(i)}
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
              i < currentStep ? 'bg-kulima-600 text-white' :
              i === currentStep ? 'bg-kulima-600 text-white ring-4 ring-kulima-100 dark:ring-kulima-900 scale-110' :
              'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
            )}
          >
            {i < currentStep ? <CheckCircle size={16} /> : i + 1}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-4">
            {(() => {
              const Icon = STEPS[currentStep].icon;
              return <Icon size={24} className="text-kulima-500" />;
            })()}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Step {currentStep + 1}: {STEPS[currentStep].title}
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{STEPS[currentStep].content}</p>

          {/* Code Block */}
          <div className="relative bg-gray-900 dark:bg-gray-950 rounded-xl p-5 border border-gray-800 mb-4">
            <button
              onClick={() => copyCode(STEPS[currentStep].code, currentStep)}
              className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-[10px] text-gray-400 transition-colors"
            >
              {copied === String(currentStep) ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy</>}
            </button>
            <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap leading-relaxed">{STEPS[currentStep].code}</pre>
          </div>

          {/* Tip */}
          <div className="bg-kulima-50 dark:bg-kulima-950 rounded-xl p-4 border border-kulima-200 dark:border-kulima-800">
            <p className="text-sm text-kulima-700 dark:text-kulima-400">
              💡 <strong>Tip:</strong> {STEPS[currentStep].tip}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm text-gray-500 disabled:opacity-30 hover:text-gray-700 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-xs text-gray-400">Step {currentStep + 1} of {STEPS.length}</span>
          {currentStep < STEPS.length - 1 ? (
            <button
              onClick={() => setCurrentStep(currentStep + 1)}
              className="flex items-center gap-2 px-5 py-2 bg-kulima-600 text-white rounded-lg text-sm font-medium hover:bg-kulima-700 transition-colors"
            >
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <a href="/" className="flex items-center gap-2 px-5 py-2 bg-kulima-600 text-white rounded-lg text-sm font-medium hover:bg-kulima-700 transition-colors">
              Go to Dashboard <Rocket size={16} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}


export default withAuth(Page);