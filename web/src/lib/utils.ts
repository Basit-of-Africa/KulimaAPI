import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat().format(n);
}

export function getRiskColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'text-green-600 bg-green-50 border-green-200',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    critical: 'text-red-600 bg-red-50 border-red-200',
  };
  return colors[severity] || 'text-gray-600 bg-gray-50 border-gray-200';
}

export function getSuitabilityColor(suitability: string): string {
  const colors: Record<string, string> = {
    highly_suitable: 'text-green-700 bg-green-100',
    suitable: 'text-green-600 bg-green-50',
    moderately_suitable: 'text-yellow-600 bg-yellow-50',
    marginally_suitable: 'text-orange-600 bg-orange-50',
    unsuitable: 'text-red-600 bg-red-50',
  };
  return colors[suitability] || 'text-gray-600 bg-gray-50';
}

export function getNdviColor(ndvi: number): string {
  if (ndvi > 0.6) return 'text-green-600';
  if (ndvi > 0.3) return 'text-yellow-600';
  if (ndvi > 0.1) return 'text-orange-600';
  return 'text-red-600';
}
