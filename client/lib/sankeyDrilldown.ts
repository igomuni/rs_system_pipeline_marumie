/**
 * サンキー図のドリルダウン機能
 * ノードクリック時に詳細データを生成
 */
import type { SankeyData, SankeyNode } from '@/types/sankey';
import type { Year } from '@/types/rs-system';
import { loadExpenditureData } from './expenditureLoader';

interface DrilldownParams {
  originalData: SankeyData;
  clickedNode: SankeyNode;
  year: Year;
  topN?: number;
}

/**
 * 府省庁ノードをクリックした場合のドリルダウンデータ生成
 * 左から: 府省庁総予算 → 事業Top N → 支出先Top N（まとめる）
 */
export async function generateMinistryDrilldown(params: DrilldownParams): Promise<SankeyData | null> {
  const { originalData, clickedNode, topN = 20 } = params;

  if (clickedNode.type !== 'ministry' || !clickedNode.metadata?.ministry) {
    return null;
  }

  const ministry = clickedNode.metadata.ministry;
  const nodes: SankeyNode[] = [];
  const links: Array<{ source: string; target: string; value: number }> = [];

  // 支出先データをロード（事業を支出合計でソートするため）
  const expenditureData = await loadExpenditureData(params.year);

  // この府省庁の全事業を取得
  const ministryProjects = originalData.nodes.filter(
    (n) => n.type === 'project' && n.metadata?.ministry === ministry
  );

  // 事業を支出合計で降順ソート（支出データがない場合は予算額でソート）
  const sortedProjects = [...ministryProjects].sort((a, b) => {
    const aProjectId = a.metadata?.eventId;
    const bProjectId = b.metadata?.eventId;

    const aExpenditure = aProjectId ? expenditureData[String(aProjectId)]?.totalExpenditureAmount || 0 : 0;
    const bExpenditure = bProjectId ? expenditureData[String(bProjectId)]?.totalExpenditureAmount || 0 : 0;

    // 支出合計がある場合は支出合計で、ない場合は予算額でソート
    if (aExpenditure > 0 || bExpenditure > 0) {
      return bExpenditure - aExpenditure;
    }
    return (b.metadata?.budget || 0) - (a.metadata?.budget || 0);
  });

  const topProjects = sortedProjects.slice(0, topN);
  const otherProjects = sortedProjects.slice(topN);

  // 第1列: Top N事業ノード（金額降順）
  topProjects.forEach((project) => {
    const projectNode: SankeyNode = {
      ...project,
      id: `project_${project.metadata?.eventId}`,
      column: 0, // 明示的に第1列に配置
    };
    nodes.push(projectNode);
  });

  // その他事業ノード（第1列の最下部）
  if (otherProjects.length > 0) {
    const othersBudget = otherProjects.reduce(
      (sum, p) => sum + (p.metadata?.budget || 0),
      0
    );

    const othersNode: SankeyNode = {
      id: 'projects_others',
      name: `残り${otherProjects.length}事業`,
      type: 'others',
      column: 0, // 明示的に第1列に配置
      metadata: {
        ministry,
        budget: othersBudget,
        projectCount: otherProjects.length,
      },
    };
    nodes.push(othersNode);
  }

  // 第2列: 支出先Top Nを集約して表示
  const allExpenditures = new Map<string, number>();

  // 支出先データは既にロード済み（上でソートに使用）
  topProjects.forEach((project) => {
    const projectId = project.metadata?.eventId;
    if (!projectId) return;

    // この事業の支出先を取得（キーは文字列）
    const projectExpData = expenditureData[String(projectId)];
    if (!projectExpData) return;

    projectExpData.top20Expenditures.forEach((exp) => {
      allExpenditures.set(exp.name, (allExpenditures.get(exp.name) || 0) + exp.amount);
    });
  });

  // 支出先データがある場合のみ第2列を追加
  if (allExpenditures.size > 0) {
    // 支出先を金額降順でソート
    const sortedExpenditures = Array.from(allExpenditures.entries())
      .sort(([, a], [, b]) => b - a);

    const topExpenditures = sortedExpenditures.slice(0, topN);
    const otherExpenditures = sortedExpenditures.slice(topN);

    // Top N支出先ノードを追加（第2列）
    // 「その他」という名前の支出先も通常の支出先として扱う
    topExpenditures.forEach(([expName, amount]) => {
      const expNodeId = `exp_${expName}`;
      nodes.push({
        id: expNodeId,
        name: expName,
        type: 'expenditure',
        column: 1, // 明示的に第2列に配置
        metadata: {
          expenditureName: expName,
          amount,
          ministry, // 府省庁情報を引き継ぐ
        },
      });
    });

    // その他支出先ノード（第2列）- Top Nに含まれない支出先の集約
    if (otherExpenditures.length > 0) {
      const othersAmount = otherExpenditures.reduce((sum, [, amount]) => sum + amount, 0);
      const expenditureList = otherExpenditures.map(([name, amount]) => ({ name, amount }));
      nodes.push({
        id: 'exp_others',
        name: `残り${otherExpenditures.length}支出先`,
        type: 'others',
        column: 1, // 明示的に第2列に配置
        metadata: {
          amount: othersAmount,
          ministry, // 府省庁情報を引き継ぐ（その他ノードにも色を適用しない）
          expenditureList, // モーダル表示用の全リスト
        },
      });
    }

    // 事業 → 支出先のリンクを作成
    topProjects.forEach((project) => {
      const projectNodeId = `project_${project.metadata?.eventId}`;
      const projectId = project.metadata?.eventId;
      if (!projectId) return;

      const projectExpData = expenditureData[String(projectId)];
      if (!projectExpData) return;

      const projectExpMap = new Map<string, number>();
      projectExpData.top20Expenditures.forEach((exp) => {
        projectExpMap.set(exp.name, exp.amount);
      });

      // Top N支出先へのリンク
      topExpenditures.forEach(([expName]) => {
        const amount = projectExpMap.get(expName);
        if (amount) {
          links.push({
            source: projectNodeId,
            target: `exp_${expName}`,
            value: amount,
          });
        }
      });

      // その他支出先へのリンク
      if (otherExpenditures.length > 0) {
        let othersAmount = 0;
        otherExpenditures.forEach(([expName]) => {
          othersAmount += projectExpMap.get(expName) || 0;
        });

        if (othersAmount > 0) {
          links.push({
            source: projectNodeId,
            target: 'exp_others',
            value: othersAmount,
          });
        }
      }
    });
  }

  return { nodes, links };
}

/**
 * 事業ノードをクリックした場合のドリルダウンデータ生成
 * 支出先Top Nのみ表示（1列構成）
 */
export async function generateProjectDrilldown(params: DrilldownParams): Promise<SankeyData | null> {
  const { clickedNode, topN = 20 } = params;

  if (clickedNode.type !== 'project' || !clickedNode.metadata?.eventId) {
    return null;
  }

  const projectId = clickedNode.metadata.eventId;
  const ministry = clickedNode.metadata?.ministry;
  const nodes: SankeyNode[] = [];
  const links: Array<{ source: string; target: string; value: number }> = [];

  // 支出先データをロード
  const expenditureData = await loadExpenditureData(params.year);
  const projectExpData = expenditureData[String(projectId)];

  if (!projectExpData || projectExpData.top20Expenditures.length === 0) {
    // 支出先データがない場合は空を返す
    return { nodes, links };
  }

  // 支出先を金額降順でソート（既にソート済みだがTop Nを適用）
  const allExpenditures = projectExpData.top20Expenditures;
  const topExpenditures = allExpenditures.slice(0, topN);
  const otherExpenditures = allExpenditures.slice(topN);

  // 第1列: Top N支出先ノード
  topExpenditures.forEach((exp) => {
    const expNodeId = `exp_${exp.name}`;
    nodes.push({
      id: expNodeId,
      name: exp.name,
      type: 'expenditure',
      column: 0, // 明示的に第1列に配置
      metadata: {
        expenditureName: exp.name,
        amount: exp.amount,
        ministry, // 事業の府省庁情報を引き継ぐ
      },
    });
  });

  // その他支出先ノード
  if (otherExpenditures.length > 0) {
    const othersAmount = otherExpenditures.reduce(
      (sum, exp) => sum + exp.amount,
      0
    );

    const expenditureList = otherExpenditures.map((exp) => ({ name: exp.name, amount: exp.amount }));
    const othersNode: SankeyNode = {
      id: 'exp_others',
      name: `残り${otherExpenditures.length}支出先`,
      type: 'others',
      column: 0, // 明示的に第1列に配置
      metadata: {
        amount: othersAmount,
        ministry, // 事業の府省庁情報を引き継ぐ
        expenditureList, // モーダル表示用の全リスト
      },
    };
    nodes.push(othersNode);
  }

  // TODO: 再帰的なTop Nブレイクダウン（第2列）
  // 現在は5-2_支出ブロックのつながり.csvが2024年のみ存在するため、
  // 将来的に実装可能

  return { nodes, links };
}

/**
 * クリックされたノードに基づいて適切なドリルダウンデータを生成
 */
export async function generateDrilldownData(params: DrilldownParams): Promise<SankeyData | null> {
  const { clickedNode } = params;

  switch (clickedNode.type) {
    case 'ministry':
      return await generateMinistryDrilldown(params);
    case 'project':
      return await generateProjectDrilldown(params);
    default:
      return null;
  }
}
