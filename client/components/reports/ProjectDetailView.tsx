'use client';

import { useState, useMemo } from 'react';
import type { ProjectTimeSeriesData } from '@/types/report';
import type { Year } from '@/types/rs-system';
import { RECOMMENDED_YEARS } from '@/types/rs-system';
import { BudgetTrendChart } from './BudgetTrendChart';
import { ExpenditureTopList } from './ExpenditureTopList';
import { ExpenditureTimeSeriesChart } from './ExpenditureTimeSeriesChart';

interface ProjectDetailViewProps {
  projectData: ProjectTimeSeriesData;
}

export function ProjectDetailView({ projectData }: ProjectDetailViewProps) {
  // データ年度範囲を計算
  const allYears = useMemo(() => {
    return Object.keys(projectData.yearlyData)
      .map(Number)
      .sort((a, b) => a - b) as Year[];
  }, [projectData.yearlyData]);

  const dataStartYear = allYears[0];
  const dataEndYear = allYears[allYears.length - 1];

  // 推奨年度のうち、データが存在する範囲を計算
  const recommendedYears = useMemo(() => {
    const start = Math.max(RECOMMENDED_YEARS[0], dataStartYear) as Year;
    const end = Math.min(RECOMMENDED_YEARS[RECOMMENDED_YEARS.length - 1], dataEndYear) as Year;
    return { start, end };
  }, [dataStartYear, dataEndYear]);

  const [yearRangeStart, setYearRangeStart] = useState<Year>(recommendedYears.start);
  const [yearRangeEnd, setYearRangeEnd] = useState<Year>(recommendedYears.end);

  // 年度範囲でフィルタリングしたデータを生成
  const filteredData = useMemo(() => {
    const filteredYearlyData: Record<string, any> = {};

    allYears.forEach((year) => {
      if (year >= yearRangeStart && year <= yearRangeEnd) {
        filteredYearlyData[year] = projectData.yearlyData[year];
      }
    });

    // 支出先データを年度範囲でフィルタリング・再集計
    const expenditureMap = new Map<string, {
      name: string;
      totalAmount: number;
      yearCount: number;
      yearlyAmounts: Record<number, number>;
    }>();

    projectData.topExpenditures.forEach((exp) => {
      let totalAmount = 0;
      let yearCount = 0;
      const yearlyAmounts: Record<number, number> = {};

      Object.entries(exp.yearlyAmounts).forEach(([yearStr, amount]) => {
        const year = Number(yearStr) as Year;
        if (year >= yearRangeStart && year <= yearRangeEnd) {
          totalAmount += amount;
          yearlyAmounts[year] = amount;
          yearCount++;
        }
      });

      if (totalAmount > 0) {
        expenditureMap.set(exp.name, {
          name: exp.name,
          totalAmount,
          yearCount,
          yearlyAmounts,
        });
      }
    });

    // Top10を抽出（金額降順）
    const filteredExpenditures = Array.from(expenditureMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    return {
      ...projectData,
      yearlyData: filteredYearlyData,
      topExpenditures: filteredExpenditures,
    };
  }, [projectData, allYears, yearRangeStart, yearRangeEnd]);

  const filteredYearCount = Object.keys(filteredData.yearlyData).length;

  return (
    <div className="space-y-8">
      {/* 事業基本情報 */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {projectData.projectName}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <dt className="text-gray-600 dark:text-gray-400">府省庁</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {projectData.ministry}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600 dark:text-gray-400">事業開始年度</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {projectData.startYear ? `${projectData.startYear}年度` : '不明'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600 dark:text-gray-400">事業終了（予定）年度</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {projectData.endYear ? `${projectData.endYear}年度` : '終了予定なし'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-600 dark:text-gray-400">データ期間</dt>
            <dd className="font-medium text-gray-900 dark:text-white">
              {dataStartYear}〜{dataEndYear}年度（{allYears.length}年間）
            </dd>
          </div>
        </div>
      </section>

      {/* 年度範囲フィルター */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          表示年度範囲
        </h3>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label
              htmlFor="detail-year-start"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              開始年度
            </label>
            <select
              id="detail-year-start"
              value={yearRangeStart}
              onChange={(e) => setYearRangeStart(Number(e.target.value) as Year)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}年度
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label
              htmlFor="detail-year-end"
              className="block text-sm font-medium mb-2 dark:text-gray-200"
            >
              終了年度
            </label>
            <select
              id="detail-year-end"
              value={yearRangeEnd}
              onChange={(e) => setYearRangeEnd(Number(e.target.value) as Year)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {allYears.map((year) => (
                <option key={year} value={year}>
                  {year}年度
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 flex items-end">
            <button
              onClick={() => {
                setYearRangeStart(recommendedYears.start);
                setYearRangeEnd(recommendedYears.end);
              }}
              className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              推奨年度に戻す ({recommendedYears.start}-{recommendedYears.end})
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          表示中: {yearRangeStart}〜{yearRangeEnd}年度（{filteredYearCount}年間）
        </div>
      </section>

      {/* 予算推移グラフ */}
      <BudgetTrendChart data={filteredData} />

      {/* 支出先Top10 */}
      <ExpenditureTopList expenditures={filteredData.topExpenditures} />

      {/* 支出先別推移グラフ */}
      {filteredData.topExpenditures.length > 0 && (
        <ExpenditureTimeSeriesChart
          expenditures={filteredData.topExpenditures}
        />
      )}
    </div>
  );
}
