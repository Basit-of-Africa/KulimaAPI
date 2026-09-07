'use client';

import { useState, useEffect } from 'react';
import { Wheat, Calendar, TrendingUp, Sprout, Search, ChevronDown } from 'lucide-react';
import { getCrops, getCrop, getCropPlantingWindow, getCropGrowthStage } from '@/lib/api';
import { cn, getRiskColor } from '@/lib/utils';

export default function CropsPage() {
  const [crops, setCrops] = useState<any[]>([]);
  const [selectedCrop, setSelectedCrop] = useState<string>('maize');
  const [cropDetail, setCropDetail] = useState<any>(null);
  const [plantingWindow, setPlantingWindow] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCrops().then(r => { setCrops(r.crops); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedCrop) {
      Promise.all([getCrop(selectedCrop), getCropPlantingWindow(selectedCrop)])
        .then(([detail, pw]) => { setCropDetail(detail); setPlantingWindow(pw); });
    }
  }, [selectedCrop]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wheat size={24} className="text-kulima-500" />
          Crop Intelligence
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Growth stages, planting windows, and crop comparison</p>
      </div>

      {/* Crop Selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {crops.map((c: any) => (
          <button
            key={c.name}
            onClick={() => setSelectedCrop(c.name)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-all',
              selectedCrop === c.name
                ? 'bg-kulima-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-kulima-300'
            )}
          >
            {c.displayName}
          </button>
        ))}
      </div>

      {cropDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Crop Profile */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Sprout size={18} className="text-kulima-500" />
              {cropDetail.displayName}
            </h2>
            <div className="space-y-3">
              <InfoRow label="Total Days" value={`${cropDetail.totalDays} days`} />
              <InfoRow label="Total GDD" value={`${cropDetail.totalGdd}°C·days`} />
              <InfoRow label="Base Temperature" value={`${cropDetail.baseTemperature}°C`} />
              <InfoRow label="Min Rainfall Season" value={`${cropDetail.minRainfallSeason} days`} />
              <InfoRow label="Optimal Months" value={cropDetail.optimalPlantingMonths?.map((m: number) =>
                ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]
              ).join(', ') || '—'} />
              <InfoRow label="Growth Stages" value={`${cropDetail.stages?.length || 0} stages`} />
            </div>
          </div>

          {/* Growth Stages */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-500" />
              Growth Stages
            </h2>
            <div className="space-y-3">
              {cropDetail.stages?.map((stage: any, i: number) => (
                <div key={stage.name} className={cn(
                  'p-3 rounded-lg border',
                  stage.isCritical ? 'border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800'
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {i + 1}. {stage.displayName}
                    </span>
                    {stage.isCritical && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">CRITICAL</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Days {stage.minDays}–{stage.maxDays} · GDD {stage.gddRange?.min}–{stage.gddRange?.max}
                  </p>
                  {stage.risks?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {stage.risks.map((r: any, j: number) => (
                        <span key={j} className={cn('text-[10px] px-1.5 py-0.5 rounded border', getRiskColor(r.severity))}>
                          {r.type}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Planting Window */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar size={18} className="text-purple-500" />
              Planting Window
            </h2>
            {plantingWindow && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{plantingWindow.recommendation}</p>

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Next optimal month</p>
                  {plantingWindow.nextOptimalMonth && (
                    <div className="bg-kulima-50 dark:bg-kulima-950 rounded-lg p-3">
                      <p className="text-sm font-bold text-kulima-700 dark:text-kulima-400">
                        {plantingWindow.nextOptimalMonth.name}
                      </p>
                      <p className="text-xs text-kulima-600">{plantingWindow.nextOptimalMonth.monthsFromNow} months from now</p>
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-gray-500 mb-2">12-Month Outlook</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {plantingWindow.twelveMonthOutlook?.map((m: any) => (
                    <div key={m.month} className={cn(
                      'text-center p-2 rounded-lg text-xs',
                      m.suitability === 'optimal' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 font-bold' :
                      m.suitability === 'acceptable' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                    )}>
                      <div className="font-semibold">{m.name.slice(0, 3)}</div>
                      <div className="text-[9px] mt-0.5 capitalize">{m.suitability}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white">{value}</span>
    </div>
  );
}
