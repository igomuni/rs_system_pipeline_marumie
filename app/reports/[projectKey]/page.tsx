import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadProjectData, loadProjectIndex } from '@/server/loaders/report-loader';
import { BudgetTrendChart } from '@/client/components/reports/BudgetTrendChart';
import { ExpenditureTopList } from '@/client/components/reports/ExpenditureTopList';
import { ExpenditureTimeSeriesChart } from '@/client/components/reports/ExpenditureTimeSeriesChart';

interface PageProps {
  params: Promise<{ projectKey: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { projectKey } = await params;
  const projectData = await loadProjectData(projectKey);

  if (!projectData) {
    return {
      title: '事業が見つかりません',
    };
  }

  return {
    title: `${projectData.projectName} | 事業レポート`,
    description: `${projectData.ministry}の${projectData.projectName}の予算推移と支出先分析`,
  };
}

export async function generateStaticParams() {
  const projectIndex = await loadProjectIndex();

  // 全事業のパスを生成（ビルド時に静的生成）
  return projectIndex.slice(0, 100).map((project) => ({
    projectKey: project.projectKey,
  }));
}

export default async function ProjectReportPage({ params }: PageProps) {
  const { projectKey } = await params;
  const projectData = await loadProjectData(projectKey);

  if (!projectData) {
    notFound();
  }

  // データ年度範囲を計算
  const years = Object.keys(projectData.yearlyData).map(Number).sort((a, b) => a - b);
  const dataStartYear = years[0];
  const dataEndYear = years[years.length - 1];
  const yearCount = years.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              事業レポート詳細
            </h1>
            <Link
              href="/reports"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              ← 一覧に戻る
            </Link>
          </div>
        </div>
      </header>

      {/* パンくず */}
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <ol className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <li>
            <Link
              href="/"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              トップ
            </Link>
          </li>
          <li>
            <span className="mx-2">&gt;</span>
          </li>
          <li>
            <Link
              href="/reports"
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              事業レポート
            </Link>
          </li>
          <li>
            <span className="mx-2">&gt;</span>
          </li>
          <li className="text-gray-900 dark:text-gray-200 font-medium truncate max-w-md">
            {projectData.projectName}
          </li>
        </ol>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* 事業基本情報 */}
        <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {projectData.projectName}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-gray-600 dark:text-gray-400">府省庁</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {projectData.ministry}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">事業開始年度</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {projectData.startYear ? `${projectData.startYear}年度` : '不明'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">事業終了（予定）年度</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {projectData.endYear ? `${projectData.endYear}年度` : '終了予定なし'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-600 dark:text-gray-400">データ期間</dt>
              <dd className="font-medium text-gray-900 dark:text-white">
                {dataStartYear}〜{dataEndYear}年度（{yearCount}年間）
              </dd>
            </div>
          </div>
        </section>

        {/* 予算推移グラフ */}
        <BudgetTrendChart data={projectData} />

        {/* 支出先Top10 */}
        <ExpenditureTopList expenditures={projectData.topExpenditures} />

        {/* 支出先別推移グラフ */}
        {projectData.topExpenditures.length > 0 && (
          <ExpenditureTimeSeriesChart
            expenditures={projectData.topExpenditures}
          />
        )}
      </main>
    </div>
  );
}
