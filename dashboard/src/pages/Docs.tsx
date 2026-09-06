import { ExternalLink } from 'lucide-react';

export default function Docs() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">API Documentation</h2>
        <p className="text-gray-500 mt-1">Interactive Swagger UI and reference docs</p>
      </div>

      {/* Swagger Embed */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Swagger UI</h3>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-kulima-600 hover:underline"
          >
            Open in new tab <ExternalLink size={12} />
          </a>
        </div>
        <iframe
          src="/docs"
          className="w-full border-0"
          style={{ height: 'calc(100vh - 200px)' }}
          title="Swagger UI"
        />
      </div>
    </div>
  );
}
