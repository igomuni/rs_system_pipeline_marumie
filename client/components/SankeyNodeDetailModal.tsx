'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [projectNameFilter, setProjectNameFilter] = useState('');
  const [expenditureNameFilter, setExpenditureNameFilter] = useState('');

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

  // フィルタリングとソート処理
  const sortedData = useMemo(() => {
    // テキストフィルタリング
    let filtered = data.filter((item) => {
      const matchProject = projectNameFilter === '' || item.projectName.toLowerCase().includes(projectNameFilter.toLowerCase());
      const matchExpenditure = expenditureNameFilter === '' || item.expenditureName.toLowerCase().includes(expenditureNameFilter.toLowerCase());
      return matchProject && matchExpenditure;
    });

    // ソート
    const sorted = [...filtered].sort((a, b) => {
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
  }, [data, sortColumn, sortDirection, projectNameFilter, expenditureNameFilter]);

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

  // ドロップダウン外クリックで閉じる
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 府省庁トグル
  const toggleMinistry = (ministry: string) => {
    setSelectedMinistries((prev) =>
      prev.includes(ministry) ? prev.filter((m) => m !== ministry) : [...prev, ministry]
    );
  };

  // 全選択/全解除
  const toggleAllMinistries = () => {
    if (selectedMinistries.length === availableMinistries.length) {
      setSelectedMinistries([]);
    } else {
      setSelectedMinistries(availableMinistries);
    }
  };

  // ドロップダウン表示テキスト
  const getDropdownDisplayText = () => {
    if (selectedMinistries.length === 0) return 'すべて';
    if (selectedMinistries.length === 1) return selectedMinistries[0];
    return `選択中 (${selectedMinistries.length}/${availableMinistries.length})`;
  };

  // 全体統計とフィルター後統計の計算
  const [allYearlyData, setAllYearlyData] = useState<any>(null);

  // 全データ読み込み（統計用）
  useEffect(() => {
    if (!isOpen) return;

    async function loadAllData() {
      try {
        const response = await fetch(`/data/year_${year}/yearly-project-expenditures.json`);
        const data = await response.json();
        setAllYearlyData(data);
      } catch (error) {
        console.error('Failed to load all data:', error);
      }
    }
    loadAllData();
  }, [isOpen, year]);

  // 全体統計（フィルター前）
  const overallStatistics = useMemo(() => {
    if (!allYearlyData) return { totalBudget: 0, projectCount: 0, totalExecution: 0, expenditureCount: 0 };

    const projects = Object.values(allYearlyData) as any[];
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
    const totalExecution = projects.reduce((sum, p) => sum + (p.totalExecution || 0), 0);
    const expenditureCount = projects.reduce((sum, p) => sum + (p.expenditures?.length || 0), 0);

    return {
      totalBudget,
      projectCount: projects.length,
      totalExecution,
      expenditureCount,
    };
  }, [allYearlyData]);

  // フィルター後統計
  const filteredStatistics = useMemo(() => {
    const uniqueProjects = new Set(data.map((d) => d.projectName));
    const totalBudget = data.reduce((sum, d) => sum + d.budget, 0);
    const totalExecution = data.reduce((sum, d) => sum + d.execution, 0);
    const expenditureCount = groupByProject
      ? data.reduce((sum, d) => sum + (d.expenditureCount || 0), 0)
      : data.length;

    return {
      totalBudget,
      projectCount: uniqueProjects.size,
      totalExecution,
      expenditureCount,
    };
  }, [data, groupByProject]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] h-[90vh] flex flex-col">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-xl font-bold">予算と支出詳細</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          {/* 全体統計 */}
          <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-medium">総予算: </span>
              <span className="text-gray-900 dark:text-white">{formatBudget(overallStatistics.totalBudget)}</span>
            </div>
            <div>
              <span className="font-medium">事業数: </span>
              <span className="text-gray-900 dark:text-white">{overallStatistics.projectCount.toLocaleString()}</span>
            </div>
            <div>
              <span className="font-medium">総支出: </span>
              <span className="text-gray-900 dark:text-white">{formatBudget(overallStatistics.totalExecution)}</span>
            </div>
            <div>
              <span className="font-medium">支出先数: </span>
              <span className="text-gray-900 dark:text-white">{overallStatistics.expenditureCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* フィルタ設定 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col gap-3">
            {/* 1行目: 府省庁フィルタと支出先まとめチェックボックス */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* 府省庁フィルタ（カスタムドロップダウン） */}
              <div className="w-64 relative" ref={dropdownRef}>
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">府省庁</label>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full px-3 py-0 text-sm text-left border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                >
                  <span className="truncate">{getDropdownDisplayText()}</span>
                  <span className="ml-2 text-gray-400 text-lg">▾</span>
                </button>

                {isDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-64 overflow-y-auto">
                    {/* 全選択/全解除 */}
                    <label className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedMinistries.length === availableMinistries.length}
                        onChange={toggleAllMinistries}
                        className="mr-2"
                      />
                      <span className="text-sm font-medium">すべて選択/解除</span>
                    </label>

                    {/* 府省庁リスト */}
                    {availableMinistries.map((ministry) => (
                      <label
                        key={ministry}
                        className="flex items-center px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedMinistries.includes(ministry)}
                          onChange={() => toggleMinistry(ministry)}
                          className="mr-2"
                        />
                        <span className="text-sm">{ministry}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 支出先まとめチェックボックス */}
              <div className="flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  id="groupByProject"
                  checked={groupByProject}
                  onChange={(e) => setGroupByProject(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="groupByProject" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  支出先をまとめる
                </label>
              </div>
            </div>

            {/* 2行目: テキスト検索 */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* 事業名フィルタ */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">事業名</label>
                <input
                  type="text"
                  value={projectNameFilter}
                  onChange={(e) => setProjectNameFilter(e.target.value)}
                  placeholder="事業名で検索"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 支出先フィルタ */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium mb-1 text-gray-700 dark:text-gray-300">支出先</label>
                <input
                  type="text"
                  value={expenditureNameFilter}
                  onChange={(e) => setExpenditureNameFilter(e.target.value)}
                  placeholder="支出先で検索"
                  disabled={groupByProject}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* データテーブル */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">読み込み中...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700 z-[5] shadow-sm">
                <tr className="border-b-2 border-gray-300 dark:border-gray-600">
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
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-2">
            {/* フィルター後統計 */}
            <div className="flex gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div>
                <span className="font-medium">予算額: </span>
                <span className="text-gray-900 dark:text-white">{formatBudget(filteredStatistics.totalBudget)}</span>
              </div>
              <div>
                <span className="font-medium">事業数: </span>
                <span className="text-gray-900 dark:text-white">{filteredStatistics.projectCount.toLocaleString()}</span>
              </div>
              <div>
                <span className="font-medium">支出額: </span>
                <span className="text-gray-900 dark:text-white">{formatBudget(filteredStatistics.totalExecution)}</span>
              </div>
              <div>
                <span className="font-medium">支出先数: </span>
                <span className="text-gray-900 dark:text-white">{filteredStatistics.expenditureCount.toLocaleString()}</span>
              </div>
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
    </div>
  );
}
