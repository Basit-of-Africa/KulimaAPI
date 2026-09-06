import { useState } from 'react';
import { Play, Copy, Check, ChevronDown } from 'lucide-react';

const ENDPOINTS = [
  { method: 'GET', path: '/v1/farm/{lat}/{lng}/intelligence', params: ['lat', 'lng'], query: ['crop', 'forecast_days'] },
  { method: 'GET', path: '/v1/weather/current/{lat}/{lng}', params: ['lat', 'lng'], query: [] },
  { method: 'GET', path: '/v1/weather/forecast/{lat}/{lng}', params: ['lat', 'lng'], query: ['days'] },
  { method: 'GET', path: '/v1/weather/historical/{lat}/{lng}', params: ['lat', 'lng'], query: ['start_date', 'end_date'] },
  { method: 'GET', path: '/v1/location/resolve', params: [], query: ['q'] },
  { method: 'GET', path: '/v1/farms', params: [], query: ['limit', 'offset'] },
  { method: 'GET', path: '/v1/farms/{farmId}', params: ['farmId'], query: [] },
  { method: 'GET', path: '/v1/farms/{farmId}/intelligence', params: ['farmId'], query: [] },
  { method: 'GET', path: '/v1/farm/{lat}/{lng}/season', params: ['lat', 'lng'], query: ['crop'] },
  { method: 'GET', path: '/v1/farm/{lat}/{lng}/alerts', params: ['lat', 'lng'], query: ['crop'] },
  { method: 'GET', path: '/health', params: [], query: [] },
  { method: 'GET', path: '/health/providers', params: [], query: [] },
];

export default function Explorer() {
  const [selected, setSelected] = useState(0);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [response, setResponse] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const endpoint = ENDPOINTS[selected];

  const buildUrl = () => {
    let path = endpoint.path;
    for (const p of endpoint.params) {
      path = path.replace(`{${p}}`, paramValues[p] || `{${p}}`);
    }
    const qs = new URLSearchParams();
    for (const q of endpoint.query) {
      if (queryValues[q]) qs.set(q, queryValues[q]);
    }
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
    const url = `http://localhost:3000${buildUrl()}`;
    const authHeader = apiKey ? ` \\\n  -H "Authorization: Bearer ${apiKey}"` : '';
    const curl = `curl "${url}"${authHeader}`;
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">API Explorer</h2>
        <p className="text-gray-500 mt-1">Test API endpoints interactively</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Request Builder */}
        <div className="space-y-4">
          {/* Endpoint Selector */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint</label>
            <select
              value={selected}
              onChange={(e) => {
                setSelected(Number(e.target.value));
                setParamValues({});
                setQueryValues({});
                setResponse('');
                setStatus(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
            >
              {ENDPOINTS.map((ep, i) => (
                <option key={i} value={i}>
                  {ep.method} {ep.path}
                </option>
              ))}
            </select>
          </div>

          {/* Path Parameters */}
          {endpoint.params.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Path Parameters</label>
              <div className="space-y-2">
                {endpoint.params.map((p) => (
                  <div key={p} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 font-mono">{p}</span>
                    <input
                      type="text"
                      value={paramValues[p] || ''}
                      onChange={(e) => setParamValues({ ...paramValues, [p]: e.target.value })}
                      placeholder={p === 'lat' ? '6.5' : p === 'lng' ? '3.4' : ''}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters */}
          {endpoint.query.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Query Parameters</label>
              <div className="space-y-2">
                {endpoint.query.map((q) => (
                  <div key={q} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20 font-mono">{q}</span>
                    <input
                      type="text"
                      value={queryValues[q] || ''}
                      onChange={(e) => setQueryValues({ ...queryValues, [q]: e.target.value })}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Key */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">API Key (optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="kulima_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
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
              {loading ? 'Sending...' : 'Send Request'}
            </button>
            <button
              onClick={copyCurl}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy cURL'}
            </button>
          </div>

          {/* Preview URL */}
          <div className="bg-gray-900 rounded-lg p-3">
            <code className="text-xs text-green-400 font-mono break-all">
              {endpoint.method} {buildUrl()}
            </code>
          </div>
        </div>

        {/* Right: Response */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Response</h3>
            {status !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  status >= 200 && status < 300
                    ? 'bg-green-100 text-green-700'
                    : status >= 400
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {status}
              </span>
            )}
          </div>
          <div className="p-4 max-h-[600px] overflow-auto">
            {response ? (
              <pre className="text-xs font-mono text-gray-800 whitespace-pre-wrap break-words">
                {response}
              </pre>
            ) : (
              <p className="text-sm text-gray-400 text-center py-12">
                Send a request to see the response
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
