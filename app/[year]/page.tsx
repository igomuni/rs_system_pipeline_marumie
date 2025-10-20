import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Year } from '@/types/rs-system';
import { AVAILABLE_YEARS } from '@/types/rs-system';
import { checkYearDataExists } from '@/server/repositories/json-repository';
import {
  loadPreprocessedSankeyData,
  loadPreprocessedMinistries,
  loadPreprocessedStatistics,
  loadPreprocessedMinistryProjects,
} from '@/server/loaders/json-data-loader';
import SankeyChart from '@/client/components/SankeyChart';
import YearSelector from '@/client/components/YearSelector';
import type { SankeyNode, SankeyLink } from '@/types/sankey';

interface Props {
  params: Promise<{
    year: string;
  }>;
  searchParams: Promise<{
    ministry?: string;
  }>;
}

export default async function YearPage({ params, searchParams }: Props) {
  // Next.js 15では params と searchParams を await する必要がある
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const year = parseInt(resolvedParams.year, 10) as Year;

  // 年度の妥当性チェック
  if (!AVAILABLE_YEARS.includes(year)) {
    notFound();
  }

  // データの存在チェック
  const exists = await checkYearDataExists(year);
  if (!exists) {
    notFound();
  }

  // 事前処理済みデータを取得（高速）
  const [sankeyData, ministries, statistics, ministryProjects] = await Promise.all([
    loadPreprocessedSankeyData(year),
    loadPreprocessedMinistries(year),
    loadPreprocessedStatistics(year),
    loadPreprocessedMinistryProjects(year),
  ]);

  // 府省庁フィルターがある場合は、その府省庁の事業Top10を表示
  let displaySankeyData = sankeyData;

  if (resolvedSearchParams.ministry && ministryProjects[resolvedSearchParams.ministry]) {
    const ministryData = ministryProjects[resolvedSearchParams.ministry];
    const ministryNode = sankeyData.nodes.find(
      (n) => n.type === 'ministry' && n.name === resolvedSearchParams.ministry
    );

    if (ministryNode) {
      // 府省庁 → 事業Top10 + その他 のサンキー図を生成
      const nodes: SankeyNode[] = [ministryNode];
      const links: SankeyLink[] = [];
      let nodeIndex = 0;

      // Top10の事業ノード
      ministryData.top10.forEach((project: any) => {
        const projectNode: SankeyNode = {
          id: `project_${project.projectId}`,
          name: project.name,
          type: 'project' as const,
          metadata: {
            ministry: resolvedSearchParams.ministry,
            projectId: project.projectId,
            budget: project.budget,
          },
        };
        nodes.push(projectNode);

        links.push({
          source: ministryNode.id,
          target: projectNode.id,
          value: project.budget,
        });
      });

      // その他ノード
      if (ministryData.othersTotal > 0) {
        const othersNode: SankeyNode = {
          id: `others_${nodeIndex++}`,
          name: 'その他',
          type: 'others' as const,
          metadata: { ministry: resolvedSearchParams.ministry },
        };
        nodes.push(othersNode);

        links.push({
          source: ministryNode.id,
          target: othersNode.id,
          value: ministryData.othersTotal,
        });
      }

      displaySankeyData = { nodes, links };
    }
  }

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
            {resolvedSearchParams.ministry && (
              <>
                <span>/</span>
                <span className="text-gray-900 dark:text-white">{resolvedSearchParams.ministry}</span>
              </>
            )}
          </nav>
          <SankeyChart data={displaySankeyData} year={year} />
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

export async function generateStaticParams() {
  return AVAILABLE_YEARS.map((year) => ({
    year: year.toString(),
  }));
}
