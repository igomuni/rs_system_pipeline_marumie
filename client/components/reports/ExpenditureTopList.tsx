'use client';

import type { ExpenditureTimeSeries } from '@/types/report';

interface ExpenditureTopListProps {
  expenditures: ExpenditureTimeSeries[];
}

export function ExpenditureTopList({ expenditures }: ExpenditureTopListProps) {
  // 金額を億円単位でフォーマット
  const formatAmount = (amount: number): string => {
    const oku = amount / 100000000;
    if (oku >= 1) {
      return `${oku.toFixed(0)}億円`;
    }
    const man = amount / 10000;
    return `${man.toFixed(0)}万円`;
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        支出先Top10（全期間累計）
      </h2>

      {expenditures.length === 0 ? (
        <p className="text-gray-600 dark:text-gray-400">
          支出先データがありません
        </p>
      ) : (
        <ol className="space-y-3">
          {expenditures.map((exp, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              <div className="flex items-center flex-1">
                <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full font-semibold text-sm mr-4">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {exp.name}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {exp.yearCount}年間
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAmount(exp.totalAmount)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  累計
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
