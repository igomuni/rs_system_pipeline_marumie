import { loadProjectIndex, getMinistryList } from '@/server/loaders/report-loader';
import { ProjectSearchInterface } from '@/client/components/reports/ProjectSearchInterface';
import Link from 'next/link';

export const metadata = {
  title: '事業レポート | 行政事業レビュー',
  description: '行政事業の予算推移と支出先を分析',
};

export default async function ReportsPage() {
  const [projectIndex, ministries] = await Promise.all([
    loadProjectIndex(),
    getMinistryList(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ヘッダー */}
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              事業レポート
            </h1>
            <Link
              href="/"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              ← トップに戻る
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
          <li className="text-gray-900 dark:text-gray-200 font-medium">
            事業レポート
          </li>
        </ol>
      </nav>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              事業検索
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              府省庁や事業名で絞り込んで、予算推移や支出先の詳細を確認できます
            </p>
          </div>

          <ProjectSearchInterface
            projectIndex={projectIndex}
            ministries={ministries}
          />
        </div>
      </main>
    </div>
  );
}
