/**
 * クライアント側でサンキーデータを設定に基づいてフィルタリング
 */
import type { SankeyData, SankeyNode, SankeyLink } from '@/types/sankey';
import type { SankeyConfig } from '@/types/sankey-config';

export function filterSankeyDataByConfig(
  originalData: SankeyData,
  config: SankeyConfig
): SankeyData {
  // 6列データの検出: columnプロパティが設定されているノードが存在する場合
  const is6ColumnData = originalData.nodes.some((n) => n.column !== undefined);

  // 6列データの場合はフィルタリングをスキップ（事前処理済み）
  if (is6ColumnData) {
    return originalData;
  }

  // 以下は3列レガシーデータ用のフィルタリング処理
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // 元のノードをタイプ別に分類
  const ministryNodes = originalData.nodes.filter((n) => n.type === 'ministry');
  const totalNode = originalData.nodes.find((n) => n.type === 'total');
  const projectNodes = originalData.nodes.filter((n) => n.type === 'project');
  const othersNode = originalData.nodes.find((n) => n.type === 'others');

  if (!totalNode) return originalData;

  // 総予算を計算
  const totalBudget = totalNode.metadata?.budget || 0;

  // 府省庁の閾値を計算
  const ministryThreshold =
    config.ministryThresholdType === 'percentage'
      ? totalBudget * config.ministryThresholdPercentage
      : config.ministryThreshold;

  // 府省庁を予算額で降順ソート
  const sortedMinistries = [...ministryNodes].sort(
    (a, b) => (b.metadata?.budget || 0) - (a.metadata?.budget || 0)
  );

  // 閾値以上の主要府省庁と閾値未満の府省庁を分離
  const mainMinistries = sortedMinistries.filter(
    (m) => (m.metadata?.budget || 0) >= ministryThreshold
  );
  const minorMinistries = sortedMinistries.filter(
    (m) => (m.metadata?.budget || 0) < ministryThreshold
  );

  // 主要府省庁ノードを追加
  mainMinistries.forEach((ministry) => {
    nodes.push(ministry);
  });

  // その他府省庁ノードを追加（閾値未満をまとめる）
  if (minorMinistries.length > 0) {
    const minorBudget = minorMinistries.reduce(
      (sum, m) => sum + (m.metadata?.budget || 0),
      0
    );
    const minorMinistryNames = minorMinistries.map((m) => m.name);
    const ministryList = minorMinistries.map((m) => ({
      name: m.name,
      budget: m.metadata?.budget || 0,
    }));

    nodes.push({
      id: 'ministry_others',
      name: `小規模府省庁（${minorMinistries.length}）`,
      type: 'others', // その他として扱い、最下部に配置
      metadata: {
        ministry: '小規模府省庁',
        budget: minorBudget,
        ministries: minorMinistryNames,
        ministryList, // モーダル表示用の全リスト
      },
    });
  }

  // 総予算ノードを追加
  nodes.push(totalNode);

  // 府省庁 → 総予算のリンクを追加
  const mainMinistryIds = new Set(mainMinistries.map((m) => m.id));
  originalData.links
    .filter((l) => l.target === totalNode.id && mainMinistryIds.has(l.source as string))
    .forEach((link) => {
      links.push(link);
    });

  // その他府省庁 → 総予算のリンクを追加
  if (minorMinistries.length > 0) {
    const minorBudget = minorMinistries.reduce(
      (sum, m) => sum + (m.metadata?.budget || 0),
      0
    );
    links.push({
      source: 'ministry_others',
      target: totalNode.id,
      value: minorBudget,
    });
  }

  // 全プロジェクトを予算額で降順ソート
  const sortedProjects = [...projectNodes].sort(
    (a, b) => (b.metadata?.budget || 0) - (a.metadata?.budget || 0)
  );

  // Top N プロジェクトを取得
  const topProjects = sortedProjects.slice(0, config.topProjectsCount);
  const otherProjects = sortedProjects.slice(config.topProjectsCount);

  // Top N プロジェクトノードを追加
  topProjects.forEach((project) => {
    nodes.push(project);
  });

  // Top N プロジェクトのリンクを追加（総予算 → プロジェクト）
  const topProjectIds = new Set(topProjects.map((p) => p.id));
  originalData.links
    .filter((l) => l.source === totalNode.id && topProjectIds.has(l.target as string))
    .forEach((link) => {
      links.push(link);
    });

  // その他プロジェクトノードを追加
  if (otherProjects.length > 0) {
    const othersBudget = otherProjects.reduce(
      (sum, p) => sum + (p.metadata?.budget || 0),
      0
    );

    const projectList = otherProjects.map((p) => ({
      name: p.name,
      budget: p.metadata?.budget || 0,
      ministry: p.metadata?.ministry,
      eventId: p.metadata?.eventId,
    }));

    // 既存のその他ノードを使うか、新規作成
    const othersNodeToUse = othersNode || {
      id: 'others',
      name: `残り${otherProjects.length}事業`,
      type: 'others' as const,
      metadata: {
        budget: othersBudget,
        projectCount: otherProjects.length,
      },
    };

    // メタデータを更新
    nodes.push({
      ...othersNodeToUse,
      name: `残り${otherProjects.length}事業`,
      metadata: {
        ...othersNodeToUse.metadata,
        budget: othersBudget,
        projectList, // モーダル表示用の全リスト
        projectCount: otherProjects.length,
      },
    });

    // その他プロジェクトのリンクを追加
    links.push({
      source: totalNode.id,
      target: 'others',
      value: othersBudget,
    });
  }

  // 支出先ノードとリンクは表示しない（デフォルト表示では府省庁→総予算→プロジェクトのみ）
  // 支出先はドリルダウン時のみ表示される

  return { nodes, links };
}
