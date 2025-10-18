'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Year } from '@/types/rs-system';

interface Ministry {
  name: string;
  budget: number;
}

interface Props {
  ministries: Ministry[];
  year: Year;
  selectedMinistry?: string;
}

export default function MinistryFilter({ ministries, year, selectedMinistry }: Props) {
  const router = useRouter();

  // 金額を適切な単位でフォーマット
  const formatAmount = (amount: number): string => {
    if (amount >= 1000000000000) {
      return `${(amount / 1000000000000).toFixed(1)}兆円`;
    } else if (amount >= 100000000) {
      return `${(amount / 100000000).toFixed(0)}億円`;
    } else if (amount >= 10000) {
      return `${(amount / 10000).toFixed(0)}万円`;
    } else {
      return `${amount.toFixed(0)}円`;
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'all') {
      router.push(`/${year}`);
    } else {
      router.push(`/${year}?ministry=${encodeURIComponent(value)}`);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
      <h2 className="font-semibold mb-3">府省庁フィルター</h2>

      {/* モバイル: セレクトボックス */}
      <div className="lg:hidden">
        <select
          value={selectedMinistry || 'all'}
          onChange={handleSelectChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">すべて</option>
          {ministries.map((ministry) => (
            <option key={ministry.name} value={ministry.name}>
              {ministry.name} ({formatAmount(ministry.budget)})
            </option>
          ))}
        </select>
      </div>

      {/* デスクトップ: リスト表示 */}
      <div className="hidden lg:block space-y-2">
        <Link
          href={`/${year}`}
          className={`block px-3 py-2 rounded ${
            !selectedMinistry
              ? 'bg-blue-100 text-blue-700 font-medium'
              : 'hover:bg-gray-100'
          }`}
        >
          すべて
        </Link>
        {ministries.map((ministry) => (
          <Link
            key={ministry.name}
            href={`/${year}?ministry=${encodeURIComponent(ministry.name)}`}
            className={`block px-3 py-2 rounded text-sm ${
              selectedMinistry === ministry.name
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className="font-medium">{ministry.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {formatAmount(ministry.budget)}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
