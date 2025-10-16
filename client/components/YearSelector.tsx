'use client';

import Link from 'next/link';
import type { Year } from '@/types/rs-system';

interface Props {
  currentYear: Year;
  availableYears: readonly Year[];
}

export default function YearSelector({ currentYear, availableYears }: Props) {
  const currentIndex = availableYears.indexOf(currentYear);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < availableYears.length - 1;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="year-select" className="text-sm font-medium text-gray-700">
        年度:
      </label>

      {/* 前の年度ボタン */}
      <Link
        href={hasPrev ? `/${availableYears[currentIndex - 1]}` : '#'}
        className={`px-2 py-1 rounded ${
          hasPrev
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        onClick={(e) => !hasPrev && e.preventDefault()}
        title="前の年度"
      >
        ←
      </Link>

      {/* コンボボックス */}
      <select
        id="year-select"
        value={currentYear}
        onChange={(e) => {
          const year = e.target.value;
          window.location.href = `/${year}`;
        }}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {availableYears.map((year) => (
          <option key={year} value={year}>
            {year}年度
          </option>
        ))}
      </select>

      {/* 次の年度ボタン */}
      <Link
        href={hasNext ? `/${availableYears[currentIndex + 1]}` : '#'}
        className={`px-2 py-1 rounded ${
          hasNext
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
        onClick={(e) => !hasNext && e.preventDefault()}
        title="次の年度"
      >
        →
      </Link>
    </div>
  );
}
