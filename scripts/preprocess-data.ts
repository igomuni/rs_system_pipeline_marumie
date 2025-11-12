/**
 * ビルド時にCSVデータを事前処理してJSONに変換するスクリプト
 */
import fs from 'fs/promises';
import path from 'path';
import { parse } from 'csv-parse/sync';
import type { Year } from '../types/rs-system';
import { AVAILABLE_YEARS } from '../types/rs-system';
import type { SankeyData } from '../types/sankey';
import type { ProjectTimeSeriesData, ProjectIndexItem, ExpenditureTimeSeries } from '../types/report';

const DATA_BASE_PATH = path.join(process.cwd(), 'data', 'rs_system');
const OUTPUT_BASE_PATH = path.join(process.cwd(), 'public', 'data');

// 前処理は全年度（2014-2024）のデータを生成
const YEARS_TO_PROCESS: Year[] = AVAILABLE_YEARS;

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
  // 2024年は RS_ プレフィックスなしの形式
  const budgetFileName = `2-1_${year}_予算・執行_サマリ.csv`;
  const expenditureFileName = `5-1_${year}_支出先_支出情報.csv`;
  const connectionFileName = year === 2024
    ? `5-2_${year}_支出先_支出ブロックのつながり.csv`
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

  // 簡易版のサンキーデータを生成（府省庁ごとに集約、レガシー）
  const sankeyData = generateSimplifiedSankeyData(
    budgetData,
    expenditureData,
    connectionData,
    year
  );

  // 6列メインサンキー図データを生成
  const sankeyMainData = generate6ColumnMainSankeyData(
    budgetData,
    expenditureData,
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
      path.join(outputDir, 'sankey-main.json'),
      JSON.stringify(sankeyMainData, null, 2)
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
 * サンキーデータを生成（府省庁 → 予算額合計 → Top20事業 + その他 → 支出先）
 */
function generateSimplifiedSankeyData(
  budgetData: any[],
  expenditureData: any[],
  connectionData: any[],
  year: Year
): SankeyData {
  const nodes: any[] = [];
  const links: any[] = [];
  // クライアント側でフィルタリングするため、全データを生成
  // TOP_N と MINISTRY_THRESHOLD はクライアント側の設定で制御

  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 府省庁ごとに事業を集約
  const ministryData = new Map<string, { budget: number; projects: Map<number, { name: string; budget: number }> }>();
  let totalBudget = 0;

  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    const projectId = budget.予算事業ID;
    const projectName = budget.事業名;
    if (!ministry || !projectId || !projectName) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (!ministryData.has(ministry)) {
      ministryData.set(ministry, { budget: 0, projects: new Map() });
    }
    const data = ministryData.get(ministry)!;
    data.budget += budgetAmount;
    totalBudget += budgetAmount;

    // 事業データを集約（同じ予算事業IDは合算）
    if (data.projects.has(projectId)) {
      data.projects.get(projectId)!.budget += budgetAmount;
    } else {
      data.projects.set(projectId, { name: projectName, budget: budgetAmount });
    }
  });

  // 第1列: 全府省庁ノード（予算額降順）
  const sortedMinistries = Array.from(ministryData.entries())
    .sort(([, a], [, b]) => b.budget - a.budget);

  // 全府省庁のノードを追加（クライアント側でフィルタリング）
  sortedMinistries.forEach(([ministry, data]) => {
    const ministryNodeId = `ministry_${ministry}`;
    nodes.push({
      id: ministryNodeId,
      name: ministry,
      type: 'ministry',
      metadata: { ministry, budget: data.budget },
    });
  });

  // 第2列: 予算額合計ノード（単一の中継ノード）
  const totalNode = {
    id: 'total',
    name: `${year}年度予算`,
    type: 'total',
    metadata: { budget: totalBudget },
  };
  nodes.push(totalNode);

  // 全府省庁 → 予算額合計 のリンク
  sortedMinistries.forEach(([ministry, data]) => {
    const ministryNodeId = `ministry_${ministry}`;
    links.push({
      source: ministryNodeId,
      target: 'total',
      value: data.budget,
    });
  });

  // 全事業を集約
  const allProjects: Array<{ id: number; name: string; budget: number; ministry: string }> = [];
  ministryData.forEach((data, ministry) => {
    data.projects.forEach((project, projectId) => {
      allProjects.push({
        id: projectId,
        name: project.name,
        budget: project.budget,
        ministry,
      });
    });
  });

  // 全事業を予算額降順でソート
  const sortedProjects = allProjects.sort((a, b) => b.budget - a.budget);

  // 第3列: 全事業のノードとリンク（クライアント側でフィルタリング）
  // 支出先データは含めず、軽量なデータセットを生成
  sortedProjects.forEach((project) => {
    const projectNodeId = `project_${project.id}`;
    nodes.push({
      id: projectNodeId,
      name: project.name,
      type: 'project',
      metadata: {
        ministry: project.ministry,
        eventId: project.id,
        eventName: project.name,
        budget: project.budget,
      },
    });

    // 予算額合計 → 事業 のリンク
    links.push({
      source: 'total',
      target: projectNodeId,
      value: project.budget,
    });
  });

  return {
    nodes,
    links,
  };
}

/**
 * 6列メインサンキー図データを生成
 * 列1: 府省庁ごとの事業Top3
 * 列2: 府省庁別予算合計
 * 列3: 予算総計
 * 列4: 支出総計
 * 列5: 府省庁別支出合計
 * 列6: 府省庁ごとの支出先Top3
 */
function generate6ColumnMainSankeyData(
  budgetData: any[],
  expenditureData: any[],
  year: Year
): SankeyData {
  const nodes: any[] = [];
  const links: any[] = [];

  // 対象年度のデータのみをフィルター
  const currentYearBudgetData = budgetData.filter((budget) => {
    const budgetYear = budget.予算年度;
    return budgetYear === year;
  });

  // 対象年度の支出先データのみをフィルター
  const currentYearExpenditureData = expenditureData.filter((exp) => {
    const expYear = exp.事業年度;
    return expYear === year;
  });

  // 府省庁ごとに集約（予算と支出）
  const ministryData = new Map<
    string,
    {
      budget: number;
      execution: number;
      projects: Map<number, { name: string; budget: number; execution: number }>;
    }
  >();

  let totalBudget = 0;
  let totalExecution = 0;

  // 予算データから予算金額を集計
  currentYearBudgetData.forEach((budget) => {
    const ministry = budget.府省庁;
    const projectId = budget.予算事業ID;
    const projectName = budget.事業名;
    if (!ministry || !projectId || !projectName) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (!ministryData.has(ministry)) {
      ministryData.set(ministry, { budget: 0, execution: 0, projects: new Map() });
    }
    const data = ministryData.get(ministry)!;
    data.budget += budgetAmount;
    totalBudget += budgetAmount;

    // 事業データを集約
    if (!data.projects.has(projectId)) {
      data.projects.set(projectId, {
        name: projectName,
        budget: budgetAmount,
        execution: 0,
      });
    } else {
      const project = data.projects.get(projectId)!;
      project.budget += budgetAmount;
    }
  });

  // 支出先データから支出金額を集計
  currentYearExpenditureData.forEach((exp) => {
    const ministry = exp.府省庁;
    const projectId = exp.予算事業ID;
    const projectName = exp.事業名;
    if (!ministry || !projectId || !projectName) return;

    // 2024年: 金額フィールド（円単位）
    // 2023年以前: 支出額（百万円）フィールド（百万円単位）
    const expenditureAmount = normalizeAmount(exp.金額 || exp['支出額（百万円）'] || 0, year);

    if (!ministryData.has(ministry)) {
      ministryData.set(ministry, { budget: 0, execution: 0, projects: new Map() });
    }
    const data = ministryData.get(ministry)!;
    data.execution += expenditureAmount;
    totalExecution += expenditureAmount;

    // 事業データを集約
    if (!data.projects.has(projectId)) {
      data.projects.set(projectId, {
        name: projectName,
        budget: 0,
        execution: expenditureAmount,
      });
    } else {
      const project = data.projects.get(projectId)!;
      project.execution += expenditureAmount;
    }
  });

  // 府省庁を予算額降順でソート
  const sortedMinistries = Array.from(ministryData.entries()).sort(
    ([, a], [, b]) => b.budget - a.budget
  );

  // TopN府省庁と残りを分離（デフォルト: Top10）
  const topNMinistries = 10;
  const topMinistries = sortedMinistries.slice(0, topNMinistries);
  const otherMinistries = sortedMinistries.slice(topNMinistries);

  // 列0: Top府省庁ごとの予算合計ノード
  topMinistries.forEach(([ministry, data]) => {
    const ministryNodeId = `ministry_budget_${ministry}`;
    nodes.push({
      id: ministryNodeId,
      name: ministry,
      type: 'ministry',
      column: 0,
      metadata: {
        ministry,
        budget: data.budget,
        execution: data.execution,
      },
    });
  });

  // 列0: その他府省庁ノード
  if (otherMinistries.length > 0) {
    const othersBudget = otherMinistries.reduce((sum, [, data]) => sum + data.budget, 0);
    const othersExecution = otherMinistries.reduce((sum, [, data]) => sum + data.execution, 0);
    const ministryList = otherMinistries.map(([ministry, data]) => ({
      name: ministry,
      budget: data.budget,
      execution: data.execution,
    }));

    nodes.push({
      id: 'ministry_others_budget',
      name: `その他${otherMinistries.length}府省庁`,
      type: 'others',
      column: 0,
      metadata: {
        ministry: 'その他府省庁',
        budget: othersBudget,
        execution: othersExecution,
        ministryList, // モーダル表示用
      },
    });
  }

  // 列1: 予算総計ノード
  const budgetTotalNodeId = 'total_budget';
  nodes.push({
    id: budgetTotalNodeId,
    name: `予算総計`,
    type: 'total',
    column: 1,
    metadata: {
      budget: totalBudget,
    },
  });

  // 列0（府省庁） → 列1（予算総計）のリンク
  topMinistries.forEach(([ministry, data]) => {
    const ministryNodeId = `ministry_budget_${ministry}`;
    links.push({
      source: ministryNodeId,
      target: budgetTotalNodeId,
      value: data.budget,
    });
  });

  // その他府省庁 → 予算総計のリンク
  if (otherMinistries.length > 0) {
    const othersBudget = otherMinistries.reduce((sum, [, data]) => sum + data.budget, 0);
    links.push({
      source: 'ministry_others_budget',
      target: budgetTotalNodeId,
      value: othersBudget,
    });
  }

  // 列2: 支出総計ノード
  const executionTotalNodeId = 'total_execution';
  nodes.push({
    id: executionTotalNodeId,
    name: `支出総計`,
    type: 'total',
    column: 2,
    metadata: {
      execution: totalExecution,
    },
  });

  // 列1（予算総計） → 列2（支出総計）のリンク
  const flowValue = Math.min(totalBudget, totalExecution);
  links.push({
    source: budgetTotalNodeId,
    target: executionTotalNodeId,
    value: flowValue,
  });

  // 差額ノードの処理（列2に配置）
  const difference = Math.abs(totalBudget - totalExecution);
  const threshold = Math.max(totalBudget, totalExecution) * 0.001; // 0.1%

  if (difference > threshold) {
    if (totalBudget > totalExecution) {
      // 予算超過の場合: 列2に配置
      const differenceNodeId = 'difference_budget_excess';
      nodes.push({
        id: differenceNodeId,
        name: `差額（予算超過）`,
        type: 'difference',
        column: 2,
        metadata: {
          differenceData: {
            budgetTotal: totalBudget,
            executionTotal: totalExecution,
            difference,
            direction: 'budget-excess',
          },
        },
      });

      // 予算総計 → 差額ノード
      links.push({
        source: budgetTotalNodeId,
        target: differenceNodeId,
        value: difference,
      });
    } else {
      // 支出超過の場合: 列3に配置
      const differenceNodeId = 'difference_execution_excess';
      nodes.push({
        id: differenceNodeId,
        name: `差額（支出超過）`,
        type: 'difference',
        column: 3,
        metadata: {
          differenceData: {
            budgetTotal: totalBudget,
            executionTotal: totalExecution,
            difference,
            direction: 'execution-excess',
          },
        },
      });

      // 支出総計 → 差額ノード
      links.push({
        source: executionTotalNodeId,
        target: differenceNodeId,
        value: difference,
      });
    }
  }

  // 列3: Top府省庁別支出合計ノード（支出額でソート）
  const sortedMinistriesByExecution = Array.from(ministryData.entries()).sort(
    ([, a], [, b]) => b.execution - a.execution
  );
  const topMinistriesByExecution = sortedMinistriesByExecution.slice(0, topNMinistries);
  const otherMinistriesByExecution = sortedMinistriesByExecution.slice(topNMinistries);

  topMinistriesByExecution.forEach(([ministry, data]) => {
    const ministryNodeId = `ministry_execution_${ministry}`;
    nodes.push({
      id: ministryNodeId,
      name: ministry,
      type: 'ministry',
      column: 3,
      metadata: {
        ministry,
        execution: data.execution,
        budget: data.budget,
      },
    });

    // 列2（支出総計） → 列3（府省庁）のリンク
    links.push({
      source: executionTotalNodeId,
      target: ministryNodeId,
      value: data.execution,
    });
  });

  // 列3: その他府省庁ノード（支出）
  if (otherMinistriesByExecution.length > 0) {
    const othersExecution = otherMinistriesByExecution.reduce((sum, [, data]) => sum + data.execution, 0);
    const othersBudget = otherMinistriesByExecution.reduce((sum, [, data]) => sum + data.budget, 0);
    const ministryList = otherMinistriesByExecution.map(([ministry, data]) => ({
      name: ministry,
      budget: data.budget,
      execution: data.execution,
    }));

    nodes.push({
      id: 'ministry_others_execution',
      name: `その他${otherMinistriesByExecution.length}府省庁`,
      type: 'others',
      column: 3,
      metadata: {
        ministry: 'その他府省庁',
        execution: othersExecution,
        budget: othersBudget,
        ministryList, // モーダル表示用
      },
    });

    // 支出総計 → その他府省庁のリンク
    links.push({
      source: executionTotalNodeId,
      target: 'ministry_others_execution',
      value: othersExecution,
    });
  }

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
 * 事業ごとの支出先データを生成（全事業）
 */
function generateProjectExpendituresData(budgetData: any[], expenditureData: any[], year: Year) {
  // 全事業の予算データを集約
  const allProjects = new Map<number, { name: string; budget: number }>();

  const currentYearBudgetData = budgetData.filter((budget) => budget.予算年度 === year);

  currentYearBudgetData.forEach((budget) => {
    const projectId = budget.予算事業ID;
    const projectName = budget.事業名;
    if (!projectId || !projectName) return;

    const budgetAmount = normalizeAmount(budget['当初予算(合計)'] || budget['当初予算（合計）'] || 0, year);

    if (allProjects.has(projectId)) {
      allProjects.get(projectId)!.budget += budgetAmount;
    } else {
      allProjects.set(projectId, { name: projectName, budget: budgetAmount });
    }
  });

  // 全事業の支出先データを抽出
  const result: Record<number, any> = {};

  const currentYearExpenditureData = expenditureData.filter((exp) => {
    const expYear = exp.事業年度;
    return expYear === year;
  });

  currentYearExpenditureData.forEach((exp) => {
    const projectId = exp.予算事業ID;
    if (!projectId) return;

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
    const projectBudget = allProjects.get(projectId)?.budget || 0;

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

  // 2024年は RS_ プレフィックスなし、かつ「事業概要等」の形式
  const overviewFileName = year === 2024
    ? `1-2_${year}_基本情報_事業概要等.csv`
    : `1-2_${year}_基本情報_事業概要.csv`;
  const budgetFileName = `2-1_${year}_予算・執行_サマリ.csv`;
  const expenditureFileName = `5-1_${year}_支出先_支出情報.csv`;

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

      // 年度別予算を抽出（フィルタリング用）
      const yearlyBudgets: Record<number, number> = {};
      years.forEach(year => {
        yearlyBudgets[year] = p.yearlyData[year]?.budget || 0;
      });

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
        yearlyBudgets,
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

  for (const year of YEARS_TO_PROCESS) {
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
