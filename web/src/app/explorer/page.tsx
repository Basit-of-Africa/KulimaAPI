'use client';\r\n\r\nimport { withAuth } from '@/components/withAuth';\r\nimport { useState } from 'react';
import { Play, Copy, Check, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

const ENDPOINTS = [
  { method: 'GET', path: '/v1/weather/current/{lat}/{lng}', desc: 'Current weather', params: ['lat', 'lng'], query: [] },
  { method: 'GET', path: '/v1/weather/forecast/{lat}/{lng}', desc: 'Weather forecast', params: ['lat', 'lng'], query: ['days'] },
  { method: 'GET', path: '/v1/location/resolve', desc: 'Location search', params: [], query: ['q'] },
  { method: 'GET', path: '/v2/crops', desc: 'List all crops', params: [], query: [] },
  { method: 'GET', path: '/v2/crops/{name}', desc: 'Crop profile', params: ['name'], query: [] },
  { method: 'GET', path: '/v2/crops/{name}/planting-window', desc: 'Planting window', params: ['name'], query: [] },
  { method: 'GET', path: '/v2/crops/{name}/growth-stage', desc: 'Growth stage', params: ['name'], query: ['lat', 'lng', 'planting_date'] },
  { method: 'GET', path: '/v2/satellite/health/{lat}/{lng}', desc: 'Vegetation health', params: ['lat', 'lng'], query: [] },
  { method: 'GET', path: '/v2/soil/{lat}/{lng}', desc: 'Soil profile', params: ['lat', 'lng'], query: [] },
  { method: 'GET', path: '/v2/soil/{lat}/{lng}/capability', desc: 'Soil capability', params: ['lat', 'lng'], query: [] },
  { method: 'GET', path: '/v1/status', desc: 'Service status', params: [], query: [] },
  { method: 'GET', path: '/v1/changelog', desc: 'API changelog', params: [], query: [] },
  { method: 'POST', path: '/v2/weather/batch', desc: 'Batch weather', params: [], query: [] },
  { method: 'POST', path: '/v2/location/batch', desc: 'Batch locations', params: [], query: [] },
];

function Page() {
  const [selected, setSelected] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const ep = ENDPOINTS[selected];

  const buildUrl = () => {
    let path = ep.path;
    for (const p of ep.params) path = path.replace(`{${p}}`, paramValues[p] || `{${p}}`);
    const qs = new URLSearchParams();
    for (const q of ep.query) { if (queryValues[q]) qs.set(q, queryValues[q]); }
    return qs.toString() ? `${path}?${qs}` : path;
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse('');
    setStatus(null);
    const url = buildUrl();
    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    try {
      const res = await fetch(url, { headers });
      setStatus(res.status);
      const body = await res.json();
      setResponse(JSON.stringify(body, null, 2));
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyCurl = () => {
    const authHeader = apiKey ? ` \\\n  -H "Authorization: Bearer ${apiKey}"` : '';
    navigator.clipboard.writeText(`curl "http://localhost:3000${buildUrl()}"${authHeader}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FlaskConical size={24} className="text-kulima-500" />
          API Explorer
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Test endpoints interactively</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Config */}
        <div className="lg:col-span-2 space-y-4">
          {/* Endpoint Selector */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">Endpoint</label>
            <select
              value={selected}
              onChange={(e) => { setSelected(Number(e.target.value)); setParamValues({}); setQueryValues({}); setResponse(''); setStatus(null); }}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {ENDPOINTS.map((e, i) => (
                <option key={i} value={i}>{e.method} {e.path} — {e.desc}</option>
              ))}
            </select>
          </div>

          {/* Path Params */}
          {ep.params.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Path Parameters</label>
              <div className="space-y-2">
                {ep.params.map(p => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 font-mono">{p}</span>
                    <input
                      value={paramValues[p] || ''}
                      onChange={(e) => setParamValues({ ...paramValues, [p]: e.target.value })}
                      placeholder={p === 'lat' ? '6.5' : p === 'lng' ? '3.4' : p === 'name' ? 'maize' : ''}
                      className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Params */}
          {ep.query.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Query Parameters</label>
              <div className="space-y-2">
                {ep.query.map(q => (
                  <div key={q} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-24 font-mono">{q}</span>
                    <input
                      value={queryValues[q] || ''}
                      onChange={(e) => setQueryValues({ ...queryValues, [q]: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Key */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">API Key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="kulima_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleSend}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-kulima-600 text-white rounded-lg text-sm font-medium hover:bg-kulima-700 disabled:opacity-50 transition-colors"
            >
              <Play size={16} />
              {loading ? 'Sending...' : 'Send'}
            </button>
            <button onClick={copyCurl} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'cURL'}
            </button>
          </div>

          {/* URL Preview */}
          <div className="bg-gray-900 dark:bg-gray-950 rounded-lg p-3 border border-gray-800">
            <code className="text-xs text-green-400 font-mono break-all">{ep.method} {buildUrl()}</code>
          </div>
        </div>

        {/* Right: Response */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Response</h3>
            {status !== null && (
              <span className={cn(
                'px-2.5 py-0.5 rounded-full text-xs font-bold',
                status >= 200 && status < 300 ? 'bg-green-100 text-green-700' :
                status >= 400 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
              )}>{status}</span>
            )}
          </div>
          <div className="p-4 max-h-[600px] overflow-auto">
            {response ? (
              <pre className="text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">{response}</pre>
            ) : (
              <p className="text-sm text-gray-400 text-center py-16">Send a request to see the response</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


export default withAuth(Page);