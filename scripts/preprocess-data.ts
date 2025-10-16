/**
 * ビルド時にCSVデータを事前処理してJSONに変換するスクリプト
 */
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { Year } from '../types/rs-system';
import type { SankeyData } from '../types/sankey';

const DATA_BASE_PATH = path.join(process.cwd(), 'data', 'rs_system');
const OUTPUT_BASE_PATH = path.join(process.cwd(), 'public', 'data');

const AVAILABLE_YEARS: Year[] = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

/**
 * CSVファイルを読み込んでパース
 */
async function parseCSV<T>(filePath: string): Promise<T[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const contentWithoutBOM = fileContent.replace(/^\uFEFF/, '');

    const records = parse(contentWithoutBOM, {
      columns: true,
      skip_empty_lines: true,
      cast: true,
      cast_date: false,
      trim: true,
      relax_column_count: true,
    });

    return records as T[];
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    return [];
  }
}

/**
 * 年度のディレクトリが存在するか確認
 */
async function checkYearDirectoryExists(year: Year): Promise<boolean> {
  try {
    const dirPath = path.join(DATA_BASE_PATH, `year_${year}`);
    await fs.access(dirPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * CSVファイル名を取得
 */
function getCSVFileName(year: Year, fileType: string): string {
  if (year === 2024) {
    return `${fileType}_RS_${year}_`;
  }
  return `${fileType}_${year}_`;
}

/**
 * 年度のデータを処理してサンキー図データを生成
 */
async function processYearData(year: Year) {
  console.log(`Processing year ${year}...`);

  const yearDir = path.join(DATA_BASE_PATH, `year_${year}`);

  // 必要なCSVファイルを読み込む
  const budgetFileName = year === 2024
    ? `2-1_RS_${year}_予算・執行_サマリ.csv`
    : `2-1_${year}_予算・執行_サマリ.csv`;

  const expenditureFileName = year === 2024
    ? `5-1_RS_${year}_支出先_支出情報.csv`
    : `5-1_${year}_支出先_支出情報.csv`;

  const connectionFileName = year === 2024
    ? `5-2_RS_${year}_支出先_支出ブロックのつながり.csv`
    : null;

  const [budgetData, expenditureData, connectionData] = await Promise.all([
    parseCSV(path.join(yearDir, budgetFileName)),
    parseCSV(path.join(yearDir, expenditureFileName)),
    connectionFileName
      ? parseCSV(path.join(yearDir, connectionFileName))
      : Promise.resolve([]),
  ]);

  console.log(`  - Budget records: ${budgetData.length}`);
  console.log(`  - Expenditure records: ${expenditureData.length}`);
  console.log(`  - Connection records: ${connectionData.length}`);

  // 簡易版のサンキーデータを生成（府省庁ごとに集約）
  const sankeyData = generateSimplifiedSankeyData(
    budgetData,
    expenditureData,
    connectionData,
    year
  );

  // 統計情報を計算
  const statistics = calculateStatistics(budgetData, year);

  // 府省庁リストを抽出
  const ministries = extractMinistries(budgetData, year);

  // 府省庁ごとの事業データを生成
  const ministryProjects = generateMinistryProjectsData(budgetData, year);

  // 結果をJSONファイルとして保存
  const outputDir = path.join(OUTPUT_BASE_PATH, `year_${year}`);
  await fs.mkdir(outputDir, { recursive: true });

  await Promise.all([
    fs.writeFile(
      path.join(outputDir, 'sankey.json'),
      JSON.stringify(sankeyData, null, 2)
    ),
    fs.writeFile(
      path.join(outputDir, 'statistics.json'),
      JSON.stringify(statistics, null, 2)
    ),
    fs.writeFile(
      path.join(outputDir, 'ministries.json'),
      JSON.stringify(ministries, null, 2)
    ),
    fs.writeFile(
      path.join(outputDir, 'ministry-projects.json'),
      JSON.stringify(ministryProjects, null, 2)
    ),
  ]);

  console.log(`  ✓ Saved preprocessed data for year ${year}`);
}

/**
 * 金額を正規化（2014-2023は百万円単位、2024は1円単位）
 */
function normalizeAmount(amount: number, year: Year): number {
  if (!amount) return 0;
  // 2014-2023年は百万円単位なので、1円単位に変換
  if (year <= 2023) {
    return amount * 1000000;
  }
  return amount;
}

/**
 * サンキーデータを生成（年度予算合計 → 府省庁ごとの予算）
 */
function generateSimplifiedSankeyData(
  budgetData: any[],
  expenditureData: any[],
  connectionData: any[],
  year: Year
): SankeyData {
  const nodes: any[] = [];
  const links: any[] = [];

  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 府省庁ごとに予算を集約
  const ministryBudgets = new Map<string, number>();
  let totalBudget = 0;

  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    if (!ministry) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    ministryBudgets.set(ministry, (ministryBudgets.get(ministry) || 0) + budgetAmount);
    totalBudget += budgetAmount;
  });

  // 左側に年度予算合計ノードを1つ追加
  const totalBudgetNode = {
    id: 'total_budget',
    name: `${year}年度予算`,
    type: 'total',
    metadata: { budget: totalBudget },
  };
  nodes.push(totalBudgetNode);

  // 右側に府省庁ノードを追加（金額の降順）
  let nodeIndex = 0;
  const sortedMinistries = Array.from(ministryBudgets.entries())
    .sort(([, a], [, b]) => b - a); // 金額の降順でソート

  sortedMinistries.forEach(([ministry, budget]) => {
    const ministryNode = {
      id: `ministry_${nodeIndex++}`,
      name: ministry,
      type: 'ministry',
      metadata: { ministry, budget },
    };
    nodes.push(ministryNode);

    // 年度予算合計から各府省庁へのリンクを追加
    links.push({
      source: totalBudgetNode.id,
      target: ministryNode.id,
      value: budget,
    });
  });

  return {
    nodes,
    links,
  };
}

/**
 * 府省庁ごとの事業データを生成（Top10 + その他）
 */
function generateMinistryProjectsData(budgetData: any[], year: Year) {
  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 府省庁 → 事業名ごとの予算を集約
  const ministryProjects = new Map<string, Map<string, number>>();

  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    const projectName = budget.事業名;
    if (!ministry || !projectName) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (!ministryProjects.has(ministry)) {
      ministryProjects.set(ministry, new Map<string, number>());
    }
    const projects = ministryProjects.get(ministry)!;
    projects.set(projectName, (projects.get(projectName) || 0) + budgetAmount);
  });

  // 各府省庁のTop10事業を抽出
  const result: Record<string, any> = {};

  ministryProjects.forEach((projects, ministry) => {
    const sortedProjects = Array.from(projects.entries())
      .sort(([, a], [, b]) => b - a);

    const top10 = sortedProjects.slice(0, 10);
    const others = sortedProjects.slice(10);
    const othersTotal = others.reduce((sum, [, amount]) => sum + amount, 0);

    result[ministry] = {
      top10: top10.map(([name, amount]) => ({ name, amount })),
      othersTotal,
      totalProjects: sortedProjects.length,
    };
  });

  return result;
}

/**
 * 統計情報を計算
 */
function calculateStatistics(budgetData: any[], year: Year) {
  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  const totalBudget = currentYearBudgetData.reduce(
    (sum, item) => sum + normalizeAmount(item['当初予算(合計)'] || item['当初予算（合計）'] || 0, year),
    0
  );

  const totalExecution = currentYearBudgetData.reduce(
    (sum, item) => sum + normalizeAmount(item['執行額(合計)'] || item['執行額（合計）'] || 0, year),
    0
  );

  const validRates = currentYearBudgetData.filter((item) => item.執行率);
  const averageExecutionRate =
    validRates.length > 0
      ? validRates.reduce((sum, item) => sum + (item.執行率 || 0), 0) / validRates.length
      : 0;

  const eventCount = new Set(currentYearBudgetData.map((item) => item.予算事業ID)).size;
  const ministryCount = new Set(currentYearBudgetData.map((item) => item.府省庁)).size;

  return {
    totalBudget,
    totalExecution,
    averageExecutionRate,
    eventCount,
    ministryCount,
  };
}

/**
 * 府省庁リストを抽出
 */
function extractMinistries(budgetData: any[], year: Year): string[] {
  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  const ministries = new Set<string>();
  currentYearBudgetData.forEach((budget) => {
    if (budget.府省庁) {
      ministries.add(budget.府省庁);
    }
  });
  return Array.from(ministries).sort();
}

/**
 * メイン処理
 */
async function main() {
  console.log('Starting data preprocessing...\n');

  for (const year of AVAILABLE_YEARS) {
    const exists = await checkYearDirectoryExists(year);
    if (exists) {
      await processYearData(year);
    } else {
      console.log(`Skipping year ${year} (directory not found)`);
    }
  }

  console.log('\n✓ Data preprocessing completed!');
}

main().catch((error) => {
  console.error('Error during preprocessing:', error);
  process.exit(1);
});
