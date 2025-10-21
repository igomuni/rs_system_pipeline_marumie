'use client';

import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import type { ProjectIndexItem } from '@/types/report';
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
  }, [projectIndex, ministryFilter, searchQuery, fuse]);

  return (
    <div className="space-y-6">
      {/* フィルターエリア */}
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

      {/* 検索結果数 */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        検索結果: {filteredProjects.length.toLocaleString()}件
      </div>

      {/* 事業一覧テーブル */}
      <ProjectTable projects={filteredProjects} />
    </div>
  );
}
