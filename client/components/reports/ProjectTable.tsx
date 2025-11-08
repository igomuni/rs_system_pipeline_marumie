'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import type { ProjectIndexItem } from '@/types/report';
import type { Year } from '@/types/rs-system';
import { formatBudget } from '@/client/lib/formatBudget';

interface ProjectTableProps {
  projects: ProjectIndexItem[];
  yearRangeStart: Year;
  yearRangeEnd: Year;
}

type SortField = 'projectName' | 'ministry' | 'totalBudget';
type SortOrder = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export function ProjectTable({ projects, yearRangeStart, yearRangeEnd }: ProjectTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('totalBudget');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 年度範囲に基づいて総予算を計算
  const calculateFilteredBudget = (project: ProjectIndexItem): number => {
    let total = 0;
    for (let year = yearRangeStart; year <= yearRangeEnd; year++) {
      if (project.yearlyBudgets[year]) {
        total += project.yearlyBudgets[year];
      }
    }
    return total;
  };

  // ソート済みプロジェクトリスト
  const sortedProjects = useMemo(() => {
    const sorted = [...projects].sort((a, b) => {
      let compareValue = 0;

      if (sortField === 'totalBudget') {
        const aTotal = calculateFilteredBudget(a);
        const bTotal = calculateFilteredBudget(b);
        compareValue = aTotal - bTotal;
      } else if (sortField === 'projectName') {
        compareValue = a.projectName.localeCompare(b.projectName, 'ja');
      } else if (sortField === 'ministry') {
        compareValue = a.ministry.localeCompare(b.ministry, 'ja');
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
    return sorted;
  }, [projects, sortField, sortOrder, yearRangeStart, yearRangeEnd]);

  const totalPages = Math.ceil(sortedProjects.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentProjects = sortedProjects.slice(startIndex, endIndex);

  // projectsまたは年度範囲が変更されたらページとソートをリセット
  useEffect(() => {
    setCurrentPage(1);
    setSortField('totalBudget');
    setSortOrder('desc');
  }, [projects, yearRangeStart, yearRangeEnd]);

  // ソート切り替え
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // 同じフィールドをクリックしたら順序を反転
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 新しいフィールドは降順で開始
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1); // ソート変更時はページを1に戻す
  };

  // ページ変更時に先頭にスクロール
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ソートインジケーター
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <span className="ml-1 text-gray-400">⇅</span>;
    }
    return sortOrder === 'asc' ? (
      <span className="ml-1">↑</span>
    ) : (
      <span className="ml-1">↓</span>
    );
  };

  return (
    <div className="space-y-4">
      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                onClick={() => handleSort('projectName')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
              >
                事業名 <SortIcon field="projectName" />
              </th>
              <th
                onClick={() => handleSort('ministry')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
              >
                府省庁 <SortIcon field="ministry" />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                期間
              </th>
              <th
                onClick={() => handleSort('totalBudget')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors select-none"
              >
                総予算 <SortIcon field="totalBudget" />
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                詳細
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {currentProjects.map((project) => (
              <tr
                key={project.projectKey}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                  {project.projectName}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                  {project.ministry}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {project.startYear || project.dataStartYear}〜
                  {project.endYear || project.dataEndYear}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                  {formatBudget(calculateFilteredBudget(project))}
                </td>
                <td className="px-6 py-4 text-center">
                  <Link
                    href={`/reports/${project.projectKey}`}
                    className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                  >
                    詳細 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            ← 前へ
          </button>

          <div className="flex items-center space-x-1">
            {/* 最初のページ */}
            {currentPage > 3 && (
              <>
                <button
                  onClick={() => handlePageChange(1)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  1
                </button>
                {currentPage > 4 && (
                  <span className="px-2 text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )}
              </>
            )}

            {/* 現在ページ周辺 */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === currentPage ||
                  page === currentPage - 1 ||
                  page === currentPage + 1 ||
                  page === currentPage - 2 ||
                  page === currentPage + 2
              )
              .map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                    page === currentPage
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}

            {/* 最後のページ */}
            {currentPage < totalPages - 2 && (
              <>
                {currentPage < totalPages - 3 && (
                  <span className="px-2 text-gray-500 dark:text-gray-400">
                    ...
                  </span>
                )}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            onClick={() =>
              handlePageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            次へ →
          </button>
        </div>
      )}

      {/* ページ情報 */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {startIndex + 1}〜{Math.min(endIndex, sortedProjects.length)} / 全
        {sortedProjects.length}件
      </div>
    </div>
  );
}
