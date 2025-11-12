import 'server-only';
import type { Year } from '@/types/rs-system';
import type { SankeyData } from '@/types/sankey';
import {
  getSankeyData,
  getStatistics,
  getMinistries,
  getMinistryProjects,
  getProjectExpenditures,
} from '../repositories/json-repository';

/**
 * 指定年度のサンキー図データを取得（事前処理済みJSON版、レガシー3列）
 */
export async function loadPreprocessedSankeyData(year: Year): Promise<SankeyData> {
  return getSankeyData(year);
}

/**
 * 指定年度の6列メインサンキー図データを取得（事前処理済みJSON版）
 */
export async function loadPreprocessedSankeyMainData(year: Year): Promise<SankeyData> {
  const path = `public/data/year_${year}/sankey-main.json`;
  try {
    const fs = await import('fs/promises');
    const data = await fs.readFile(path, 'utf-8');
    return JSON.parse(data) as SankeyData;
  } catch (error) {
    console.error(`Failed to load sankey-main.json for year ${year}:`, error);
    // フォールバック: 既存の3列データを返す
    return getSankeyData(year);
  }
}

/**
 * 指定年度の府省庁リストを取得（事前処理済みJSON版）
 */
export async function loadPreprocessedMinistries(
  year: Year
): Promise<Array<{ name: string; budget: number }>> {
  return getMinistries(year);
}

/**
 * 指定年度の統計情報を取得（事前処理済みJSON版）
 */
export async function loadPreprocessedStatistics(year: Year) {
  return getStatistics(year);
}

/**
 * 指定年度の府省庁別事業データを取得（事前処理済みJSON版）
 */
export async function loadPreprocessedMinistryProjects(year: Year) {
  return getMinistryProjects(year);
}

/**
 * 指定年度の事業別支出データを取得（事前処理済みJSON版）
 */
export async function loadPreprocessedProjectExpenditures(year: Year) {
  return getProjectExpenditures(year);
}
