/**
 * レポート機能の型定義
 */
import type { Year } from './rs-system';

/**
 * 事業の年度横断データ（事業名がキー）
 */
export interface ProjectTimeSeriesData {
  projectName: string; // 事業名（主キー）
  projectKey: string; // URLセーフなキー（事業名のハッシュ）
  ministry: string; // 府省庁
  startYear: Year | null; // 事業開始年度（1-2から取得）
  endYear: Year | null; // 事業終了予定年度（1-2から取得）
  yearlyData: {
    // 年度別データ
    [year: number]: {
      projectId: number; // その年度の予算事業ID
      budget: number; // 当初予算（円）
      execution: number; // 執行額（円）
      executionRate?: number; // 執行率（0-1の小数）
    };
  };
  topExpenditures: ExpenditureTimeSeries[]; // 支出先Top10の推移
}

/**
 * 支出先の時系列データ
 */
export interface ExpenditureTimeSeries {
  name: string; // 支出先名
  totalAmount: number; // 全年度累計金額（円）
  yearCount: number; // 支出があった年度数
  yearlyAmounts: {
    // 年度別支出額
    [year: number]: number;
  };
}

/**
 * レポート表示用データ
 */
export interface ProjectReportData {
  project: ProjectTimeSeriesData;
  budgetTrend: BudgetTrendPoint[];
  expenditureTrend: ExpenditureGroupTrend[];
}

/**
 * 予算推移データポイント
 */
export interface BudgetTrendPoint {
  year: Year;
  budget: number;
  execution: number;
  executionRate?: number;
}

/**
 * 支出先グループの推移データ
 */
export interface ExpenditureGroupTrend {
  expenditureName: string;
  data: Array<{
    year: Year;
    amount: number;
  }>;
}

/**
 * 事業インデックス（検索用）
 */
export interface ProjectIndexItem {
  projectKey: string; // URLセーフなキー
  projectName: string;
  ministry: string;
  startYear: Year | null; // 事業開始年度（1-2から）
  endYear: Year | null; // 事業終了予定年度（1-2から）
  dataStartYear: Year; // データが存在する最初の年度
  dataEndYear: Year; // データが存在する最後の年度
  totalBudget: number; // 全期間の予算合計
  averageBudget: number; // 年平均予算
  yearlyBudgets: Record<number, number>; // 年度別予算（フィルタリング用）
}
