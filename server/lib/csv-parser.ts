import 'server-only';
import { parse } from 'csv-parse/sync';
import fs from 'fs/promises';

/**
 * CSVファイルを読み込んでパースする
 */
export async function parseCSV<T>(filePath: string): Promise<T[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // BOM（Byte Order Mark）を削除
    const contentWithoutBOM = fileContent.replace(/^\uFEFF/, '');

    const records = parse(contentWithoutBOM, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      cast_date: false,
      trim: true,
      // 矢印記号を削除（CSVデータに含まれる行番号の矢印）
      relax_column_count: true,
    });

    return records as T[];
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    throw new Error(`Failed to parse CSV file: ${filePath}`);
  }
}

/**
 * 複数のCSVファイルを並列で読み込む
 */
export async function parseMultipleCSV<T>(filePaths: string[]): Promise<T[][]> {
  try {
    const results = await Promise.all(filePaths.map(path => parseCSV<T>(path)));
    return results;
  } catch (error) {
    console.error('Error parsing multiple CSV files:', error);
    throw error;
  }
}

/**
 * CSVファイルの先頭N行だけを読み込む（パフォーマンス最適化用）
 */
export async function parseCSVWithLimit<T>(
  filePath: string,
  limit: number
): Promise<T[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const contentWithoutBOM = fileContent.replace(/^\uFEFF/, '');

    const records = parse(contentWithoutBOM, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      cast_date: false,
      trim: true,
      to: limit,
    });

    return records as T[];
  } catch (error) {
    console.error(`Error parsing CSV file with limit ${filePath}:`, error);
    throw new Error(`Failed to parse CSV file: ${filePath}`);
  }
}
