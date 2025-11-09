/**
 * 支出先データをクライアント側で動的にロード
 */
import type { Year } from '@/types/rs-system';

export interface ExpenditureData {
  [projectId: string]: {
    projectId: number;
    projectName: string;
    budget: number;
    top20Expenditures: Array<{ name: string; amount: number }>;
    othersTotal: number;
    totalExpenditureAmount: number;
    unknownAmount: number;
  };
}

// キャッシュ用
const expenditureCache = new Map<Year, ExpenditureData>();

/**
 * 指定年度の支出先データをロード
 */
export async function loadExpenditureData(year: Year): Promise<ExpenditureData> {
  // キャッシュから取得
  if (expenditureCache.has(year)) {
    return expenditureCache.get(year)!;
  }

  // ファイルからロード
  const response = await fetch(`/data/year_${year}/project-expenditures.json`);
  if (!response.ok) {
    throw new Error(`Failed to load expenditure data for year ${year}`);
  }

  const data: ExpenditureData = await response.json();

  // キャッシュに保存
  expenditureCache.set(year, data);

  return data;
}

/**
 * 特定の事業の支出先データを取得
 */
export async function getProjectExpenditures(
  year: Year,
  projectId: number
): Promise<{ name: string; amount: number }[]> {
  const data = await loadExpenditureData(year);
  const projectData = data[projectId];

  if (!projectData) {
    return [];
  }

  return projectData.top20Expenditures || [];
}
