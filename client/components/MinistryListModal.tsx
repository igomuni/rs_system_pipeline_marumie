'use client';

import { useState, useMemo } from 'react';
import { formatBudget } from '@/client/lib/formatBudget';

interface Ministry {
  name: string;
  budget: number;
}

interface MinistryListModalProps {
  isOpen: boolean;
  onClose: () => void;
  ministries: Ministry[];
  title: string;
  onMinistryClick?: (ministryName: string) => void;
}

type SortKey = 'name' | 'budget';
type SortOrder = 'asc' | 'desc';

export default function MinistryListModal({
  isOpen,
  onClose,
  ministries,
  title,
  onMinistryClick,
}: MinistryListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('budget');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // ソート処理
  const sortedMinistries = useMemo(() => {
    const sorted = [...ministries].sort((a, b) => {
      if (sortKey === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name, 'ja')
          : b.name.localeCompare(a.name, 'ja');
      } else {
        return sortOrder === 'asc' ? a.budget - b.budget : b.budget - a.budget;
      }
    });
    return sorted;
  }, [ministries, sortKey, sortOrder]);

  // 検索フィルタリング
  const filteredMinistries = useMemo(() => {
    if (!searchQuery) return sortedMinistries;
    const query = searchQuery.toLowerCase();
    return sortedMinistries.filter((ministry) =>
      ministry.name.toLowerCase().includes(query)
    );
  }, [sortedMinistries, searchQuery]);

  // ソート切り替え
  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key === 'budget' ? 'desc' : 'asc');
    }
  };

  // 合計予算
  const totalBudget = useMemo(
    () => ministries.reduce((sum, ministry) => sum + ministry.budget, 0),
    [ministries]
  );

  const handleRowClick = (ministryName: string) => {
    if (onMinistryClick) {
      onMinistryClick(ministryName);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {ministries.length}府省庁 / 合計予算: {formatBudget(totalBudget)}
          </div>
        </div>

        {/* 検索バー */}
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
          <input
            type="text"
            placeholder="府省庁名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        {/* テーブル */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  #
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    府省庁名
                    {sortKey === 'name' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                    {sortKey !== 'name' && <span className="text-gray-400">⇅</span>}
                  </div>
                </th>
                <th
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                  onClick={() => handleSort('budget')}
                >
                  <div className="flex items-center justify-end gap-1">
                    予算
                    {sortKey === 'budget' && (
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                    {sortKey !== 'budget' && <span className="text-gray-400">⇅</span>}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMinistries.map((ministry, index) => (
                <tr
                  key={index}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    onMinistryClick ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleRowClick(ministry.name)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {ministry.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-mono">
                    {formatBudget(ministry.budget)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredMinistries.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              該当する府省庁が見つかりませんでした
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
