import { useState } from 'react';
import { Plus, Copy, Check, Eye, EyeOff } from 'lucide-react';
import { createApiKey, type ApiKey } from '../lib/api';

export default function ApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!orgId || !name) {
      setError('Organisation ID and name are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const newKey = await createApiKey(orgId, name);
      setKeys((prev) => [newKey, ...prev]);
      setShowKey(newKey.key || null);
      setName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create API key.');
    } finally {
      setLoading(false);
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">API Keys</h2>
        <p className="text-gray-500 mt-1">Manage API keys for authentication</p>
      </div>

      {/* Create Key Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Key</h3>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organisation ID
            </label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="uuid-of-organisation"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My App"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-kulima-500 focus:border-kulima-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleCreate}
              disabled={loading || !orgId || !name}
              className="flex items-center gap-2 px-4 py-2 bg-kulima-600 text-white rounded-lg text-sm font-medium hover:bg-kulima-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus size={16} />
              {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Newly Created Key Warning */}
      {showKey && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ Save this key — it won't be shown again!
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-yellow-200">
            <code className="flex-1 text-sm font-mono text-gray-900 break-all">{showKey}</code>
            <button
              onClick={() => copyKey(showKey)}
              className="flex items-center gap-1 px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-xs font-medium text-yellow-800 transition-colors"
            >
              {copied === showKey ? <Check size={14} /> : <Copy size={14} />}
              {copied === showKey ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setShowKey(null)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Active Keys</h3>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">
            No API keys yet. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {keys.map((key) => (
              <div key={key.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{key.name}</p>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{key.keyPrefix}...</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{key.rateLimit.toLocaleString()} req/min</span>
                  <span>{key.monthlyQuota.toLocaleString()}/mo</span>
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
