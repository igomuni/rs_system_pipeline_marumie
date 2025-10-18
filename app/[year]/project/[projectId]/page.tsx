import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Year } from '@/types/rs-system';
import { AVAILABLE_YEARS } from '@/types/rs-system';
import { checkYearDataExists } from '@/server/repositories/json-repository';
import {
  loadPreprocessedProjectExpenditures,
} from '@/server/loaders/json-data-loader';
import SankeyChart from '@/client/components/SankeyChart';
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

  // 支出データを取得
  const projectExpenditures = await loadPreprocessedProjectExpenditures(year);
  const projectData = projectExpenditures[projectId];

  if (!projectData) {
    notFound();
  }

  // サンキー図データを生成: 事業 → 支出先Top20 + その他 + 不明
  const nodes: SankeyNode[] = [];
  const links: SankeyLink[] = [];

  // 事業ノード
  const projectNode: SankeyNode = {
    id: 'project',
    name: projectData.projectName,
    type: 'project',
    metadata: {
      projectId,
      budget: projectData.budget,
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

  // その他ノード
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

  // 不明ノード（予算と支出の差分）
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <Link href={`/${year}`} className="text-blue-600 hover:underline text-sm whitespace-nowrap">
                ← {year}年度に戻る
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">
                {projectData.projectName}
              </h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
              {/* Stats */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">予算:</span>
                <span className="text-sm font-bold">
                  {(projectData.budget / 100000000).toFixed(1)}億円
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">支出額:</span>
                <span className="text-sm font-bold">
                  {(projectData.totalExpenditureAmount / 100000000).toFixed(1)}億円
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">不明額:</span>
                <span className="text-sm font-bold">
                  {(projectData.unknownAmount / 100000000).toFixed(1)}億円
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">支出先の内訳</h2>
            <p className="text-sm text-gray-600 mt-1">
              予算から支出先への資金の流れを表示しています。
            </p>
          </div>
          <SankeyChart data={sankeyData} year={year} />
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
