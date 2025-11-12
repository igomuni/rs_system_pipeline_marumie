'use client';

import { useMemo, useState, useEffect } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import { formatBudget } from '@/client/lib/formatBudget';
import { useSankeyConfig } from '@/client/hooks/useSankeyConfig';

interface Props {
  data: SankeyData;
  year: Year;
}

export default function SankeyChartNivo({ data, year }: Props) {
  const { config, isLoaded } = useSankeyConfig();
  const [nivoData, setNivoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Nivo形式のJSONを直接読み込む（トポロジーベース版）
  useEffect(() => {
    async function loadNivoData() {
      try {
        const response = await fetch(`/data/year_${year}/sankey-main-topology-nivo.json`);
        const jsonData = await response.json();
        setNivoData(jsonData);
      } catch (error) {
        console.error('Failed to load Nivo data:', error);
        // フォールバック: クライアント側で変換
        const nodes = data.nodes.map((node) => ({
          id: node.id,
          nodeColor: getNodeColor(node, config),
        }));
        const links = data.links.map((link) => ({
          source: typeof link.source === 'string' ? link.source : (link.source as any).id,
          target: typeof link.target === 'string' ? link.target : (link.target as any).id,
          value: link.value,
        }));
        setNivoData({ nodes, links });
      } finally {
        setLoading(false);
      }
    }

    loadNivoData();
  }, [year, data, config]);

  if (!isLoaded || loading || !nivoData) {
    return <div className="flex items-center justify-center h-[600px]">読み込み中...</div>;
  }

  return (
    <div className="h-[600px] w-full">
      <ResponsiveSankey
        data={nivoData}
        margin={{ top: 40, right: 160, bottom: 40, left: 160 }}
        align="center"
        colors={{ scheme: 'category10' }}
        nodeOpacity={1}
        nodeHoverOthersOpacity={0.35}
        nodeThickness={18}
        nodeSpacing={24}
        nodeBorderWidth={0}
        nodeBorderColor={{
          from: 'color',
          modifiers: [['darker', 0.8]],
        }}
        nodeBorderRadius={3}
        linkOpacity={0.5}
        linkHoverOthersOpacity={0.1}
        linkContract={3}
        enableLinkGradient={true}
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 1]],
        }}
        // カスタムラベル
        label={(node) => {
          const originalNode = data.nodes.find((n) => n.id === node.id);
          if (!originalNode) return node.id;

          // ノードタイプに応じたラベル
          if (originalNode.type === 'total') {
            const value = originalNode.metadata?.budget || originalNode.metadata?.execution || 0;
            return `${originalNode.name}\n${formatBudget(value)}`;
          }

          if (originalNode.type === 'difference') {
            const diff = originalNode.metadata?.differenceData?.difference || 0;
            return `${originalNode.name}\n${formatBudget(diff)}`;
          }

          if (originalNode.type === 'ministry') {
            const budget = originalNode.metadata?.budget || 0;
            const execution = originalNode.metadata?.execution || 0;
            const value = budget || execution;
            return `${originalNode.name}\n${formatBudget(value)}`;
          }

          return originalNode.name;
        }}
        // ツールチップ
        nodeTooltip={({ node }: any) => {
          const originalNode = data.nodes.find((n) => n.id === node.id);
          if (!originalNode) return null;

          return (
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="font-bold mb-1">{originalNode.name}</div>
              {originalNode.metadata?.budget && (
                <div>予算: {formatBudget(originalNode.metadata.budget)}</div>
              )}
              {originalNode.metadata?.execution && (
                <div>支出: {formatBudget(originalNode.metadata.execution)}</div>
              )}
              {originalNode.metadata?.differenceData && (
                <div className="mt-2">
                  <div>予算総計: {formatBudget(originalNode.metadata.differenceData.budgetTotal)}</div>
                  <div>支出総計: {formatBudget(originalNode.metadata.differenceData.executionTotal)}</div>
                  <div className="font-bold mt-1">
                    差額: {formatBudget(originalNode.metadata.differenceData.difference)}
                  </div>
                </div>
              )}
            </div>
          );
        }}
        linkTooltip={({ link }: any) => {
          const sourceNode = data.nodes.find((n) => n.id === link.source.id);
          const targetNode = data.nodes.find((n) => n.id === link.target.id);

          return (
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="font-bold mb-1">
                {sourceNode?.name} → {targetNode?.name}
              </div>
              <div>{formatBudget(link.value)}</div>
            </div>
          );
        }}
      />
    </div>
  );
}

// ノードの色を取得
function getNodeColor(node: any, config: any): string {
  if (node.type === 'ministry' && node.metadata?.ministry) {
    return config.ministryColorMapping[node.metadata.ministry] || '#3b82f6';
  }

  if (node.type === 'total') {
    return '#10b981';
  }

  if (node.type === 'difference') {
    return config.differenceColor || '#9ca3af';
  }

  if (node.type === 'others') {
    return config.othersColor || '#6b7280';
  }

  return '#6b7280';
}
