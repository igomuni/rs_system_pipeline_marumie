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

type SortColumn = 'ministry' | 'projectName' | 'expenditureName' | 'budget' | 'execution';
type SortDirection = 'asc' | 'desc';

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
  const [sortColumn, setSortColumn] = useState<SortColumn>('execution');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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
        // 年度ごとの全プロジェクトの支出先データを読み込み
        const response = await fetch(`/data/year_${year}/yearly-project-expenditures.json`);
        const yearlyExpenditures = await response.json();

        // データを展開
        const details: ExpenditureDetail[] = [];

        // 選択された府省庁のプロジェクトのみを処理
        Object.values(yearlyExpenditures).forEach((project: any) => {
          if (!selectedMinistries.includes(project.ministry)) return;

          if (groupByProject) {
            // 事業名でまとめる
            details.push({
              ministry: project.ministry,
              projectName: project.projectName,
              expenditureName: '', // まとめる場合は空
              budget: project.budget || 0,
              execution: project.totalExecution || 0,
              expenditureCount: project.expenditures?.length || 0,
            });
          } else {
            // 支出先ごとに展開
            if (project.expenditures) {
              for (const exp of project.expenditures) {
                details.push({
                  ministry: project.ministry,
                  projectName: project.projectName,
                  expenditureName: exp.name,
                  budget: project.budget || 0,
                  execution: exp.amount || 0,
                });
              }
            }
          }
        });

        setData(details);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen, selectedMinistries, groupByProject, year]);

  // ソート処理
  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case 'ministry':
          aValue = a.ministry;
          bValue = b.ministry;
          break;
        case 'projectName':
          aValue = a.projectName;
          bValue = b.projectName;
          break;
        case 'expenditureName':
          aValue = a.expenditureName || '';
          bValue = b.expenditureName || '';
          break;
        case 'budget':
          aValue = a.budget;
          bValue = b.budget;
          break;
        case 'execution':
          aValue = a.execution;
          bValue = b.execution;
          break;
        default:
          return 0;
      }

      // 文字列の場合はlocaleCompareを使用
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue, 'ja')
          : bValue.localeCompare(aValue, 'ja');
      }

      // 数値の場合は通常の比較
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  // ソートハンドラー
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // 同じカラムをクリックした場合は方向を反転
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいカラムの場合はdesc（降順）から開始
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // ソートインジケーター
  const getSortIndicator = (column: SortColumn) => {
    if (sortColumn !== column) return '⇅';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

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
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            {/* 府省庁フィルタ */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium mb-2">府省庁フィルタ</label>
              <select
                multiple
                value={selectedMinistries}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setSelectedMinistries(selected);
                }}
                className="w-full h-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {availableMinistries.map((ministry) => (
                  <option key={ministry} value={ministry}>
                    {ministry}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Ctrl/Cmd+クリックで複数選択
              </p>
            </div>

            {/* 支出先まとめトグル */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">支出先</span>
              <button
                onClick={() => setGroupByProject(!groupByProject)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  groupByProject
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    groupByProject ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {groupByProject ? 'まとめる' : '展開'}
              </span>
            </div>
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
                  <th
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                    onClick={() => handleSort('ministry')}
                  >
                    府省庁 {getSortIndicator('ministry')}
                  </th>
                  <th
                    className="px-4 py-2 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => handleSort('projectName')}
                  >
                    事業名 {getSortIndicator('projectName')}
                  </th>
                  <th
                    className={`px-4 py-2 text-left ${
                      groupByProject ? 'whitespace-nowrap' : ''
                    } ${groupByProject ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                    onClick={() => !groupByProject && handleSort('expenditureName')}
                  >
                    {groupByProject ? '支出先件数' : `支出先 ${getSortIndicator('expenditureName')}`}
                  </th>
                  <th
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                    onClick={() => handleSort('budget')}
                  >
                    予算 {getSortIndicator('budget')}
                  </th>
                  <th
                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
                    onClick={() => handleSort('execution')}
                  >
                    支出 {getSortIndicator('execution')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item, idx) => (
                  <tr
                    key={idx}
                    className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-2 whitespace-nowrap">{item.ministry}</td>
                    <td className="px-4 py-2">{item.projectName}</td>
                    <td className={`px-4 py-2 ${groupByProject ? 'whitespace-nowrap' : ''}`}>
                      {groupByProject
                        ? `${item.expenditureCount || 0}件`
                        : item.expenditureName}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{formatBudget(item.budget)}</td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">{formatBudget(item.execution)}</td>
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
