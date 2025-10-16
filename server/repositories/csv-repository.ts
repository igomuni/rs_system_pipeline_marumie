import 'server-only';
import path from 'path';
import fs from 'fs/promises';
import type { Year } from '@/types/rs-system';
import type {
  BudgetSummary,
  ExpenditureInfo,
  ExpenditureConnection,
} from '@/types/rs-system';
import { parseCSV } from '../lib/csv-parser';

/**
 * データディレクトリのベースパス
 */
const DATA_BASE_PATH = path.join(process.cwd(), 'data', 'rs_system');

/**
 * 年度のディレクトリパスを取得
 */
function getYearDirectory(year: Year): string {
  return path.join(DATA_BASE_PATH, `year_${year}`);
}

/**
 * CSVファイルのパスを取得
 */
function getCSVFilePath(year: Year, fileName: string): string {
  return path.join(getYearDirectory(year), fileName);
}

/**
 * 指定年度のディレクトリが存在するか確認
 */
export async function checkYearDirectoryExists(year: Year): Promise<boolean> {
  try {
    const dirPath = getYearDirectory(year);
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 予算・執行サマリデータを取得
 */
export async function getBudgetSummary(year: Year): Promise<BudgetSummary[]> {
  const fileName = year === 2024
    ? `2-1_RS_${year}_予算・執行_サマリ.csv`
    : `2-1_${year}_予算・執行_サマリ.csv`;

  const filePath = getCSVFilePath(year, fileName);
  return parseCSV<BudgetSummary>(filePath);
}

/**
 * 支出先情報を取得
 */
export async function getExpenditureInfo(year: Year): Promise<ExpenditureInfo[]> {
  const fileName = year === 2024
    ? `5-1_RS_${year}_支出先_支出情報.csv`
    : `5-1_${year}_支出先_支出情報.csv`;

  const filePath = getCSVFilePath(year, fileName);
  return parseCSV<ExpenditureInfo>(filePath);
}

/**
 * 支出ブロックのつながりデータを取得
 */
export async function getExpenditureConnections(year: Year): Promise<ExpenditureConnection[]> {
  const fileName = year === 2024
    ? `5-2_RS_${year}_支出先_支出ブロックのつながり.csv`
    : null; // 2023年以前にはこのファイルが存在しない可能性がある

  if (!fileName) {
    return [];
  }

  const filePath = getCSVFilePath(year, fileName);

  try {
    return await parseCSV<ExpenditureConnection>(filePath);
  } catch (error) {
    console.warn(`File not found or error reading: ${fileName}`);
    return [];
  }
}

/**
 * 指定年度の全データを取得
 */
export async function getAllDataForYear(year: Year) {
  const [budgetSummary, expenditureInfo, expenditureConnections] = await Promise.all([
    getBudgetSummary(year),
    getExpenditureInfo(year),
    getExpenditureConnections(year),
  ]);

  return {
    budgetSummary,
    expenditureInfo,
    expenditureConnections,
  };
}

/**
 * 利用可能な年度のリストを取得
 */
export async function getAvailableYears(): Promise<Year[]> {
  const years: Year[] = [];

  for (let year = 2014; year <= 2024; year++) {
    if (await checkYearDirectoryExists(year as Year)) {
      years.push(year as Year);
    }
  }

  return years;
}
