'use client';

import { useState, useEffect, useMemo } from 'react';
import { formatBudget } from '@/client/lib/formatBudget';
import type { Year } from '@/types/rs-system';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  nodeMetadata?: any;
  year: Year;
  availableMinistries: string[];
}

interface ExpenditureDetail {
  ministry: string;
  projectName: string;
  expenditureName: string;
  budget: number;
  execution: number;
  expenditureCount?: number; // まとめた場合の支出先件数
}

export default function SankeyNodeDetailModal({
  isOpen,
  onClose,
  nodeId,
  nodeName,
  nodeType,
  nodeMetadata,
  year,
  availableMinistries,
}: Props) {
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>([]);
  const [groupByProject, setGroupByProject] = useState(true);
  const [data, setData] = useState<ExpenditureDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // ノードタイプに応じた初期設定
  useEffect(() => {
    if (!isOpen) return;

    // デフォルトのフィルタ設定
    if (nodeType === 'ministry') {
      // 府省庁ノードの場合、そのノードの府省庁を選択
      const ministry = nodeMetadata?.ministry || nodeId.replace('ministry_budget_', '').replace('ministry_execution_', '');
      setSelectedMinistries([ministry]);
    } else if (nodeType === 'others') {
      // その他ノードの場合、メタデータから府省庁リストを取得
      const ministryList = nodeMetadata?.ministryList?.map((m: any) => m.name) || [];
      setSelectedMinistries(ministryList);
    } else {
      // 合計ノードの場合、全府省庁を選択
      setSelectedMinistries(availableMinistries);
    }

    // デフォルトのまとめフラグ
    const isBudgetSide = nodeId.includes('budget') || nodeId === 'total_budget';
    const isExecutionSide = nodeId.includes('execution') || nodeId === 'total_execution';
    setGroupByProject(isBudgetSide || isExecutionSide);
  }, [isOpen, nodeId, nodeType, nodeMetadata, availableMinistries]);

  // データ読み込み
  useEffect(() => {
    if (!isOpen || selectedMinistries.length === 0) return;

    async function loadData() {
      setLoading(true);
      try {
        // プロジェクトインデックスを読み込み
        const response = await fetch('/data/project-index.json');
        const projectIndex = await response.json();

        // 選択された府省庁のプロジェクトを抽出
        const filteredProjects = projectIndex.filter((p: any) =>
          selectedMinistries.includes(p.ministry)
        );

        // 各プロジェクトの支出先データを読み込み
        const detailPromises = filteredProjects.map(async (project: any) => {
          try {
            const detailResponse = await fetch(`/data/projects/${project.projectKey}.json`);
            const detail = await detailResponse.json();
            return { ...project, topExpenditures: detail.topExpenditures || [] };
          } catch {
            return { ...project, topExpenditures: [] };
          }
        });

        const projectsWithExpenditures = await Promise.all(detailPromises);

        // データを展開
        const details: ExpenditureDetail[] = [];
        for (const project of projectsWithExpenditures) {
          const yearData = project.yearlyData?.[year];
          if (!yearData) continue;

          if (groupByProject) {
            // 事業名でまとめる
            const totalExecution = project.topExpenditures.reduce(
              (sum: number, exp: any) => sum + (exp.yearlyAmounts?.[year] || 0),
              0
            );
            details.push({
              ministry: project.ministry,
              projectName: project.projectName,
              expenditureName: '', // まとめる場合は空
              budget: yearData.budget || 0,
              execution: totalExecution,
              expenditureCount: project.topExpenditures.length,
            });
          } else {
            // 支出先ごとに展開
            for (const exp of project.topExpenditures) {
              const yearAmount = exp.yearlyAmounts?.[year] || 0;
              if (yearAmount > 0) {
                details.push({
                  ministry: project.ministry,
                  projectName: project.projectName,
                  expenditureName: exp.name,
                  budget: yearData.budget || 0,
                  execution: yearAmount,
                });
              }
            }
          }
        }

        setData(details);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, selectedMinistries, groupByProject, year]);

  // ソート済みデータ（支出金額降順）
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => b.execution - a.execution);
  }, [data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold">{nodeName} - 詳細</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {/* フィルタ設定 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* 府省庁フィルタ */}
          <div>
            <label className="block text-sm font-medium mb-2">府省庁フィルタ（複数選択可）</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {availableMinistries.map((ministry) => (
                <label key={ministry} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedMinistries.includes(ministry)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedMinistries([...selectedMinistries, ministry]);
                      } else {
                        setSelectedMinistries(selectedMinistries.filter((m) => m !== ministry));
                      }
                    }}
                    className="mr-1"
                  />
                  <span className="text-sm">{ministry}</span>
                </label>
              ))}
            </div>
          </div>

          {/* まとめフラグ */}
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={groupByProject}
                onChange={(e) => setGroupByProject(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium">支出先をまとめる（事業名でグループ化）</span>
            </label>
          </div>
        </div>

        {/* データテーブル */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">読み込み中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left">府省庁</th>
                  <th className="px-4 py-2 text-left">事業名</th>
                  <th className="px-4 py-2 text-left">
                    {groupByProject ? '支出先件数' : '支出先'}
                  </th>
                  <th className="px-4 py-2 text-right">予算</th>
                  <th className="px-4 py-2 text-right">支出金額</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-2">{item.ministry}</td>
                    <td className="px-4 py-2">{item.projectName}</td>
                    <td className="px-4 py-2">
                      {groupByProject
                        ? `${item.expenditureCount || 0}件`
                        : item.expenditureName}
                    </td>
                    <td className="px-4 py-2 text-right">{formatBudget(item.budget)}</td>
                    <td className="px-4 py-2 text-right">{formatBudget(item.execution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {sortedData.length.toLocaleString()}件
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
