'use client';

import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { ProjectIndexItem } from '@/types/report';
import type { Year } from '@/types/rs-system';
import { RECOMMENDED_YEARS } from '@/types/rs-system';
import { ProjectTable } from './ProjectTable';

interface ProjectSearchInterfaceProps {
  projectIndex: ProjectIndexItem[];
  ministries: string[];
}

export function ProjectSearchInterface({
  projectIndex,
  ministries,
}: ProjectSearchInterfaceProps) {
  const [ministryFilter, setMinistryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [yearRangeStart, setYearRangeStart] = useState<Year>(RECOMMENDED_YEARS[0]);
  const [yearRangeEnd, setYearRangeEnd] = useState<Year>(RECOMMENDED_YEARS[RECOMMENDED_YEARS.length - 1]);

  // Fuse.jsでインクリメンタルサーチ
  const fuse = useMemo(
    () =>
      new Fuse(projectIndex, {
        keys: ['projectName', 'ministry'],
        threshold: 0.3,
        includeScore: true,
      }),
    [projectIndex]
  );

  // フィルタリングロジック
  const filteredProjects = useMemo(() => {
    let results = projectIndex;

    // 年度範囲フィルター
    results = results.filter((p) => {
      const start = p.dataStartYear;
      const end = p.dataEndYear;
      // プロジェクトのデータ期間が選択範囲と重複しているか
      return start <= yearRangeEnd && end >= yearRangeStart;
    });

    // 府省庁フィルター
    if (ministryFilter !== 'all') {
      results = results.filter((p) => p.ministry === ministryFilter);
    }

    // 検索クエリ
    if (searchQuery.trim()) {
      const fuseResults = fuse.search(searchQuery);
      const searchResultKeys = new Set(
        fuseResults.map((r) => r.item.projectKey)
      );

      if (ministryFilter !== 'all') {
        // 両方のフィルターを適用
        results = results.filter((p) => searchResultKeys.has(p.projectKey));
      } else {
        // 検索結果のみ
        results = fuseResults.map((r) => r.item);
      }
    }

    return results;
  }, [projectIndex, ministryFilter, searchQuery, fuse, yearRangeStart, yearRangeEnd]);

  // 利用可能な年度リストを生成
  const availableYears = useMemo(() => {
    const years = new Set<Year>();
    projectIndex.forEach((p) => {
      for (let year = p.dataStartYear; year <= p.dataEndYear; year++) {
        years.add(year as Year);
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  }, [projectIndex]);

  return (
    <div className="space-y-6">
      {/* フィルターエリア */}
      <div className="space-y-4">
        {/* 年度範囲フィルター */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="year-start"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              開始年度
            </label>
            <select
              id="year-start"
              value={yearRangeStart}
              onChange={(e) => setYearRangeStart(Number(e.target.value) as Year)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}年度
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="year-end"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              終了年度
            </label>
            <select
              id="year-end"
              value={yearRangeEnd}
              onChange={(e) => setYearRangeEnd(Number(e.target.value) as Year)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}年度
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex items-end">
            <button
              onClick={() => {
                setYearRangeStart(RECOMMENDED_YEARS[0]);
                setYearRangeEnd(RECOMMENDED_YEARS[RECOMMENDED_YEARS.length - 1]);
              }}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              推奨年度に戻す (2016-2024)
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* 府省庁選択 */}
          <div className="flex-1">
            <label
              htmlFor="ministry-filter"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              府省庁で絞り込み
            </label>
            <select
              id="ministry-filter"
              value={ministryFilter}
              onChange={(e) => setMinistryFilter(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">すべて</option>
              {ministries.map((ministry) => (
                <option key={ministry} value={ministry}>
                  {ministry}
                </option>
              ))}
            </select>
          </div>

          {/* 事業名検索 */}
          <div className="flex-1">
            <label
              htmlFor="search-query"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              事業名で検索
            </label>
            <input
              id="search-query"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="キーワードを入力..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
            />
          </div>
        </div>
      </div>

      {/* 検索結果数 */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        検索結果: {filteredProjects.length.toLocaleString()}件
      </div>

      {/* 事業一覧テーブル */}
      <ProjectTable
        projects={filteredProjects}
        yearRangeStart={yearRangeStart}
        yearRangeEnd={yearRangeEnd}
      />
    </div>
  );
}
