/**
 * サンキー図用のデータ型定義
 */

// ノードの種類
export type NodeType = 'total' | 'ministry' | 'block' | 'recipient' | 'project' | 'others' | 'expenditure' | 'unknown';

// サンキー図のノード
export interface SankeyNode {
  id: string;
  name: string;
  type: NodeType;
  metadata?: {
    eventId?: number;
    eventName?: string;
    projectId?: number;
    budget?: number;
    execution?: number;
    executionRate?: number;
    ministry?: string;
    location?: string;
    corporateNumber?: string;
    amount?: number;
  };
}

// サンキー図のリンク
export interface SankeyLink {
  source: string; // source node id
  target: string; // target node id
  value: number;  // 金額
  metadata?: {
    contractType?: string;
    bidders?: number;
    fallRate?: number;
    role?: string;
  };
}

// サンキー図の完全なデータ構造
export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

// D3 Sankeyライブラリが使用する拡張ノード型
export interface D3SankeyNode extends SankeyNode {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  value?: number;
  index?: number;
  depth?: number;
  height?: number;
  sourceLinks?: D3SankeyLink[];
  targetLinks?: D3SankeyLink[];
}

// D3 Sankeyライブラリが使用する拡張リンク型
export interface D3SankeyLink extends Omit<SankeyLink, 'source' | 'target'> {
  source: D3SankeyNode | string;
  target: D3SankeyNode | string;
  width?: number;
  y0?: number;
  y1?: number;
  index?: number;
}

// サンキー図の表示設定
export interface SankeyDisplayConfig {
  width: number;
  height: number;
  nodeWidth: number;
  nodePadding: number;
  colorScheme: string[];
}
