import { notFound } from 'next/navigation';
import Link from 'next/link';
import { loadProjectData, loadProjectIndex } from '@/server/loaders/report-loader';
import { ProjectDetailView } from '@/client/components/reports/ProjectDetailView';

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProjectDetailView projectData={projectData} />
      </main>
    </div>
  );
}
