import 'server-only';
import type { Year } from '@/types/rs-system';
import type { SankeyData } from '@/types/sankey';
import {
  getSankeyData,
  getStatistics,
  getMinistries,
  getMinistryProjects,
} from '../repositories/json-repository';

/**
 * 指定年度のサンキー図データを取得（事前処理済みJSON版）
 */
export async function loadPreprocessedSankeyData(year: Year): Promise<SankeyData> {
  return getSankeyData(year);
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
