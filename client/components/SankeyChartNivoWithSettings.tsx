'use client';

import { useState } from 'react';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import SankeyChartNivo from './SankeyChartNivo';
import SankeyConfigPanel from './SankeyConfigPanel';

interface Props {
  data: SankeyData;
  year: Year;
  breadcrumbsSlot?: React.ReactNode;
}

export default function SankeyChartNivoWithSettings({ data, year, breadcrumbsSlot }: Props) {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);

  return (
    <div className="space-y-4">
      {/* Header with breadcrumbs and settings button */}
      <div className="flex items-center justify-between">
        {breadcrumbsSlot}
        <button
          onClick={() => setIsConfigPanelOpen(!isConfigPanelOpen)}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
        >
          {isConfigPanelOpen ? '設定を閉じる' : '色設定'}
        </button>
      </div>

      {/* Config Panel - Nivo版は色設定のみ（事業・府省庁表示設定は非表示） */}
      <SankeyConfigPanel
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
        onSaved={() => {
          // 設定保存後、チャートを再描画するために何もしない（自動的に反映される）
        }}
        showProjectSettings={false}
        showMinistryThreshold={false}
      />

      {/* Sankey Chart */}
      <SankeyChartNivo data={data} year={year} />
    </div>
  );
}
