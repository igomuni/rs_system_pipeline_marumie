/**
 * サンキー図用のデータ型定義
 */

// ノードの種類
export type NodeType =
  | 'total'        // 総計ノード
  | 'ministry'     // 府省庁ノード
  | 'block'        // ブロックノード（支出先のブロック）
  | 'recipient'    // 受取先ノード
  | 'project'      // 事業ノード
  | 'others'       // その他集約ノード
  | 'expenditure'  // 支出先ノード
  | 'difference'   // 差額ノード（予算と支出の差額）
  | 'unknown';     // 不明なノード

// サンキー図のノード
export interface SankeyNode {
  id: string;
  name: string;
  type: NodeType;
  column?: number; // ノードの列位置（0始まり）
  metadata?: {
    eventId?: number;
    eventName?: string;
    projectId?: number;
    projectName?: string;
    budget?: number;
    execution?: number;
    executionRate?: number;
    ministry?: string;
    ministries?: string[]; // その他府省庁に含まれる府省庁リスト
    location?: string;
    corporateNumber?: string;
    amount?: number;
    projectCount?: number;
    expenditureName?: string; // 支出先名
    expenditureList?: Array<{ name: string; amount: number }>; // 残り支出先の全リスト（モーダル表示用）
    ministryList?: Array<{ name: string; budget: number }>; // 小規模府省庁の全リスト（モーダル表示用）
    projectList?: Array<{ name: string; budget: number; ministry?: string; eventId?: number }>; // 残り事業の全リスト（モーダル表示用）
    differenceData?: DifferenceNodeData; // 差額ノードの詳細情報
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

// ビューモード（画面種別）
export type ViewMode =
  | 'main'                  // メイン画面 (6列)
  | 'ministry-breakdown'    // 省庁ブレイクダウン (4列)
  | 'project-breakdown'     // 事業ブレイクダウン (3列)
  | 'expenditure-breakdown'; // 支出ブレイクダウン (3列)

// ビュー設定
export interface SankeyViewConfig {
  mode: ViewMode;
  targetMinistry?: string;    // 省庁ブレイクダウン時の対象府省庁
  targetProjectKey?: string;  // 事業ブレイクダウン時の対象事業キー
  targetExpenditure?: string; // 支出ブレイクダウン時の対象支出先
}

// TopN設定
export interface TopNConfig {
  // メイン画面
  mainTopProjects: number;        // デフォルト: 3
  mainTopExpenditures: number;    // デフォルト: 3

  // 省庁ブレイクダウン
  ministryTopProjects: number;    // デフォルト: 10
  ministryTopExpenditures: number; // デフォルト: 10

  // 事業ブレイクダウン
  projectTopExpenditures: number;  // デフォルト: 20

  // 支出ブレイクダウン
  expenditureTopProjects: number;  // デフォルト: 30
}

// ソート設定
export interface SortConfig {
  column: number;           // 列番号
  order: 'asc' | 'desc';   // ソート順
  othersAtBottom: boolean; // TopN以外を最下部に配置
}

// デフォルトTopN設定
export const DEFAULT_TOPN_CONFIG: TopNConfig = {
  mainTopProjects: 3,
  mainTopExpenditures: 3,
  ministryTopProjects: 10,
  ministryTopExpenditures: 10,
  projectTopExpenditures: 20,
  expenditureTopProjects: 30,
};

// 差額ノード情報
export interface DifferenceNodeData {
  budgetTotal: number;      // 予算総額
  executionTotal: number;   // 執行総額
  difference: number;       // 差額の絶対値
  direction: 'budget-excess' | 'execution-excess'; // どちらが多いか
}
