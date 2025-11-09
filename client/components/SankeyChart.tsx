'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from 'd3-sankey';
import type { SankeyData, D3SankeyNode, D3SankeyLink, SankeyNode } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import { useSankeyConfig } from '@/client/hooks/useSankeyConfig';
import { filterSankeyDataByConfig } from '@/client/lib/sankeyFilter';
import { generateDrilldownData } from '@/client/lib/sankeyDrilldown';
import ExpenditureListModal from './ExpenditureListModal';
import MinistryListModal from './MinistryListModal';
import ProjectListModal from './ProjectListModal';

interface Props {
  data: SankeyData;
  year: Year;
}

// ドリルダウン履歴の型
interface DrilldownHistory {
  node: SankeyNode;
  data: SankeyData;
}

export default function SankeyChart({ data, year }: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<D3SankeyNode | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { config, isLoaded } = useSankeyConfig();

  // ドリルダウン状態管理
  const [drilldownStack, setDrilldownStack] = useState<DrilldownHistory[]>([]);
  const [currentData, setCurrentData] = useState<SankeyData>(data);

  // モーダル状態管理
  const [expenditureModalOpen, setExpenditureModalOpen] = useState(false);
  const [modalExpenditures, setModalExpenditures] = useState<Array<{ name: string; amount: number }>>([]);
  const [expenditureModalTitle, setExpenditureModalTitle] = useState('');
  const [expenditureModalProjectName, setExpenditureModalProjectName] = useState<string | undefined>();

  const [ministryModalOpen, setMinistryModalOpen] = useState(false);
  const [modalMinistries, setModalMinistries] = useState<Array<{ name: string; budget: number }>>([]);
  const [ministryModalTitle, setMinistryModalTitle] = useState('');

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [modalProjects, setModalProjects] = useState<Array<{ name: string; budget: number; ministry?: string; eventId?: number }>>([]);
  const [projectModalTitle, setProjectModalTitle] = useState('');

  // 設定に基づいてデータをフィルタリング
  // ドリルダウン中はフィルタリングしない（既に必要なノードだけで構成されているため）
  const filteredData = useMemo(() => {
    if (!isLoaded) return currentData;
    // ドリルダウン中かどうかを判定
    const isDrilldown = drilldownStack.length > 0;
    if (isDrilldown) return currentData;
    return filterSankeyDataByConfig(currentData, config);
  }, [currentData, config, isLoaded, drilldownStack]);

  // dataが変更されたらドリルダウンをリセット
  useEffect(() => {
    setDrilldownStack([]);
    setCurrentData(data);
  }, [data]);

  // ダークモードの検出
  useEffect(() => {
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(darkModeMediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handler);
    return () => darkModeMediaQuery.removeEventListener('change', handler);
  }, []);

  // 金額を適切な単位でフォーマット
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000000000) {
      // 1兆円以上
      return `${(amount / 1000000000000).toFixed(1)}兆円`;
    } else if (amount >= 100000000) {
      // 1億円以上
      return `${(amount / 100000000).toFixed(0)}億円`;
    } else if (amount >= 10000) {
      // 1万円以上
      return `${(amount / 10000).toFixed(0)}万円`;
    } else {
      return `${amount.toFixed(0)}円`;
    }
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !filteredData || !filteredData.nodes || !filteredData.nodes.length || !filteredData.links || !filteredData.links.length) {
      return;
    }

    // コンテナのサイズを取得
    const containerWidth = containerRef.current.offsetWidth;
    const width = containerWidth > 0 ? containerWidth : 800; // フォールバック値を設定
    const isMobile = width < 640; // Tailwind sm breakpoint
    const height = isMobile ? 500 : 600;
    const margin = isMobile
      ? { top: 10, right: 60, bottom: 10, left: 60 }
      : { top: 20, right: 120, bottom: 20, left: 120 };

    // SVGをクリア
    d3.select(svgRef.current).selectAll('*').remove();

    // SVGを設定 (iPhone Safari対応のため明示的に属性を設定)
    const svg = d3
      .select(svgRef.current)
      .attr('width', '100%')
      .attr('height', height)
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // カスタムnodeSort関数：ノードを予算額で降順にソート
    const customNodeSort = (a: D3SankeyNode, b: D3SankeyNode) => {
      // 「その他」ノードは常に最下部
      // - type='others': その他府省庁、その他事業、その他支出先（集約）
      // - IDに'others': 上記と同じ
      // - 支出先で名前が「その他」のみ: 実データの支出先「その他」
      const aIsOthers = a.type === 'others' || a.id.includes('others') ||
                        (a.type === 'expenditure' && a.name === 'その他');
      const bIsOthers = b.type === 'others' || b.id.includes('others') ||
                        (b.type === 'expenditure' && b.name === 'その他');
      if (aIsOthers && !bIsOthers) return 1;
      if (!aIsOthers && bIsOthers) return -1;

      // 両方が「その他」の場合は金額で降順（予算またはamount）
      if (aIsOthers && bIsOthers) {
        const aValue = a.metadata?.budget || a.metadata?.amount || a.value || 0;
        const bValue = b.metadata?.budget || b.metadata?.amount || b.value || 0;
        return bValue - aValue;
      }

      // 支出先ノードは金額（amount）で降順
      if (a.type === 'expenditure' && b.type === 'expenditure') {
        return (b.metadata?.amount || 0) - (a.metadata?.amount || 0);
      }
      // 府省庁ノードは予算額で降順
      if (a.type === 'ministry' && b.type === 'ministry') {
        return (b.metadata?.budget || 0) - (a.metadata?.budget || 0);
      }
      // プロジェクトノードも予算額で降順
      if (a.type === 'project' && b.type === 'project') {
        return (b.metadata?.budget || 0) - (a.metadata?.budget || 0);
      }
      // その他は値（フローの太さ）で降順
      return (b.value || 0) - (a.value || 0);
    };

    // サンキーレイアウトを作成
    const sankeyGenerator = sankey<D3SankeyNode, D3SankeyLink>()
      .nodeId((d) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .nodeSort(customNodeSort)
      .extent([
        [0, 0],
        [width - margin.left - margin.right, height - margin.top - margin.bottom],
      ]);

    // データを変換
    const graph: SankeyGraph<D3SankeyNode, D3SankeyLink> = {
      nodes: filteredData.nodes.map((d) => ({
        ...d,
        // columnプロパティが指定されている場合はdepthとして設定（D3 sankeyが列位置として使用）
        ...(d.column !== undefined && { depth: d.column }),
      })),
      links: filteredData.links.map((d) => ({ ...d })),
    };

    // データの検証
    if (!graph.nodes || graph.nodes.length === 0) {
      console.error('No nodes in graph');
      return;
    }
    if (!graph.links || graph.links.length === 0) {
      console.error('No links in graph');
      return;
    }

    // リンクのsource/targetがノードIDとして存在するか確認
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    const invalidLinks = graph.links.filter(l => {
      const sourceId = typeof l.source === 'string' ? l.source : (l.source as D3SankeyNode).id;
      const targetId = typeof l.target === 'string' ? l.target : (l.target as D3SankeyNode).id;
      return !nodeIds.has(sourceId) || !nodeIds.has(targetId);
    });

    if (invalidLinks.length > 0) {
      console.error('Invalid links found:', invalidLinks);
      return;
    }

    try {
      sankeyGenerator(graph);
    } catch (error) {
      console.error('Sankey generator error:', error);
      return;
    }

    // カラースケール: 設定に基づいた固定の色マッピング
    const colorScale = (ministry: string) => {
      // 設定に定義された府省庁の色を使用
      if (config.ministryColorMapping[ministry]) {
        return config.ministryColorMapping[ministry];
      }
      // 定義されていない府省庁はグレー
      return isDarkMode ? '#9ca3af' : '#d1d5db';
    };

    // リンクを描画
    const links = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => {
        // リンクの色は、府省庁メタデータに基づく
        const sourceNode = d.source as D3SankeyNode;
        const targetNode = d.target as D3SankeyNode;

        // ターゲットがその他ノードの場合は濃いグレー
        if (targetNode.type === 'others') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }
        // ソースがその他ノードの場合は濃いグレー
        if (sourceNode.type === 'others') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }
        // ターゲットが支出先「その他」の場合は濃いグレー
        if (targetNode.type === 'expenditure' && targetNode.name === 'その他') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }
        // ソースが支出先「その他」の場合は濃いグレー
        if (sourceNode.type === 'expenditure' && sourceNode.name === 'その他') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }

        // プロジェクト・支出先ノード → 府省庁の色を使用
        if ((targetNode.type === 'project' || targetNode.type === 'expenditure') && targetNode.metadata?.ministry) {
          return colorScale(targetNode.metadata.ministry);
        }
        // 府省庁ノード → 府省庁の色を使用
        if (sourceNode.type === 'ministry' && sourceNode.metadata?.ministry) {
          return colorScale(sourceNode.metadata.ministry);
        }
        // totalノード（ドリルダウン時の府省庁総予算・事業予算）→ 府省庁の色を使用
        if ((sourceNode.type === 'total' || targetNode.type === 'total') && sourceNode.metadata?.ministry) {
          return colorScale(sourceNode.metadata.ministry);
        }
        // デフォルト
        return isDarkMode ? '#6b7280' : '#9ca3af';
      })
      .attr('stroke-width', (d) => Math.max(1, d.width || 0))
      .attr('fill', 'none')
      .attr('opacity', 0.3)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.7);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('opacity', 0.3);
      });

    // リンクのツールチップ
    links.append('title').text((d) => {
      const sourceNode = d.source as D3SankeyNode;
      const targetNode = d.target as D3SankeyNode;
      return `${sourceNode.name} → ${targetNode.name}\n金額: ${(d.value / 100000000).toFixed(2)}億円`;
    });

    // ノードを描画
    const nodes = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('rect')
      .data(graph.nodes)
      .join('rect')
      .attr('x', (d) => d.x0 || 0)
      .attr('y', (d) => d.y0 || 0)
      .attr('height', (d) => Math.max(0, (d.y1 || 0) - (d.y0 || 0)))
      .attr('width', (d) => Math.max(0, (d.x1 || 0) - (d.x0 || 0)))
      .attr('fill', (d) => {
        // その他ノードは常に濃いグレー
        if (d.type === 'others') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }
        // 支出先で名前が「その他」のノードも濃いグレー
        if (d.type === 'expenditure' && d.name === 'その他') {
          return isDarkMode ? '#4b5563' : '#6b7280';
        }
        // 府省庁ノード
        if (d.type === 'ministry' && d.metadata?.ministry) {
          return colorScale(d.metadata.ministry);
        }
        // プロジェクト・支出先ノード → 府省庁の色を使用
        if ((d.type === 'project' || d.type === 'expenditure') && d.metadata?.ministry) {
          return colorScale(d.metadata.ministry);
        }
        // totalノード（ドリルダウン時の府省庁総予算・事業予算）→ 府省庁の色を使用
        if (d.type === 'total' && d.metadata?.ministry) {
          return colorScale(d.metadata.ministry);
        }
        // その他のtotalノード（メインビューの総予算）: 中間的な色
        if (d.type === 'total') {
          return isDarkMode ? '#4b5563' : '#d1d5db';
        }
        // デフォルト: グレー
        return isDarkMode ? '#6b7280' : '#9ca3af';
      })
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('opacity', 1);
      })
      .on('click', async function (event, d) {
        event.stopPropagation();

        // 「小規模府省庁」ノードの場合、モーダル表示
        if (d.type === 'others' && d.id === 'ministry_others' && d.metadata?.ministryList) {
          setMinistryModalTitle(d.name || '小規模府省庁');
          setModalMinistries(d.metadata.ministryList);
          setMinistryModalOpen(true);
          return;
        }

        // 「残り事業」ノードの場合、モーダル表示
        if (d.type === 'others' && d.id === 'others' && d.metadata?.projectList) {
          setProjectModalTitle(d.name || '残り事業');
          setModalProjects(d.metadata.projectList);
          setProjectModalOpen(true);
          return;
        }

        // 「残り支出先」ノードの場合、モーダル表示
        if (d.type === 'others' && d.id.includes('exp_others') && d.metadata?.expenditureList) {
          setExpenditureModalTitle(d.name || '残り支出先');
          setModalExpenditures(d.metadata.expenditureList);
          setExpenditureModalProjectName(undefined); // 複数事業の集約なのでprojectNameなし
          setExpenditureModalOpen(true);
          return;
        }

        // 事業ノードの場合
        if (d.type === 'project') {
          const projectId = d.metadata?.eventId;
          const projectName = d.name;

          // メインビュー（ドリルダウン前）の場合は支出先モーダルを表示
          if (drilldownStack.length === 0 && projectId) {
            try {
              // 支出先データをロード
              const { loadExpenditureData } = await import('@/client/lib/expenditureLoader');
              const expenditureData = await loadExpenditureData(year);
              const projectExpData = expenditureData[String(projectId)];

              if (projectExpData && projectExpData.top20Expenditures.length > 0) {
                setExpenditureModalTitle(`${projectName} - 支出先一覧`);
                setModalExpenditures(projectExpData.top20Expenditures);
                setExpenditureModalProjectName(projectName);
                setExpenditureModalOpen(true);
                return;
              }
            } catch (error) {
              console.error('Failed to load expenditure data:', error);
            }
          }

          // ドリルダウン中の場合は従来通りドリルダウン
          try {
            const drilldownData = await generateDrilldownData({
              originalData: data,
              clickedNode: d as SankeyNode,
              year,
              topN: config.topProjectsCount,
            });

            if (drilldownData) {
              // ドリルダウン履歴に追加
              setDrilldownStack((prev) => [
                ...prev,
                {
                  node: d as SankeyNode,
                  data: currentData,
                },
              ]);
              setCurrentData(drilldownData);
              return;
            }
          } catch (error) {
            console.error('Failed to generate drilldown data:', error);
            setSelectedNode(d);
            return;
          }
        }

        // 府省庁ノードの場合はドリルダウン
        if (d.type === 'ministry') {
          try {
            const drilldownData = await generateDrilldownData({
              originalData: data,
              clickedNode: d as SankeyNode,
              year,
              topN: config.topProjectsCount,
            });

            if (drilldownData) {
              // ドリルダウン履歴に追加
              setDrilldownStack((prev) => [
                ...prev,
                {
                  node: d as SankeyNode,
                  data: currentData,
                },
              ]);
              setCurrentData(drilldownData);
              return;
            }
          } catch (error) {
            console.error('Failed to generate drilldown data:', error);
            setSelectedNode(d);
            return;
          }
        }

        // その他の場合は選択状態を表示
        setSelectedNode(d);
      })
      .style('cursor', (d) => {
        // クリック可能なノードはポインターカーソルを表示
        const isNavigable =
          (d.type === 'project' && (d.metadata?.projectId || d.metadata?.ministry)) ||
          (d.type === 'ministry' && d.metadata?.ministry) ||
          (d.type === 'total');
        const isSelectable =
          d.type === 'expenditure' ||
          d.type === 'others' ||
          d.type === 'unknown';
        return isNavigable || isSelectable ? 'pointer' : 'default';
      });

    // ノードのツールチップ
    nodes.append('title').text((d) => {
      const lines = [d.name];
      if (d.metadata?.eventName) {
        lines.push(`事業: ${d.metadata.eventName}`);
      }
      if (d.metadata?.budget) {
        lines.push(`予算: ${(d.metadata.budget / 100000000).toFixed(2)}億円`);
      }
      if (d.value) {
        lines.push(`合計: ${(d.value / 100000000).toFixed(2)}億円`);
      }
      return lines.join('\n');
    });

    // ノードのラベルを描画
    const labels = g.append('g').attr('class', 'labels');

    graph.nodes.forEach((d) => {
      const isLeft = (d.x0 || 0) < width / 2;
      const x = isLeft ? (d.x1 || 0) + 6 : (d.x0 || 0) - 6;
      const y = ((d.y1 || 0) + (d.y0 || 0)) / 2;
      const textAnchor = isLeft ? 'start' : 'end';

      // 名前を表示
      const maxNameLength = isMobile ? 12 : 20;
      const name = d.name.length > maxNameLength ? d.name.substring(0, maxNameLength) + '...' : d.name;
      const nameFontSize = isMobile ? 8 : 10;
      const amountFontSize = isMobile ? 7 : 9;

      labels.append('text')
        .attr('x', x)
        .attr('y', y - 6)
        .attr('text-anchor', textAnchor)
        .text(name)
        .attr('font-size', nameFontSize)
        .attr('fill', isDarkMode ? '#e5e7eb' : '#333')
        .style('pointer-events', 'none');

      // 金額を表示
      if (d.value) {
        labels.append('text')
          .attr('x', x)
          .attr('y', y + 6)
          .attr('text-anchor', textAnchor)
          .text(formatAmount(d.value))
          .attr('font-size', amountFontSize)
          .attr('fill', isDarkMode ? '#9ca3af' : '#666')
          .style('pointer-events', 'none');
      }
    });
  }, [filteredData, year, isDarkMode, router, config, isLoaded, data, currentData, drilldownStack]);

  // 戻るボタンのハンドラー
  const handleBack = () => {
    if (drilldownStack.length > 0) {
      const previous = drilldownStack[drilldownStack.length - 1];
      setCurrentData(previous.data);
      setDrilldownStack((prev) => prev.slice(0, -1));
    }
  };

  return (
    <div className="space-y-4">
      {/* ドリルダウン中の場合、戻るボタンを表示 */}
      {drilldownStack.length > 0 && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleBack}
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            戻る
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {drilldownStack[drilldownStack.length - 1].node.name}
          </span>
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      {selectedNode && (
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-white">選択中のノード</h3>
          <div className="space-y-1 text-sm text-gray-900 dark:text-gray-200">
            <p>
              <span className="font-medium">名前:</span> {selectedNode.name}
            </p>
            {selectedNode.metadata?.eventName && (
              <p>
                <span className="font-medium">事業:</span> {selectedNode.metadata.eventName}
              </p>
            )}
            {selectedNode.metadata?.ministry && (
              <p>
                <span className="font-medium">府省庁:</span> {selectedNode.metadata.ministry}
              </p>
            )}
            {selectedNode.value && (
              <p>
                <span className="font-medium">金額:</span>{' '}
                {(selectedNode.value / 100000000).toFixed(2)}億円
              </p>
            )}
            {selectedNode.metadata?.location && (
              <p>
                <span className="font-medium">所在地:</span> {selectedNode.metadata.location}
              </p>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="mt-3 px-3 py-1 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 text-sm"
          >
            閉じる
          </button>
        </div>
      )}

      {(!filteredData || !filteredData.nodes || filteredData.nodes.length === 0 || !filteredData.links || filteredData.links.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <p>表示するデータがありません</p>
          <p className="text-sm mt-2">別の年度または府省庁を選択してください</p>
        </div>
      )}

      {/* 支出先リストモーダル */}
      <ExpenditureListModal
        isOpen={expenditureModalOpen}
        onClose={() => setExpenditureModalOpen(false)}
        expenditures={modalExpenditures}
        title={expenditureModalTitle}
        projectName={expenditureModalProjectName}
      />

      {/* 府省庁リストモーダル */}
      <MinistryListModal
        isOpen={ministryModalOpen}
        onClose={() => setMinistryModalOpen(false)}
        ministries={modalMinistries}
        title={ministryModalTitle}
      />

      {/* 事業リストモーダル */}
      <ProjectListModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        projects={modalProjects}
        title={projectModalTitle}
      />
    </div>
  );
}
