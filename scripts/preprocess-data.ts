/**
 * ビルド時にCSVデータを事前処理してJSONに変換するスクリプト
 */
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { Year } from '../types/rs-system';
import type { SankeyData } from '../types/sankey';
import type { ProjectTimeSeriesData, ProjectIndexItem, ExpenditureTimeSeries } from '../types/report';

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
  const ministryProjects = generateMinistryProjectsData(budgetData, expenditureData, year);

  // 事業ごとの支出先データを生成
  const projectExpenditures = generateProjectExpendituresData(budgetData, expenditureData, year);

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
    fs.writeFile(
      path.join(outputDir, 'project-expenditures.json'),
      JSON.stringify(projectExpenditures, null, 2)
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
function generateMinistryProjectsData(budgetData: any[], expenditureData: any[], year: Year) {
  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 府省庁 → 事業ごとの予算を集約（予算事業IDをキーとして保持）
  const ministryProjects = new Map<string, Map<number, { name: string; budget: number }>>();

  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    const projectName = budget.事業名;
    const projectId = budget.予算事業ID;
    if (!ministry || !projectName || !projectId) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (!ministryProjects.has(ministry)) {
      ministryProjects.set(ministry, new Map<number, { name: string; budget: number }>());
    }
    const projects = ministryProjects.get(ministry)!;

    if (projects.has(projectId)) {
      const existing = projects.get(projectId)!;
      existing.budget += budgetAmount;
    } else {
      projects.set(projectId, { name: projectName, budget: budgetAmount });
    }
  });

  // 各府省庁のTop10事業を抽出
  const result: Record<string, any> = {};

  ministryProjects.forEach((projects, ministry) => {
    const sortedProjects = Array.from(projects.entries())
      .sort(([, a], [, b]) => b.budget - a.budget);

    const top10 = sortedProjects.slice(0, 10);
    const others = sortedProjects.slice(10);
    const othersTotal = others.reduce((sum, [, project]) => sum + project.budget, 0);

    result[ministry] = {
      top10: top10.map(([projectId, project]) => ({
        projectId,
        name: project.name,
        budget: project.budget
      })),
      othersTotal,
      totalProjects: sortedProjects.length,
    };
  });

  return result;
}

/**
 * 事業ごとの支出先データを生成（府省庁別Top10事業のみ）
 */
function generateProjectExpendituresData(budgetData: any[], expenditureData: any[], year: Year) {
  // 府省庁別Top10を取得するため、まず予算データを集約
  const ministryProjects = new Map<string, Map<number, { name: string; budget: number }>>();

  const currentYearBudgetData = budgetData.filter((budget) => budget.予算年度 === year);

  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    const projectId = budget.予算事業ID;
    const projectName = budget.事業名;
    if (!ministry || !projectId || !projectName) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (!ministryProjects.has(ministry)) {
      ministryProjects.set(ministry, new Map());
    }
    const projects = ministryProjects.get(ministry)!;

    if (projects.has(projectId)) {
      projects.get(projectId)!.budget += budgetAmount;
    } else {
      projects.set(projectId, { name: projectName, budget: budgetAmount });
    }
  });

  // Top10事業のIDセットを作成
  const top10ProjectIds = new Set<number>();

  ministryProjects.forEach((projects) => {
    const sorted = Array.from(projects.entries())
      .sort(([, a], [, b]) => b.budget - a.budget)
      .slice(0, 10);
    sorted.forEach(([projectId]) => top10ProjectIds.add(projectId));
  });

  // Top10事業の支出先データを抽出
  const result: Record<number, any> = {};

  const currentYearExpenditureData = expenditureData.filter((exp) => {
    const expYear = exp.事業年度;
    return expYear === year;
  });

  currentYearExpenditureData.forEach((exp) => {
    const projectId = exp.予算事業ID;
    if (!projectId || !top10ProjectIds.has(projectId)) return;

    const expenditureName = year === 2024 ? exp.支出先名 : exp.支出先名;
    const expenditureAmount = year === 2024
      ? (exp.金額 || 0)  // 2024: 金額フィールド（1円単位）
      : normalizeAmount(exp['支出額（百万円）'] || 0, year);  // 2014-2023: 百万円単位

    if (!expenditureName || !expenditureAmount) return;

    if (!result[projectId]) {
      result[projectId] = {
        projectId,
        projectName: exp.事業名,
        expenditures: [] as Array<{ name: string; amount: number }>,
      };
    }

    // 同じ支出先は金額を合算
    const existing = result[projectId].expenditures.find((e: any) => e.name === expenditureName);
    if (existing) {
      existing.amount += expenditureAmount;
    } else {
      result[projectId].expenditures.push({ name: expenditureName, amount: expenditureAmount });
    }
  });

  // 各事業の支出先を金額降順でソート、Top20のみ保持
  // 同時に予算データも紐づける
  Object.keys(result).forEach((projectIdStr) => {
    const projectId = Number(projectIdStr);
    const project = result[projectId];

    // 予算データを取得
    let projectBudget = 0;
    for (const [, projects] of ministryProjects) {
      if (projects.has(projectId)) {
        projectBudget = projects.get(projectId)!.budget;
        break;
      }
    }

    project.expenditures.sort((a: any, b: any) => b.amount - a.amount);

    const top20 = project.expenditures.slice(0, 20);
    const others = project.expenditures.slice(20);
    const othersTotal = others.reduce((sum: number, exp: any) => sum + exp.amount, 0);
    const totalExpenditureAmount = project.expenditures.reduce((sum: number, exp: any) => sum + exp.amount, 0);

    // 予算と支出の差分（不明部分）を計算
    const unknownAmount = Math.max(0, projectBudget - totalExpenditureAmount);

    project.budget = projectBudget;
    project.top20Expenditures = top20;
    project.othersTotal = othersTotal;
    project.totalExpenditureAmount = totalExpenditureAmount;
    project.unknownAmount = unknownAmount;
    delete project.expenditures;
  });

  return result;
}

/**
 * 統計情報を計算
 */
function calculateStatistics(budgetData: any[], year: Year) {
  // 当初予算は予算年度=yearのデータを使用
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  const totalBudget = currentYearBudgetData.reduce(
    (sum, item) => sum + normalizeAmount(item['当初予算(合計)'] || item['当初予算（合計）'] || 0, year),
    0
  );

  // 執行額の取得
  // 2024年度: 予算年度=2023のデータを使用（事業年度2024のファイルに含まれる）
  // 2014-2023年度: 予算年度=yearのデータを使用（同じ年度のファイルに執行データが含まれる）
  const executionYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return year === 2024 ? budgetYear === year - 1 : budgetYear === year;
  });

  const totalExecution = executionYearBudgetData.reduce(
    (sum, item) => sum + normalizeAmount(item['執行額(合計)'] || item['執行額（合計）'] || 0, year),
    0
  );

  // 執行率を計算
  // 2024年: CSVに執行率フィールドが存在する（小数形式: 0.33 = 33%）
  // 2014-2023年: 執行率フィールドが存在しないため、執行額÷当初予算で計算
  const validRates = executionYearBudgetData.filter((item) => {
    const budget = item['当初予算(合計)'] || item['当初予算（合計）'] || 0;
    const execution = item['執行額(合計)'] || item['執行額（合計）'] || 0;

    // 2024年: 執行率フィールドが存在する場合
    if (year === 2024) {
      const rate = item.執行率;
      return rate != null && rate !== '' && rate !== 0 && !isNaN(rate);
    }

    // 2014-2023年: 予算と執行額から計算
    return budget > 0 && execution > 0;
  });

  console.log(`  - Valid execution rates: ${validRates.length}/${executionYearBudgetData.length}`);

  const averageExecutionRate =
    validRates.length > 0
      ? validRates.reduce((sum, item) => {
          let rate: number;

          if (year === 2024) {
            // 2024年: 執行率フィールドを使用（既に小数形式）
            rate = Number(item.執行率);
          } else {
            // 2014-2023年: 執行額 ÷ 当初予算で計算
            const budget = normalizeAmount(item['当初予算(合計)'] || item['当初予算（合計）'] || 0, year);
            const execution = normalizeAmount(item['執行額(合計)'] || item['執行額（合計）'] || 0, year);
            rate = budget > 0 ? execution / budget : 0;
          }

          // 異常値(1を超える値)はキャップする
          const normalizedRate = Math.min(rate, 1);
          return sum + normalizedRate;
        }, 0) / validRates.length
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
 * 府省庁リストを抽出（金額付き、金額降順ソート）
 */
function extractMinistries(budgetData: any[], year: Year): Array<{ name: string; budget: number }> {
  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 府省庁ごとに予算を集約
  const ministryBudgets = new Map<string, number>();
  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    if (!ministry) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);
    ministryBudgets.set(ministry, (ministryBudgets.get(ministry) || 0) + budgetAmount);
  });

  // 金額降順でソートして返す
  return Array.from(ministryBudgets.entries())
    .map(([name, budget]) => ({ name, budget }))
    .sort((a, b) => b.budget - a.budget);
}

/**
 * 年度のCSVデータを読み込む（1-2, 2-1, 5-1）
 */
async function loadYearData(year: Year): Promise<[any[], any[], any[]]> {
  const yearDir = path.join(DATA_BASE_PATH, `year_${year}`);

  const overviewFileName = year === 2024
    ? `1-2_RS_${year}_基本情報_事業概要等.csv`
    : `1-2_${year}_基本情報_事業概要.csv`;

  const budgetFileName = year === 2024
    ? `2-1_RS_${year}_予算・執行_サマリ.csv`
    : `2-1_${year}_予算・執行_サマリ.csv`;

  const expenditureFileName = year === 2024
    ? `5-1_RS_${year}_支出先_支出情報.csv`
    : `5-1_${year}_支出先_支出情報.csv`;

  const [overviewData, budgetData, expenditureData] = await Promise.all([
    parseCSV(path.join(yearDir, overviewFileName)),
    parseCSV(path.join(yearDir, budgetFileName)),
    parseCSV(path.join(yearDir, expenditureFileName)),
  ]);

  return [overviewData, budgetData, expenditureData];
}

/**
 * 事業名からURLセーフなキーを生成（MD5ハッシュ）
 */
function generateProjectKey(projectName: string): string {
  const crypto = require('crypto');
  // 事業名のMD5ハッシュを生成（短く一意なキー）
  return crypto.createHash('md5').update(projectName, 'utf-8').digest('hex');
}

/**
 * 全年度のデータを集約して事業別時系列データを生成（事業名がキー）
 */
async function generateProjectTimeSeriesData() {
  console.log('\nGenerating project time series data...');

  // 1. 全年度のデータを読み込み
  const allYearsOverviewData = new Map<Year, any[]>();
  const allYearsBudgetData = new Map<Year, any[]>();
  const allYearsExpenditureData = new Map<Year, any[]>();

  for (const year of AVAILABLE_YEARS) {
    const exists = await checkYearDirectoryExists(year);
    if (!exists) continue;

    const [overviewData, budgetData, expenditureData] = await loadYearData(year);
    allYearsOverviewData.set(year, overviewData);
    allYearsBudgetData.set(year, budgetData);
    allYearsExpenditureData.set(year, expenditureData);
  }

  // 2. 事業名単位で集約（事業名がキー）
  const projectMap = new Map<string, any>();

  for (const [year, budgetData] of allYearsBudgetData) {
    // 予算年度でフィルター
    const currentYearData = budgetData.filter((b: any) => b.予算年度 === year);

    currentYearData.forEach((budget: any) => {
      const projectName = budget.事業名;
      const projectId = budget.予算事業ID;
      const ministry = budget.府省庁;

      if (!projectName || !projectId) return;

      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, {
          projectName,
          projectKey: generateProjectKey(projectName),
          ministry,
          startYear: null,
          endYear: null,
          yearlyData: {},
          _expenditureMap: new Map<string, any>(),
        });
      }

      const project = projectMap.get(projectName)!;

      const rawBudget = budget['当初予算(合計)'] || budget['当初予算（合計）'];
      const rawExecution = budget['執行額(合計)'] || budget['執行額（合計）'];

      // 空文字列や0の場合はスキップ（2024年は複数行あり、空行で上書きされるのを防ぐ）
      const budgetAmount = rawBudget && rawBudget !== '' ? normalizeAmount(rawBudget, year) : 0;
      const executionAmount = rawExecution && rawExecution !== '' ? normalizeAmount(rawExecution, year) : 0;

      // 既存データがある場合は、有効な値がある場合のみ更新
      const existingData = project.yearlyData[year];
      if (existingData) {
        // 既存の予算が0で新しい予算が正の値なら更新
        if (existingData.budget === 0 && budgetAmount > 0) {
          existingData.budget = budgetAmount;
        }
        // 既存の執行額が0で新しい執行額が正の値なら更新
        if (existingData.execution === 0 && executionAmount > 0) {
          existingData.execution = executionAmount;
        }
        // 執行率がある場合は常に更新（より詳細な情報を持つ行を優先）
        if (budget.執行率) {
          existingData.executionRate = budget.執行率;
        }
      } else {
        // 新規データの場合はそのまま設定
        project.yearlyData[year] = {
          projectId,
          budget: budgetAmount,
          execution: executionAmount,
          executionRate: budget.執行率,
        };
      }
    });
  }

  // 3. 1-2から開始年度・終了年度を取得（新しい年度を優先）
  // 年度を降順（新しい→古い）にソート
  const sortedYearsOverviewData = [...allYearsOverviewData].sort((a, b) => b[0] - a[0]);

  for (const [year, overviewData] of sortedYearsOverviewData) {
    overviewData.forEach((overview: any) => {
      const projectName = overview.事業名;
      if (!projectName || !projectMap.has(projectName)) return;

      const project = projectMap.get(projectName)!;

      // 開始年度を設定（新しい年度のデータを優先、まだ設定されていない場合のみ）
      if (project.startYear === null && overview.事業開始年度) {
        const startYear = Number(overview.事業開始年度);
        if (!isNaN(startYear) && startYear >= 2000 && startYear <= 2030) {
          project.startYear = startYear;
        }
      }

      // 終了年度を設定（新しい年度のデータを優先、まだ設定されていない場合のみ）
      if (project.endYear === null && (overview['事業終了（予定）年度'] || overview['事業終了(予定)年度'])) {
        const endYear = Number(overview['事業終了（予定）年度'] || overview['事業終了(予定)年度']);
        if (!isNaN(endYear) && endYear >= 2000 && endYear <= 2050) {
          project.endYear = endYear;
        }
      }
    });
  }

  // 4. 支出先データを集約
  for (const [year, expenditureData] of allYearsExpenditureData) {
    // 事業年度でフィルター
    const currentYearData = expenditureData.filter((e: any) => e.事業年度 === year);

    currentYearData.forEach((exp: any) => {
      const projectName = exp.事業名;
      if (!projectName || !projectMap.has(projectName)) return;

      const project = projectMap.get(projectName)!;
      const expenditureName = exp.支出先名;

      // 金額の取得（年度により異なるフィールド名）
      const amount = year === 2024
        ? (exp.金額 || 0)
        : normalizeAmount(exp['支出額（百万円）'] || exp.支出額 || 0, year);

      if (!expenditureName || !amount) return;

      if (!project._expenditureMap.has(expenditureName)) {
        project._expenditureMap.set(expenditureName, {
          name: expenditureName,
          totalAmount: 0,
          yearCount: 0,
          yearlyAmounts: {},
        });
      }

      const expData = project._expenditureMap.get(expenditureName)!;
      expData.totalAmount += amount;

      if (!expData.yearlyAmounts[year]) {
        expData.yearlyAmounts[year] = 0;
        expData.yearCount++;
      }
      expData.yearlyAmounts[year] += amount;
    });
  }

  // 5. 各事業のTop10支出先を抽出
  projectMap.forEach((project) => {
    if (project._expenditureMap) {
      const sorted = Array.from(project._expenditureMap.values())
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount);

      project.topExpenditures = sorted.slice(0, 10);
      delete project._expenditureMap;
    } else {
      project.topExpenditures = [];
    }
  });

  // 6. インデックスファイルを生成
  const projectIndex: ProjectIndexItem[] = Array.from(projectMap.values())
    .map((p: any) => {
      const years = Object.keys(p.yearlyData).map(Number).sort((a, b) => a - b);
      const totalBudget = years.reduce((sum, year) =>
        sum + (p.yearlyData[year]?.budget || 0), 0);

      return {
        projectKey: p.projectKey,
        projectName: p.projectName,
        ministry: p.ministry,
        startYear: p.startYear,
        endYear: p.endYear,
        dataStartYear: years[0] as Year,
        dataEndYear: years[years.length - 1] as Year,
        totalBudget,
        averageBudget: totalBudget / years.length,
      };
    })
    .sort((a, b) => b.totalBudget - a.totalBudget);

  // 7. ファイル出力
  const projectsDir = path.join(OUTPUT_BASE_PATH, 'projects');
  await fs.mkdir(projectsDir, { recursive: true });

  // インデックスファイル
  await fs.writeFile(
    path.join(OUTPUT_BASE_PATH, 'project-index.json'),
    JSON.stringify(projectIndex, null, 2)
  );

  console.log(`  ✓ Generated project index: ${projectIndex.length} projects`);

  // 事業別詳細ファイル（projectKeyをファイル名に使用）
  const writePromises = Array.from(projectMap.values()).map((project: any) =>
    fs.writeFile(
      path.join(projectsDir, `${project.projectKey}.json`),
      JSON.stringify(project, null, 2)
    )
  );

  await Promise.all(writePromises);

  console.log(`  ✓ Generated ${projectMap.size} project detail files`);
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

  // レポート用の時系列データを生成
  await generateProjectTimeSeriesData();

  console.log('\n✓ Data preprocessing completed!');
}

main().catch((error) => {
  console.error('Error during preprocessing:', error);
  process.exit(1);
});
