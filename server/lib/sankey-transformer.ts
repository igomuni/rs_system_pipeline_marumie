import 'server-only';
import type {
  SankeyData,
  SankeyNode,
  SankeyLink,
} from '@/types/sankey';
import type {
  ExpenditureInfo,
  ExpenditureConnection,
  BudgetSummary,
} from '@/types/rs-system';

/**
 * 支出データをサンキー図用のデータに変換
 */
export function transformToSankeyData(
  expenditureInfo: ExpenditureInfo[],
  expenditureConnections: ExpenditureConnection[],
  budgetSummary: BudgetSummary[],
  options?: {
    ministryFilter?: string;
    maxNodes?: number;
  }
): SankeyData {
  const nodes = new Map<string, SankeyNode>();
  const links: SankeyLink[] = [];

  // 予算サマリーから事業情報を取得するためのマップを作成
  const budgetMap = new Map<number, BudgetSummary>();
  budgetSummary.forEach(budget => {
    budgetMap.set(budget.予算事業ID, budget);
  });

  // 府省庁でフィルタリング
  let filteredConnections = expenditureConnections;
  if (options?.ministryFilter) {
    filteredConnections = expenditureConnections.filter(
      conn => conn.府省庁 === options.ministryFilter
    );
  }

  // ステップ1: 支出ブロックのつながりからノードとリンクを構築
  filteredConnections.forEach(connection => {
    const sourceBlockId = connection.支出元の支出先ブロック || connection.府省庁;
    const sourceBlockName = connection.支出元の支出先ブロック名 || connection.府省庁;
    const targetBlockId = connection.支出先の支出先ブロック;
    const targetBlockName = connection.支出先の支出先ブロック名;

    // ソースノードを追加
    if (!nodes.has(sourceBlockId)) {
      nodes.set(sourceBlockId, {
        id: sourceBlockId,
        name: sourceBlockName,
        type: connection.担当組織からの支出 ? 'ministry' : 'block',
        metadata: {
          ministry: connection.府省庁,
          eventId: connection.予算事業ID,
          eventName: connection.事業名,
        },
      });
    }

    // ターゲットノードを追加
    if (!nodes.has(targetBlockId)) {
      nodes.set(targetBlockId, {
        id: targetBlockId,
        name: targetBlockName,
        type: 'block',
        metadata: {
          ministry: connection.府省庁,
          eventId: connection.予算事業ID,
          eventName: connection.事業名,
        },
      });
    }
  });

  // ステップ2: 支出情報から金額を取得してリンクを作成
  const linkMap = new Map<string, number>();

  let filteredExpenditureInfo = expenditureInfo;
  if (options?.ministryFilter) {
    filteredExpenditureInfo = expenditureInfo.filter(
      info => info.府省庁 === options.ministryFilter
    );
  }

  filteredExpenditureInfo.forEach(info => {
    const blockId = info.支出先ブロック番号;
    const amount = info.ブロックの合計支出額 || info.金額 || 0;

    if (amount > 0) {
      // ブロックIDに対応するノードが存在する場合、リンクの金額を集約
      const existingAmount = linkMap.get(blockId) || 0;
      linkMap.set(blockId, existingAmount + amount);
    }

    // 支出先の詳細ノードを追加（企業・団体）
    if (info.支出先名 && info.金額 && info.金額 > 0) {
      const recipientId = `recipient_${info.支出先名}_${info.法人番号 || Math.random()}`;

      if (!nodes.has(recipientId)) {
        nodes.set(recipientId, {
          id: recipientId,
          name: info.支出先名,
          type: 'recipient',
          metadata: {
            ministry: info.府省庁,
            location: info.所在地,
            corporateNumber: info.法人番号,
            eventId: info.予算事業ID,
            eventName: info.事業名,
          },
        });
      }

      // ブロックから支出先へのリンクを作成
      links.push({
        source: blockId,
        target: recipientId,
        value: info.金額,
        metadata: {
          contractType: info.契約方式等,
          bidders: info.入札者数,
          fallRate: info.落札率,
          role: info.事業を行う上での役割,
        },
      });
    }
  });

  // ステップ3: つながりデータに基づいてブロック間のリンクを作成
  filteredConnections.forEach(connection => {
    const sourceBlockId = connection.支出元の支出先ブロック || connection.府省庁;
    const targetBlockId = connection.支出先の支出先ブロック;
    const linkKey = `${sourceBlockId}_${targetBlockId}`;

    // リンクの金額を取得（ターゲットブロックの合計金額を使用）
    const amount = linkMap.get(targetBlockId) || 0;

    if (amount > 0) {
      links.push({
        source: sourceBlockId,
        target: targetBlockId,
        value: amount,
      });
    }
  });

  // ステップ4: ノード数の制限（オプション）
  let finalNodes = Array.from(nodes.values());
  if (options?.maxNodes && finalNodes.length > options.maxNodes) {
    // ministry と block タイプのノードは優先的に保持
    const priorityNodes = finalNodes.filter(n => n.type === 'ministry' || n.type === 'block');
    const recipientNodes = finalNodes
      .filter(n => n.type === 'recipient')
      .sort((a, b) => {
        // リンクの金額で並び替え
        const aValue = links.filter(l => l.target === a.id).reduce((sum, l) => sum + l.value, 0);
        const bValue = links.filter(l => l.target === b.id).reduce((sum, l) => sum + l.value, 0);
        return bValue - aValue;
      })
      .slice(0, options.maxNodes - priorityNodes.length);

    finalNodes = [...priorityNodes, ...recipientNodes];

    // 削除されたノードへのリンクも削除
    const nodeIds = new Set(finalNodes.map(n => n.id));
    const filteredLinks = links.filter(
      l => nodeIds.has(l.source) && nodeIds.has(l.target)
    );

    return {
      nodes: finalNodes,
      links: filteredLinks,
    };
  }

  return {
    nodes: finalNodes,
    links,
  };
}

/**
 * 府省庁のリストを取得
 */
export function getMinistryList(budgetSummary: BudgetSummary[]): string[] {
  const ministries = new Set<string>();
  budgetSummary.forEach(budget => {
    if (budget.府省庁) {
      ministries.add(budget.府省庁);
    }
  });
  return Array.from(ministries).sort();
}

/**
 * 事業IDから予算情報を取得
 */
export function getBudgetInfoById(
  eventId: number,
  budgetSummary: BudgetSummary[]
): BudgetSummary | undefined {
  return budgetSummary.find(budget => budget.予算事業ID === eventId);
}
