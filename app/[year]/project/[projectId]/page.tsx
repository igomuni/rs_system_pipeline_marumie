import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Year } from '@/types/rs-system';
import { AVAILABLE_YEARS } from '@/types/rs-system';
import { checkYearDataExists } from '@/server/repositories/json-repository';
import {
  loadPreprocessedProjectExpenditures,
} from '@/server/loaders/json-data-loader';
import SankeyChart from '@/client/components/SankeyChart';
import YearSelector from '@/client/components/YearSelector';
import type { SankeyNode, SankeyLink } from '@/types/sankey';

interface Props {
  params: Promise<{
    year: string;
    projectId: string;
  }>;
}

export default async function ProjectPage({ params }: Props) {
  const resolvedParams = await params;
  const year = parseInt(resolvedParams.year, 10) as Year;
  const projectId = parseInt(resolvedParams.projectId, 10);

  // 年度の妥当性チェック
  if (!AVAILABLE_YEARS.includes(year)) {
    notFound();
  }

  // データの存在チェック
  const exists = await checkYearDataExists(year);
  if (!exists) {
    notFound();
  }

  // 支出データ、府省庁データ、統計情報を取得
  const [projectExpenditures, ministryProjects, statistics] = await Promise.all([
    loadPreprocessedProjectExpenditures(year),
    (async () => {
      const { loadPreprocessedMinistries, loadPreprocessedMinistryProjects } = await import('@/server/loaders/json-data-loader');
      return {
        ministries: await loadPreprocessedMinistries(year),
        ministryProjects: await loadPreprocessedMinistryProjects(year),
      };
    })(),
    (async () => {
      const { loadPreprocessedStatistics } = await import('@/server/loaders/json-data-loader');
      return loadPreprocessedStatistics(year);
    })(),
  ]);

  const projectData = projectExpenditures[projectId];

  // 府省庁情報を取得（すべての府省庁のTop10事業から検索）
  let ministryName = '';
  let projectName = '';
  let projectBudget = 0;

  for (const ministry of Object.keys(ministryProjects.ministryProjects)) {
    const project = ministryProjects.ministryProjects[ministry].top10.find((p: any) => p.projectId === projectId);
    if (project) {
      ministryName = ministry;
      projectName = project.name;
      projectBudget = project.budget;
      break;
    }
  }

  if (!projectName) {
    notFound();
  }

  // 支出データがない場合は、予算情報のみ表示
  if (!projectData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  行政事業レビュー
                </h1>
                <YearSelector currentYear={year} availableYears={AVAILABLE_YEARS} />
              </div>
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">予算:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {(statistics.totalBudget / 1000000000000).toFixed(1)}兆円
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">執行額:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {(statistics.totalExecution / 1000000000000).toFixed(1)}兆円
                  </span>
                </div>
                {year === 2024 && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-600 dark:text-gray-400">執行率:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {(statistics.averageExecutionRate * 100).toFixed(1)}%
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">事業数:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">{statistics.eventCount}</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {/* Breadcrumbs */}
            <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
                ホーム
              </Link>
              <span>/</span>
              <Link href={`/${year}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                {year}年度
              </Link>
              {ministryName && (
                <>
                  <span>/</span>
                  <Link
                    href={`/${year}?ministry=${encodeURIComponent(ministryName)}`}
                    className="hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {ministryName}
                  </Link>
                </>
              )}
              <span>/</span>
              <span className="text-gray-900 dark:text-white">{projectName}</span>
            </nav>
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p className="text-lg font-medium">支出先データが存在しません</p>
              <p className="text-sm mt-2">この事業の支出先情報は公開されていません。</p>
            </div>
          </div>
        </div>

        <footer className="mt-16 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400 text-sm">
            <p>
              データソース:{' '}
              <a
                href="https://www.gyoukaku.go.jp/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                行政事業レビュー
              </a>
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // サンキー図データを生成: 事業 → 支出先Top20 + その他 + 不明
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // 事業ノード（府省庁情報を追加して逆方向のナビゲーションを可能にする）
  const projectNode: SankeyNode = {
    id: 'project',
    name: projectData.projectName,
    type: 'project',
    metadata: {
      projectId,
      budget: projectData.budget,
      ministry: ministryName, // 府省庁ページへの逆ナビゲーション用
    },
  };
  nodes.push(projectNode);

  let nodeIndex = 0;

  // Top20支出先ノード
  projectData.top20Expenditures.forEach((expenditure) => {
    const expNode: SankeyNode = {
      id: `exp_${nodeIndex++}`,
      name: expenditure.name,
      type: 'expenditure' as const,
      metadata: {
        amount: expenditure.amount,
      },
    };
    nodes.push(expNode);

    links.push({
      source: projectNode.id,
      target: expNode.id,
      value: expenditure.amount,
    });
  });

  // その他ノード（不明の前に配置）
  if (projectData.othersTotal > 0) {
    const othersNode: SankeyNode = {
      id: `others_${nodeIndex++}`,
      name: 'その他の支出先',
      type: 'others' as const,
      metadata: {
        amount: projectData.othersTotal,
      },
    };
    nodes.push(othersNode);

    links.push({
      source: projectNode.id,
      target: othersNode.id,
      value: projectData.othersTotal,
    });
  }

  // 不明ノード（予算と支出の差分）- 最後に配置
  if (projectData.unknownAmount > 0) {
    const unknownNode: SankeyNode = {
      id: `unknown_${nodeIndex++}`,
      name: '不明',
      type: 'unknown' as const,
      metadata: {
        amount: projectData.unknownAmount,
      },
    };
    nodes.push(unknownNode);

    links.push({
      source: projectNode.id,
      target: unknownNode.id,
      value: projectData.unknownAmount,
    });
  }

  const sankeyData = { nodes, links };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                行政事業レビュー
              </h1>
              <YearSelector currentYear={year} availableYears={AVAILABLE_YEARS} />
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">予算:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {(statistics.totalBudget / 1000000000000).toFixed(1)}兆円
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">執行額:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {(statistics.totalExecution / 1000000000000).toFixed(1)}兆円
                </span>
              </div>
              {year === 2024 && (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">執行率:</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {(statistics.averageExecutionRate * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600 dark:text-gray-400">事業数:</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{statistics.eventCount}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {/* Breadcrumbs */}
          <nav className="mb-4 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/" className="hover:text-blue-600 dark:hover:text-blue-400">
              ホーム
            </Link>
            <span>/</span>
            <Link href={`/${year}`} className="hover:text-blue-600 dark:hover:text-blue-400">
              {year}年度
            </Link>
            {ministryName && (
              <>
                <span>/</span>
                <Link
                  href={`/${year}?ministry=${encodeURIComponent(ministryName)}`}
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {ministryName}
                </Link>
              </>
            )}
            <span>/</span>
            <span className="text-gray-900 dark:text-white">{projectData.projectName}</span>
          </nav>
          <SankeyChart data={sankeyData} year={year} />
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400 text-sm">
          <p>
            データソース:{' '}
            <a
              href="https://www.gyoukaku.go.jp/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              行政事業レビュー
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
