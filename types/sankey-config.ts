/**
 * サンキー図の表示設定
 */

export interface SankeyConfig {
  // Top N設定
  topProjectsCount: number; // Top N事業の数（デフォルト: 20）

  // 府省庁の閾値設定
  ministryThreshold: number; // 府省庁予算の閾値（円単位、デフォルト: 1000億円 = 100000000000）
  ministryThresholdType: 'absolute' | 'percentage'; // 閾値タイプ（絶対値 or 割合）
  ministryThresholdPercentage: number; // 閾値（割合、デフォルト: 1% = 0.01）

  // 色分け設定
  coloredMinistriesCount: number; // 色分けする府省庁数（デフォルト: 10）
  ministryColorMapping: Record<string, string>; // 府省庁名 → 色のマッピング
}

// デフォルト設定
export const DEFAULT_SANKEY_CONFIG: SankeyConfig = {
  topProjectsCount: 20,
  ministryThreshold: 100000000000, // 1000億円
  ministryThresholdType: 'percentage',
  ministryThresholdPercentage: 0.01, // 1%
  coloredMinistriesCount: 20,
  ministryColorMapping: {
    // デフォルトの色マッピング（d3.schemeCategory10 + Tableau10拡張、グレー系を避ける）
    '厚生労働省': '#1f77b4', // 青
    '国土交通省': '#ff7f0e', // オレンジ
    '防衛省': '#2ca02c', // 緑
    'こども家庭庁': '#d62728', // 赤
    '文部科学省': '#9467bd', // 紫
    '農林水産省': '#8c564b', // 茶
    '経済産業省': '#e377c2', // ピンク
    '内閣府': '#17becf', // シアン
    '外務省': '#bcbd22', // 黄緑
    'デジタル庁': '#ff9896', // ライトレッド
    '総務省': '#aec7e8', // ライトブルー
    '法務省': '#ffbb78', // ライトオレンジ
    '財務省': '#98df8a', // ライトグリーン
    '環境省': '#ff9896', // ライトレッド2
    '復興庁': '#c5b0d5', // ライトパープル
    '会計検査院': '#c49c94', // ライトブラウン
    '裁判所': '#f7b6d2', // ライトピンク
    '国会': '#dbdb8d', // ライトイエロー
    '内閣': '#9edae5', // ライトシアン
    '人事院': '#fdd0a2', // ライトピーチ
  },
};

// LocalStorageのキー
export const SANKEY_CONFIG_STORAGE_KEY = 'rs_system_sankey_config';
