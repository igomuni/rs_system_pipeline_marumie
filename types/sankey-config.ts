/**
 * サンキー図の表示設定
 */

import type { TopNConfig } from './sankey';

export interface SankeyConfig {
  // Top N設定（レガシー、後方互換性のため残す）
  topProjectsCount: number; // Top N事業の数（デフォルト: 20）

  // TopN設定（6列サンキー図用）
  topN: TopNConfig;

  // 府省庁の閾値設定
  ministryThreshold: number; // 府省庁予算の閾値（円単位、デフォルト: 1000億円 = 100000000000）
  ministryThresholdType: 'absolute' | 'percentage'; // 閾値タイプ（絶対値 or 割合）
  ministryThresholdPercentage: number; // 閾値（割合、デフォルト: 1% = 0.01）

  // 色分け設定
  ministryColorMapping: Record<string, string>; // 府省庁名 → 色のマッピング
  othersColor: string; // TopN以外の「残りN」「その他」の色（デフォルト: グレー）
  differenceColor: string; // 差額ノードの色（デフォルト: グレー）
  totalColor: string; // 総計ノードの色（デフォルト: グレー）
}

// デフォルト設定
export const DEFAULT_SANKEY_CONFIG: SankeyConfig = {
  topProjectsCount: 20,
  topN: {
    mainTopProjects: 3,
    mainTopExpenditures: 3,
    ministryTopProjects: 10,
    ministryTopExpenditures: 10,
    projectTopExpenditures: 20,
    expenditureTopProjects: 30,
  },
  ministryThreshold: 100000000000, // 1000億円
  ministryThresholdType: 'percentage',
  ministryThresholdPercentage: 0.01, // 1%
  ministryColorMapping: {
    // 2024年度予算額降順（全年度の府省庁を網羅）
    '厚生労働省': '#1f77b4',
    '国土交通省': '#ff7f0e',
    '防衛省': '#2ca02c',
    'こども家庭庁': '#d62728',
    '文部科学省': '#9467bd',
    '農林水産省': '#8c564b',
    '経済産業省': '#e377c2',
    '内閣府': '#17becf',
    '外務省': '#bcbd22',
    'デジタル庁': '#ff9896',
    '復興庁': '#aec7e8',
    '財務省': '#ffbb78',
    '環境省': '#98df8a',
    '総務省': '#c49c94',
    '林野庁': '#c5b0d5',
    '法務省': '#f7b6d2',
    '国土交通省海上保安庁': '#dbdb8d',
    '水産庁': '#9edae5',
    '警察庁': '#fdd0a2',
    '特許庁': '#b4d7a8',
    '文化庁': '#d5a6bd',
    '国土交通省観光庁': '#a6bddb',
    '内閣官房': '#fdae6b',
    '原子力規制委員会': '#74c476',
    'スポーツ庁': '#fd8d3c',
    '国土交通省気象庁': '#6baed6',
    '消防庁': '#fc4e2a',
    '消費者庁': '#e7298a',
    '国税庁': '#addd8e',
    '公正取引委員会': '#969696',
    '金融庁': '#41ab5d',
    '個人情報保護委員会': '#feb24c',
    '公安調査庁': '#756bb1',
    '中央労働委員会': '#54278f',
    '国土交通省運輸安全委員会': '#9e9ac8',
    'カジノ管理委員会': '#de2d26',
    '公害等調整委員会': '#31a354',
    // 過去年度のみ存在する府省庁
    '国家公安委員会（警察庁）': '#fdd0a2',
    '中小企業庁': '#bcbd22',
  },
  othersColor: '#6b7280', // グレー
  differenceColor: '#9ca3af', // グレー（差額ノード用）
  totalColor: '#94a3b8', // グレー系（総計ノード用）
};

// LocalStorageのキー
export const SANKEY_CONFIG_STORAGE_KEY = 'rs_system_sankey_config';

// 府省庁の予算額（2024年度ベース、ソート用）
export const MINISTRY_BUDGET_2024: Record<string, number> = {
  '厚生労働省': 91802833319000,
  '国土交通省': 5513090394000,
  '防衛省': 5457196073725,
  'こども家庭庁': 5263722335000,
  '文部科学省': 5102315196000,
  '農林水産省': 2165511955000,
  '経済産業省': 1696982864000,
  '内閣府': 531694035000,
  '外務省': 483783535000,
  'デジタル庁': 481285121000,
  '復興庁': 459624949000,
  '財務省': 400100774000,
  '環境省': 311677889000,
  '総務省': 282418804000,
  '林野庁': 210335179000,
  '法務省': 168353074000,
  '国土交通省海上保安庁': 144040487000,
  '水産庁': 136177986000,
  '警察庁': 129438009000,
  '特許庁': 106969363000,
  '文化庁': 102046050999,
  '国土交通省観光庁': 49917288000,
  '内閣官房': 34731851000,
  '原子力規制委員会': 32777857000,
  'スポーツ庁': 31569119000,
  '国土交通省気象庁': 12860564000,
  '消防庁': 9174687000,
  '消費者庁': 8773475000,
  '国税庁': 6614535000,
  '公正取引委員会': 1482236000,
  '金融庁': 1324401000,
  '個人情報保護委員会': 826992000,
  '公安調査庁': 808888000,
  '中央労働委員会': 280406000,
  '国土交通省運輸安全委員会': 156816000,
  'カジノ管理委員会': 103500000,
  '公害等調整委員会': 49599000,
  // 過去年度のみ存在（推定値）
  '国家公安委員会（警察庁）': 130000000000,
  '中小企業庁': 610000000,
};
