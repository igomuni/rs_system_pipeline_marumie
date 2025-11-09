import 'server-only';
import type { Year } from '@/types/rs-system';
import type { SankeyData } from '@/types/sankey';
import { getAllDataForYear } from '../repositories/csv-repository';
import { transformToSankeyData, transformToThreeColumnSankeyData, getMinistryList } from '../lib/sankey-transformer';

/**
 * 指定年度のサンキー図データを取得
 */
export async function loadSankeyDataForYear(
  year: Year,
  options?: {
    ministryFilter?: string;
    maxNodes?: number;
  }
): Promise<SankeyData> {
  const data = await getAllDataForYear(year);

  return transformToSankeyData(
    data.expenditureInfo,
    data.expenditureConnections,
    data.budgetSummary,
    options
  );
}

/**
 * 指定年度の府省庁リストを取得
 */
export async function loadMinistryListForYear(year: Year): Promise<string[]> {
  const data = await getAllDataForYear(year);
  return getMinistryList(data.budgetSummary);
}

/**
 * 指定年度の3列構成サンキー図データを取得
 */
export async function loadThreeColumnSankeyDataForYear(
  year: Year,
  options?: {
    ministryFilter?: string;
    topProjectsPerMinistry?: number;
  }
): Promise<SankeyData> {
  const data = await getAllDataForYear(year);

  return transformToThreeColumnSankeyData(
    data.budgetSummary,
    options
  );
}

/**
 * 指定年度の統計情報を取得
 */
export async function loadStatisticsForYear(year: Year) {
  const data = await getAllDataForYear(year);

  const totalBudget = data.budgetSummary.reduce(
    (sum, item) => sum + (item['当初予算(合計)'] || 0),
    0
  );

  const totalExecution = data.budgetSummary.reduce(
    (sum, item) => sum + (item['執行額(合計)'] || 0),
    0
  );

  const averageExecutionRate =
    data.budgetSummary
      .filter(item => item.執行率)
      .reduce((sum, item) => sum + (item.執行率 || 0), 0) /
    data.budgetSummary.filter(item => item.執行率).length;

  const eventCount = new Set(data.budgetSummary.map(item => item.予算事業ID)).size;

  const ministryCount = new Set(data.budgetSummary.map(item => item.府省庁)).size;

  return {
    year,
    totalBudget,
    totalExecution,
    averageExecutionRate: isNaN(averageExecutionRate) ? 0 : averageExecutionRate,
    eventCount,
    ministryCount,
  };
}
