import { withAuth } from '@/components/withAuth';
'use client';

import { useState } from 'react';
import { Key, Plus, Copy, Check, AlertTriangle, Shield } from 'lucide-react';
import { api } from '@/lib/api';

function Page() {
  const [keys, setKeys] = useState<any[]>([]);
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!orgId || !name) { setError('Organisation ID and name are required.'); return; }
    setLoading(true);
    setError(null);
    try {
      const newKey = await api<any>('/v1/auth/keys', {
        method: 'POST',
        body: JSON.stringify({ orgId, name }),
      });
      setKeys(prev => [newKey, ...prev]);
      setShowKey(newKey.key || null);
      setName('');
    } catch (err: any) {
      setError(err.message);
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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Key size={24} className="text-kulima-500" /> API Keys
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage authentication keys for the KulimaAPI</p>
      </div>

      {/* Create Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Plus size={16} /> Create New Key
        </h2>
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-sm text-red-700 dark:text-red-400">{error}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Organisation ID</label>
            <input value={orgId} onChange={(e) => setOrgId(e.target.value)} placeholder="uuid-of-org"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Key Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Application"
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
          </div>
          <div className="flex items-end">
            <button onClick={handleCreate} disabled={loading || !orgId || !name}
              className="flex items-center gap-2 px-5 py-2 bg-kulima-600 text-white rounded-lg text-sm font-medium hover:bg-kulima-700 disabled:opacity-50 transition-colors">
              <Plus size={16} /> {loading ? 'Creating...' : 'Create Key'}
            </button>
          </div>
        </div>
      </div>

      {/* Warning */}
      {showKey && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Save this key — it won&apos;t be shown again!</p>
          </div>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
            <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white break-all">{showKey}</code>
            <button onClick={() => copyKey(showKey)} className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg text-xs font-medium text-amber-800 transition-colors">
              {copied === showKey ? <Check size={14} /> : <Copy size={14} />}
              {copied === showKey ? 'Copied!' : 'Copy'}
            </button>
            <button onClick={() => setShowKey(null)} className="text-xs text-gray-400 hover:text-gray-600">Dismiss</button>
          </div>
        </div>
      )}

      {/* Keys List */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield size={16} /> Active Keys
          </h2>
        </div>
        {keys.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Key size={32} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No API keys yet. Create one above to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {keys.map((key, i) => (
              <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{key.keyPrefix}••••••••</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{key.rateLimit?.toLocaleString()} req/min</span>
                  <span>{key.monthlyQuota?.toLocaleString()}/mo</span>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 rounded-full font-medium">Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


export default withAuth(Page);