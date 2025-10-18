'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, type SankeyGraph } from 'd3-sankey';
import type { SankeyData, D3SankeyNode, D3SankeyLink } from '@/types/sankey';
import type { Year } from '@/types/rs-system';

interface Props {
  data: SankeyData;
  year: Year;
}

export default function SankeyChart({ data, year }: Props) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<D3SankeyNode | null>(null);

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
    if (!svgRef.current || !containerRef.current || !data || !data.nodes || !data.nodes.length || !data.links || !data.links.length) {
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

    // カスタムnodeAlign関数：左側のノード（total）は上揃え、右側は均等配置
    const customNodeAlign = (node: D3SankeyNode, n: number) => {
      // nodeがundefinedまたはtypeプロパティがない場合はデフォルト値を返す
      if (!node || !node.type) {
        // sankeyJustifyの実装と同じロジック
        return node.sourceLinks && node.sourceLinks.length ? node.depth || 0 : n - 1;
      }
      if (node.type === 'total') {
        return 0; // 左側のノードは上に配置
      }
      // sankeyJustifyの実装と同じロジック
      return node.sourceLinks && node.sourceLinks.length ? node.depth || 0 : n - 1;
    };

    // サンキーレイアウトを作成
    const sankeyGenerator = sankey<D3SankeyNode, D3SankeyLink>()
      .nodeId((d) => d.id)
      .nodeWidth(15)
      .nodePadding(10)
      .nodeAlign(customNodeAlign)
      .extent([
        [0, 0],
        [width - margin.left - margin.right, height - margin.top - margin.bottom],
      ]);

    // データを変換
    const graph: SankeyGraph<D3SankeyNode, D3SankeyLink> = {
      nodes: data.nodes.map((d) => ({ ...d })),
      links: data.links.map((d) => ({ ...d })),
    };

    sankeyGenerator(graph);

    // カラースケール
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // リンクを描画
    const links = g
      .append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(graph.links)
      .join('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d) => {
        const sourceNode = d.source as D3SankeyNode;
        return colorScale(sourceNode.metadata?.ministry || sourceNode.name);
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
      .attr('fill', (d) => colorScale(d.metadata?.ministry || d.name))
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('opacity', 1);
      })
      .on('click', function (event, d) {
        // ノードタイプに応じて遷移先を決定
        if (d.type === 'project' && d.metadata?.projectId) {
          // 事業ノード → 事業詳細ページ
          router.push(`/${year}/project/${d.metadata.projectId}`);
        } else if (d.type === 'ministry' && d.metadata?.ministry) {
          // 府省庁ノード → 府省庁フィルターページ
          router.push(`/${year}?ministry=${encodeURIComponent(d.metadata.ministry)}`);
        } else if (d.type === 'total') {
          // 年度予算ノード → 年度トップページ
          router.push(`/${year}`);
        } else {
          // その他のノード → 選択状態を表示
          setSelectedNode(d);
        }
      })
      .style('cursor', (d) => {
        // クリック可能なノードはポインターカーソルを表示
        const isClickable =
          (d.type === 'project' && d.metadata?.projectId) ||
          (d.type === 'ministry' && d.metadata?.ministry) ||
          (d.type === 'total');
        return isClickable ? 'pointer' : 'default';
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
        .attr('fill', '#333')
        .style('pointer-events', 'none');

      // 金額を表示
      if (d.value) {
        labels.append('text')
          .attr('x', x)
          .attr('y', y + 6)
          .attr('text-anchor', textAnchor)
          .text(formatAmount(d.value))
          .attr('font-size', amountFontSize)
          .attr('fill', '#666')
          .style('pointer-events', 'none');
      }
    });
  }, [data, year]);

  return (
    <div className="space-y-4">
      <div ref={containerRef} className="w-full">
        <svg ref={svgRef} className="w-full" />
      </div>

      {selectedNode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-lg mb-2">選択中のノード</h3>
          <div className="space-y-1 text-sm">
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
            className="mt-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            閉じる
          </button>
        </div>
      )}

      {(!data || !data.nodes || data.nodes.length === 0 || !data.links || data.links.length === 0) && (
        <div className="text-center py-12 text-gray-500">
          <p>表示するデータがありません</p>
          <p className="text-sm mt-2">別の年度または府省庁を選択してください</p>
        </div>
      )}
    </div>
  );
}
