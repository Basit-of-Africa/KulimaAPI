import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface AnalyticsData {
  totalRequests: number;
  avgResponseTime: number;
  successRate: number;
  errorRate: number;
  topEndpoints: Array<{ path: string; count: number; avgTime: number }>;
  recentErrors: Array<{ time: string; endpoint: string; status: number; message: string }>;
  hourlyRequests: Array<{ hour: number; count: number }>;
}

const MOCK_DATA: AnalyticsData = {
  totalRequests: 12847,
  avgResponseTime: 145,
  successRate: 98.2,
  errorRate: 1.8,
  topEndpoints: [
    { path: '/v1/weather/current/:lat/:lng', count: 4521, avgTime: 120 },
    { path: '/v2/crops/compare', count: 2103, avgTime: 180 },
    { path: '/v1/farm/:lat/:lng/intelligence', count: 1876, avgTime: 250 },
    { path: '/v2/soil/:lat/:lng', count: 1234, avgTime: 350 },
    { path: '/v2/satellite/health/:lat/:lng', count: 987, avgTime: 95 },
  ],
  recentErrors: [
    { time: '2 min ago', endpoint: '/v2/crops/compare', status: 500, message: 'Open-Meteo DNS failure' },
    { time: '15 min ago', endpoint: '/v1/farm/6.5/3.4/intelligence', status: 500, message: 'Database timeout' },
    { time: '1 hr ago', endpoint: '/v2/farms/dashboard', status: 401, message: 'Invalid API key' },
  ],
  hourlyRequests: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: Math.floor(Math.random() * 800 + 100),
  })),
};

export default function Analytics() {
  const [data] = useState<AnalyticsData>(MOCK_DATA);
  const maxHourly = Math.max(...data.hourlyRequests.map((h) => h.count));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">API Analytics</h2>
        <p className="text-gray-500 mt-1">Request volume, performance, and error tracking</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={BarChart3}
          label="Total Requests"
          value={data.totalRequests.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value={`${data.avgResponseTime}ms`}
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Success Rate"
          value={`${data.successRate}%`}
          color="green"
        />
        <StatCard
          icon={AlertTriangle}
          label="Error Rate"
          value={`${data.errorRate}%`}
          color={data.errorRate > 5 ? 'red' : 'yellow'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Traffic Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Requests (24h)</h3>
          <div className="flex items-end gap-1 h-40">
            {data.hourlyRequests.map((h) => (
              <div key={h.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-kulima-500 rounded-t transition-all hover:bg-kulima-600"
                  style={{ height: `${(h.count / maxHourly) * 100}%`, minHeight: '2px' }}
                  title={`${h.hour}:00 — ${h.count} requests`}
                />
                {h.hour % 6 === 0 && (
                  <span className="text-[9px] text-gray-400 mt-1">{h.hour}h</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top Endpoints */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Endpoints</h3>
          <div className="space-y-3">
            {data.topEndpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <code className="text-xs text-gray-700 block truncate">{ep.path}</code>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-kulima-500 rounded-full"
                        style={{ width: `${(ep.count / data.topEndpoints[0].count) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                      {ep.count.toLocaleString()} · {ep.avgTime}ms
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Errors</h3>
          <div className="space-y-2">
            {data.recentErrors.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No recent errors 🎉</p>
            ) : (
              data.recentErrors.map((err, i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  {err.status >= 500 ? (
                    <XCircle size={14} className="text-red-500 flex-shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <code className="text-xs text-gray-700">{err.endpoint}</code>
                    <p className="text-[10px] text-gray-500">{err.message}</p>
                  </div>
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                    err.status >= 500 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {err.status}
                  </span>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap">{err.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${colorMap[color]}`}>
        <Icon size={16} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
