'use client';

import Link from 'next/link';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import SankeyChartNivoWithSettings from './SankeyChartNivoWithSettings';

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
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Chart Type Switcher - HIDDEN (Nivo only) */}
      {/* Chart Display */}
      <SankeyChartNivoWithSettings
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
    </div>
  );
}
