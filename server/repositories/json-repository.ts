import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import type { Year } from '@/types/rs-system';
import type { SankeyData } from '@/types/sankey';

/**
 * 事前処理済みデータのベースパス
 */
const DATA_BASE_PATH = path.join(process.cwd(), 'public', 'data');

/**
 * JSONファイルを読み込む
 */
async function readJSON<T>(filePath: string): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error reading JSON file ${filePath}:`, error);
    throw new Error(`Failed to read JSON file: ${filePath}`);
  }
}

/**
 * 年度のディレクトリが存在するか確認
 */
export async function checkYearDataExists(year: Year): Promise<boolean> {
  try {
    const dirPath = path.join(DATA_BASE_PATH, `year_${year}`);
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * サンキー図データを取得
 */
export async function getSankeyData(year: Year): Promise<SankeyData> {
  const filePath = path.join(DATA_BASE_PATH, `year_${year}`, 'sankey.json');
  return readJSON<SankeyData>(filePath);
}

/**
 * 統計情報を取得
 */
export async function getStatistics(year: Year) {
  const filePath = path.join(DATA_BASE_PATH, `year_${year}`, 'statistics.json');
  return readJSON<{
    totalBudget: number;
    totalExecution: number;
    averageExecutionRate: number;
    eventCount: number;
    ministryCount: number;
  }>(filePath);
}

/**
 * 府省庁リストを取得
 */
export async function getMinistries(year: Year): Promise<string[]> {
  const filePath = path.join(DATA_BASE_PATH, `year_${year}`, 'ministries.json');
  return readJSON<string[]>(filePath);
}

/**
 * 府省庁別事業データを取得
 */
export async function getMinistryProjects(year: Year) {
  const filePath = path.join(DATA_BASE_PATH, `year_${year}`, 'ministry-projects.json');
  return readJSON<Record<string, {
    top10: Array<{ name: string; amount: number }>;
    othersTotal: number;
    totalProjects: number;
  }>>(filePath);
}

/**
 * 利用可能な年度のリストを取得
 */
export async function getAvailableYears(): Promise<Year[]> {
  const years: Year[] = [];

  for (let year = 2014; year <= 2024; year++) {
    if (await checkYearDataExists(year as Year)) {
      years.push(year as Year);
    }
  }

  return years;
}
