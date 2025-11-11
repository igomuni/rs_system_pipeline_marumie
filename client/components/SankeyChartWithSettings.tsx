'use client';

import { useState, type ReactNode } from 'react';
import SankeyChart from './SankeyChart';
import SankeyConfigPanel from './SankeyConfigPanel';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';

interface Props {
  data: SankeyData;
  year: Year;
  hideSettingsButton?: boolean; // 設定ボタンを外部で表示する場合はtrue
  breadcrumbsSlot?: ReactNode; // パンくずリストスロット（設定ボタンと同じ高さに配置）
}

export default function SankeyChartWithSettings({
  data,
  year,
  hideSettingsButton = false,
  breadcrumbsSlot
}: Props) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleConfigSaved = () => {
    // 設定保存後、SankeyChartを強制的に再レンダリング
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <>
      {!hideSettingsButton && (
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex-1">{breadcrumbsSlot}</div>
          <button
            onClick={() => setIsConfigOpen(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="hidden sm:inline">設定</span>
          </button>
        </div>
      )}

      <SankeyChart key={refreshKey} data={data} year={year} />

      <SankeyConfigPanel
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onSaved={handleConfigSaved}
      />
    </>
  );
}

// 設定ボタンコンポーネントを外部で使用できるようにエクスポート
export function SettingsButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
    >
      <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
      <span className="hidden sm:inline">設定</span>
    </button>
  );
}
