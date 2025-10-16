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
      ministryData.top10.forEach((project) => {
        const projectNode: SankeyNode = {
          id: `project_${nodeIndex++}`,
          name: project.name,
          type: 'project' as const,
          metadata: { ministry: resolvedSearchParams.ministry },
        };
        nodes.push(projectNode);

        links.push({
          source: ministryNode.id,
          target: projectNode.id,
          value: project.amount,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/" className="text-blue-600 hover:underline text-sm">
                ← ホームに戻る
              </Link>
              <h1 className="text-2xl font-bold mt-1">
                {year}年度 行政事業レビュー
              </h1>
            </div>
            <YearSelector currentYear={year} availableYears={AVAILABLE_YEARS} />
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">当初予算総額</div>
              <div className="text-xl font-bold">
                {(statistics.totalBudget / 1000000000000).toFixed(1)}兆円
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">執行額</div>
              <div className="text-xl font-bold">
                {(statistics.totalExecution / 1000000000000).toFixed(1)}兆円
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">平均執行率</div>
              <div className="text-xl font-bold">
                {(statistics.averageExecutionRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">事業数</div>
              <div className="text-xl font-bold">{statistics.eventCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-3">府省庁フィルター</h2>
              <div className="space-y-2">
                <Link
                  href={`/${year}`}
                  className={`block px-3 py-2 rounded ${
                    !resolvedSearchParams.ministry
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  すべて
                </Link>
                {ministries.map((ministry) => (
                  <Link
                    key={ministry}
                    href={`/${year}?ministry=${encodeURIComponent(ministry)}`}
                    className={`block px-3 py-2 rounded text-sm ${
                      resolvedSearchParams.ministry === ministry
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    {ministry}
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Sankey Chart */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">予算執行の流れ</h2>
                {resolvedSearchParams.ministry && (
                  <p className="text-sm text-gray-600 mt-1">
                    フィルター: {resolvedSearchParams.ministry}
                  </p>
                )}
              </div>
              <SankeyChart data={displaySankeyData} year={year} />
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t">
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 text-sm">
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
