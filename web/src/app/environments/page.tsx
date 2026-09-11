'use client';

import { withAuth } from '@/components/withAuth';
import { useState, useEffect } from 'react';
import { Factory, Plus, Thermometer, Droplets, Wind, Zap, TrendingUp, Activity, X, ChevronRight } from 'lucide-react';
import {
  getEnvironments, getEnvironment, createEnvironment, deleteEnvironment,
  submitReadings, getCEAIntelligence, getControlSetpoints, getEnergyBudget, getYieldForecast,
} from '@/lib/api';
import { cn } from '@/lib/utils';

const ENV_TYPES = [
  { value: 'greenhouse', label: 'Greenhouse', desc: 'Enclosed structure with climate control' },
  { value: 'shade_house', label: 'Shade House', desc: 'Shade net structure, limited control' },
  { value: 'hydroponic', label: 'Hydroponic', desc: 'Soilless growing system' },
  { value: 'vertical_farm', label: 'Vertical Farm', desc: 'Multi-tier indoor growing' },
  { value: 'screen_house', label: 'Screen House', desc: 'Mesh-enclosed, insect protection' },
  { value: 'aeroponic', label: 'Aeroponic', desc: 'Root zone in mist/air' },
];

const QUICK_CROPS = ['tomato', 'pepper', 'cucumber', 'lettuce', 'strawberry', 'basil'];

function Page() {
  const [environments, setEnvironments] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    name: '', type: 'greenhouse', latitude: '7.38', longitude: '3.94',
    areaM2: '200', cropName: 'tomato',
    ventilationType: 'natural', coolingType: 'none', heatingType: 'none',
    hasCO2Injection: false, hasDehumidifier: false, hasSupplementalLighting: false,
    irrigationType: 'drip', hasRecirculation: false, hasGenerator: false,
    hasSolarPanels: false, gridConnected: true,
  });

  useEffect(() => {
    loadEnvironments();
  }, []);

  useEffect(() => {
    if (selected) {
      getEnvironment(selected).then(setDetail).catch(() => setDetail(null));
      getCEAIntelligence(selected).then(setIntelligence).catch(() => setIntelligence(null));
    }
  }, [selected]);

  async function loadEnvironments() {
    try {
      const r = await getEnvironments();
      setEnvironments(r.environments || []);
    } catch { setEnvironments([]); }
    setLoading(false);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const body = {
        name: form.name,
        type: form.type,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        infrastructure: {
          coverType: 'plastic_film', areaM2: parseInt(form.areaM2) || 200, heightM: 3,
          ventilationType: form.ventilationType, coolingType: form.coolingType,
          heatingType: form.heatingType, hasCO2Injection: form.hasCO2Injection,
          hasDehumidifier: form.hasDehumidifier, hasSupplementalLighting: form.hasSupplementalLighting,
          lightSource: form.hasSupplementalLighting ? 'LED' : 'none', lightCapacityLux: form.hasSupplementalLighting ? 30000 : 0,
          irrigationType: form.irrigationType, hasRecirculation: form.hasRecirculation,
          hasGenerator: form.hasGenerator, hasSolarPanels: form.hasSolarPanels, gridConnected: form.gridConnected,
        },
        sensors: {
          hasTemperature: true, hasHumidity: true, hasCO2: false,
          hasLightIntensity: form.hasSupplementalLighting, hasSoilMoisture: true,
          hasSoilTemperature: false, hasEC: false, hasPH: false, hasWaterTemperature: false, hasWindSpeed: false,
        },
        crops: [{
          cropName: form.cropName, plantingDate: new Date().toISOString().split('T')[0],
          areaM2: parseInt(form.areaM2) || 200, density: 4, growthStage: 'vegetative',
        }],
      };
      const r = await createEnvironment(body);
      setShowCreate(false);
      loadEnvironments();
      setSelected(r.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create environment');
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this environment?')) return;
    try {
      await deleteEnvironment(id);
      if (selected === id) { setSelected(null); setDetail(null); setIntelligence(null); }
      loadEnvironments();
    } catch { }
  }

  const rec = intelligence?.controlRecommendations || [];
  const alerts = intelligence?.alerts || [];
  const energy = intelligence?.energyBudget;
  const yieldF = intelligence?.yieldForecast;
  const risk = intelligence?.riskScore;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Factory size={24} className="text-emerald-500" />
            CEA Environments
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Greenhouse, hydroponic, and controlled environment management
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-sm"
        >
          <Plus size={16} /> New Environment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Environment List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading environments...</div>
          ) : environments.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <Factory size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No environments yet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Register a greenhouse, hydroponic system, or vertical farm to get started.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Create First Environment
              </button>
            </div>
          ) : (
            environments.map((env: any) => (
              <button
                key={env.id}
                onClick={() => setSelected(env.id)}
                className={cn(
                  'w-full text-left p-4 rounded-2xl border transition-all',
                  selected === env.id
                    ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-300 dark:border-emerald-700 shadow-sm'
                    : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800'
                )}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{env.name}</span>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium rounded-full">
                        {env.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {env.areaM2 ? `${env.areaM2}m²` : '—'} • Status: {env.status}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Right: Detail + Intelligence */}
        <div className="lg:col-span-2 space-y-6">
          {!selected ? (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Thermometer size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Select an environment</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose an environment from the list to view control recommendations,
                energy budget, and yield forecast.
              </p>
            </div>
          ) : (
            <>
              {/* Risk Score Banner */}
              {risk && (
                <div className={cn(
                  'rounded-2xl p-5 border',
                  risk.severity === 'critical' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                  risk.severity === 'high' ? 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800' :
                  risk.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800' :
                  'bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800'
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Risk Score: {risk.overall}/100 ({risk.severity})
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{risk.summary}</p>
                    </div>
                    {energy && (
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">₦{energy.costNGN?.toLocaleString()}/day</p>
                        <p className="text-xs text-gray-500">{energy.currentDailyKWh} kWh</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Alerts */}
              {alerts.length > 0 && (
                <div className="space-y-2">
                  {alerts.map((a: any, i: number) => (
                    <div key={i} className={cn(
                      'p-3 rounded-xl border text-sm flex items-start gap-3',
                      a.severity === 'critical' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' :
                      'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
                    )}>
                      <Activity size={16} className="text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{a.type?.replace(/_/g, ' ')}</p>
                        <p className="text-gray-600 dark:text-gray-400">{a.message}</p>
                        <p className="text-emerald-600 dark:text-emerald-400 mt-1">{a.recommendedAction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Control Recommendations */}
              {rec.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Wind size={16} className="text-blue-500" />
                    Control Recommendations ({rec.length})
                  </h3>
                  <div className="space-y-3">
                    {rec.map((r: any, i: number) => (
                      <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            'px-2 py-0.5 text-[10px] font-medium rounded-full',
                            r.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                            r.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          )}>{r.priority}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{r.controlType}</span>
                          {r.energyCostNGN > 0 && (
                            <span className="text-xs text-gray-500">~₦{r.energyCostNGN}/day</span>
                          )}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{r.reason}</p>
                        <p className="text-emerald-600 dark:text-emerald-400 mt-1 text-xs">{r.expectedImpact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Thermometer size={16} className="text-red-500" />}
                  label="Indoor Temp" value={detail?.sensors?.hasTemperature ? `${intelligence?.indoorConditions?.temperatureC ?? '—'}°C` : 'No sensor'} />
                <StatCard icon={<Droplets size={16} className="text-blue-500" />}
                  label="Humidity" value={detail?.sensors?.hasHumidity ? `${intelligence?.indoorConditions?.humidityPercent ?? '—'}%` : 'No sensor'} />
                <StatCard icon={<Zap size={16} className="text-yellow-500" />}
                  label="Energy/Day" value={energy ? `₦${energy.costNGN?.toLocaleString()}` : '—'} />
                <StatCard icon={<TrendingUp size={16} className="text-emerald-500" />}
                  label="Yield Forecast" value={yieldF ? `${yieldF.expectedYieldKgM2} kg/m²` : '—'} />
              </div>

              {/* Yield Forecast */}
              {yieldF && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-500" />
                    Yield Forecast — {yieldF.crop}
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div><p className="text-gray-500">Stage</p><p className="font-medium text-gray-900 dark:text-white">{yieldF.growthStage}</p></div>
                    <div><p className="text-gray-500">Progress</p><p className="font-medium text-gray-900 dark:text-white">{yieldF.progressPercent}%</p></div>
                    <div><p className="text-gray-500">Days to Harvest</p><p className="font-medium text-gray-900 dark:text-white">{yieldF.daysToHarvest}</p></div>
                    <div><p className="text-gray-500">Trajectory</p>
                      <p className={cn('font-medium', yieldF.trajectory === 'on_track' ? 'text-emerald-600' : yieldF.trajectory === 'behind' ? 'text-orange-600' : 'text-blue-600')}>
                        {yieldF.trajectory?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Delete */}
              <button
                onClick={() => handleDelete(selected)}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Delete this environment
              </button>
            </>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">New Environment</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Name" value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Greenhouse Alpha" />

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {ENV_TYPES.map(t => (
                    <button key={t.value} onClick={() => setForm({ ...form, type: t.value })}
                      className={cn('p-2 rounded-lg border text-left text-xs transition-all',
                        form.type === t.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      )}>
                      <p className="font-medium text-gray-900 dark:text-white">{t.label}</p>
                      <p className="text-gray-500 dark:text-gray-400">{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude" value={form.latitude} onChange={v => setForm({ ...form, latitude: v })} />
                <Field label="Longitude" value={form.longitude} onChange={v => setForm({ ...form, longitude: v })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Area (m²)" value={form.areaM2} onChange={v => setForm({ ...form, areaM2: v })} />
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Crop</label>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_CROPS.map(c => (
                      <button key={c} onClick={() => setForm({ ...form, cropName: c })}
                        className={cn('px-2.5 py-1 rounded-lg text-xs font-medium border transition-all',
                          form.cropName === c ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300'
                        )}>{c}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equipment toggles */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Equipment & Features</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'hasCO2Injection', label: 'CO₂ Injection' },
                    { key: 'hasDehumidifier', label: 'Dehumidifier' },
                    { key: 'hasSupplementalLighting', label: 'Supplemental Lighting' },
                    { key: 'hasRecirculation', label: 'Water Recirculation' },
                    { key: 'hasGenerator', label: 'Generator' },
                    { key: 'hasSolarPanels', label: 'Solar Panels' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer text-xs">
                      <input type="checkbox" checked={(form as any)[key]}
                        onChange={e => setForm({ ...form, [key]: e.target.checked })}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                      <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!form.name || creating}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {creating ? 'Creating...' : 'Create Environment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

export default withAuth(Page);
