'use client';

import { useState, useEffect, useMemo } from 'react';
import { ResponsiveSankey } from '@nivo/sankey';
import type { SankeyData } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import { formatBudget } from '@/client/lib/formatBudget';
import { useSankeyConfig } from '@/client/hooks/useSankeyConfig';
import SankeyNodeDetailModal from './SankeyNodeDetailModal';

interface Props {
  data: SankeyData;
  year: Year;
}

export default function SankeyChartNivo({ data, year }: Props) {
  const { config, isLoaded } = useSankeyConfig();
  const [nivoData, setNivoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    nodeId: string;
    nodeName: string;
    nodeType: string;
    nodeMetadata?: any;
  }>({
    isOpen: false,
    nodeId: '',
    nodeName: '',
    nodeType: '',
    nodeMetadata: undefined,
  });

  // Nivo形式のJSONを直接読み込み、色を設定（トポロジーベース版）
  useEffect(() => {
    async function loadNivoData() {
      try {
        const response = await fetch(`/data/year_${year}/sankey-main-topology-nivo.json`);
        const jsonData = await response.json();

        // ノードに色を設定
        const nodesWithColor = jsonData.nodes.map((node: any) => ({
          ...node,
          nodeColor: getNodeColor(node, config),
        }));

        setNivoData({ ...jsonData, nodes: nodesWithColor });
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

  // 利用可能な府省庁リストを取得（年度ごとのministries.jsonから）
  const [availableMinistries, setAvailableMinistries] = useState<string[]>([]);

  useEffect(() => {
    async function loadMinistries() {
      try {
        const response = await fetch(`/data/year_${year}/ministries.json`);
        const ministries = await response.json();
        setAvailableMinistries(ministries.map((m: any) => m.name));
      } catch (error) {
        console.error('Failed to load ministries:', error);
        // フォールバック: ノードから取得
        const ministries = new Set<string>();
        data.nodes.forEach((node) => {
          if (node.type === 'ministry' && node.metadata?.ministry) {
            ministries.add(node.metadata.ministry);
          }
        });
        setAvailableMinistries(Array.from(ministries).sort());
      }
    }
    loadMinistries();
  }, [year, data]);

  // ノードクリックハンドラー
  const handleNodeClick = (node: any) => {
    const originalNode = data.nodes.find((n) => n.id === node.id);
    if (!originalNode) return;

    setModalState({
      isOpen: true,
      nodeId: originalNode.id,
      nodeName: originalNode.name,
      nodeType: originalNode.type,
      nodeMetadata: originalNode.metadata,
    });
  };

  if (!isLoaded || loading || !nivoData) {
    return <div className="flex items-center justify-center h-[600px]">読み込み中...</div>;
  }

  return (
    <>
      <div className="h-[600px] w-full">
        <ResponsiveSankey
          data={nivoData}
          margin={{ top: 40, right: 160, bottom: 40, left: 160 }}
          align="center"
          colors={(node: any) => node.nodeColor}
          onClick={(node: any) => handleNodeClick(node)}
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
        // カスタムラベル（nivoDataから取得）
        label={(node) => {
          const originalNode = nivoData.nodes.find((n: any) => n.id === node.id);
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
            // 支出ノード（ministry_execution_*）の場合は支出金額を優先
            const value = originalNode.id.includes('execution') ? execution : budget;
            return `${originalNode.name}\n${formatBudget(value)}`;
          }

          return originalNode.name;
        }}
        // ツールチップ（nivoDataから取得）
        nodeTooltip={({ node }: any) => {
          const originalNode = nivoData.nodes.find((n: any) => n.id === node.id);
          if (!originalNode) return null;

          return (
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700 min-w-[250px]">
              <div className="font-bold mb-1 whitespace-nowrap">{originalNode.name}</div>
              {originalNode.metadata?.budget && (
                <div className="whitespace-nowrap">予算: {formatBudget(originalNode.metadata.budget)}</div>
              )}
              {originalNode.metadata?.execution && (
                <div className="whitespace-nowrap">支出: {formatBudget(originalNode.metadata.execution)}</div>
              )}
              {originalNode.metadata?.differenceData && (
                <div className="mt-2">
                  <div className="whitespace-nowrap">予算総計: {formatBudget(originalNode.metadata.differenceData.budgetTotal)}</div>
                  <div className="whitespace-nowrap">支出総計: {formatBudget(originalNode.metadata.differenceData.executionTotal)}</div>
                  <div className="font-bold mt-1 whitespace-nowrap">
                    差額: {formatBudget(originalNode.metadata.differenceData.difference)}
                  </div>
                </div>
              )}
            </div>
          );
        }}
        linkTooltip={({ link }: any) => {
          const sourceNode = nivoData.nodes.find((n: any) => n.id === link.source.id);
          const targetNode = nivoData.nodes.find((n: any) => n.id === link.target.id);

          return (
            <div className="bg-white dark:bg-gray-800 p-3 rounded shadow-lg border border-gray-200 dark:border-gray-700 min-w-[250px]">
              <div className="font-bold mb-1 whitespace-nowrap">
                {sourceNode?.name} → {targetNode?.name}
              </div>
              <div className="whitespace-nowrap">{formatBudget(link.value)}</div>
            </div>
          );
        }}
      />
    </div>

      <SankeyNodeDetailModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        nodeId={modalState.nodeId}
        nodeName={modalState.nodeName}
        nodeType={modalState.nodeType}
        nodeMetadata={modalState.nodeMetadata}
        year={year}
        availableMinistries={availableMinistries}
      />
    </>
  );
}

// ノードの色を取得
function getNodeColor(node: any, config: any): string {
  if (node.type === 'ministry' && node.metadata?.ministry) {
    return config.ministryColorMapping[node.metadata.ministry] || '#3b82f6';
  }

  if (node.type === 'total') {
    return config.totalColor || '#94a3b8';
  }

  if (node.type === 'difference') {
    return config.differenceColor || '#9ca3af';
  }

  if (node.type === 'others') {
    return config.othersColor || '#6b7280';
  }

  return '#6b7280';
}
