'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import SankeyChartWithSettings from './SankeyChartWithSettings';
import SankeyChartNivo from './SankeyChartNivo';

interface Props {
  year: Year;
  displaySankeyData: SankeyData;
  statistics: {
    totalBudget: number;
    totalExecution: number;
    averageExecutionRate: number;
    eventCount: number;
  };
  ministry?: string;
}

export default function YearPageClient({ year, displaySankeyData, statistics, ministry }: Props) {
  const [chartType, setChartType] = useState<'d3' | 'nivo'>('d3');

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Chart Type Switcher */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          チャートライブラリ:
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setChartType('d3')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              chartType === 'd3'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            D3.js（既存）
          </button>
          <button
            onClick={() => setChartType('nivo')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              chartType === 'nivo'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            Nivo（実験的）
          </button>
        </div>
      </div>

      {/* Chart Display */}
      {chartType === 'd3' ? (
        <SankeyChartWithSettings
          data={displaySankeyData}
          year={year}
          breadcrumbsSlot={
            <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
                ホーム
              </Link>
              <span>/</span>
              <Link href={`/${year}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {year}年度
              </Link>
              {ministry && (
                <>
                  <span>/</span>
                  <span className="text-gray-900 dark:text-white">{ministry}</span>
                </>
              )}
            </nav>
          }
        />
      ) : (
        <>
          {/* Breadcrumbs for Nivo */}
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              ホーム
            </Link>
            <span>/</span>
            <Link href={`/${year}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              {year}年度
            </Link>
            {ministry && (
              <>
                <span>/</span>
                <span className="text-gray-900 dark:text-white">{ministry}</span>
              </>
            )}
          </nav>
          <SankeyChartNivo data={displaySankeyData} year={year} />
        </>
      )}
    </div>
  );
}
