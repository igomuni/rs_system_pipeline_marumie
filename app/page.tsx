import { Suspense } from 'react';
import Link from 'next/link';
import { AVAILABLE_YEARS } from '@/types/rs-system';
import { getAvailableYears } from '@/server/repositories/json-repository';

export default async function HomePage() {
  const availableYears = await getAvailableYears();

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-white dark:bg-gray-900">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">
          行政事業レビュー サンキー図
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          行政事業レビューの予算・執行データを視覚化し、資金の流れを理解しやすくします
        </p>
      </header>

      <main>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">年度を選択</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {AVAILABLE_YEARS.map((year) => {
              const isAvailable = availableYears.includes(year);

              return (
                <Link
                  key={year}
                  href={isAvailable ? `/${year}` : '#'}
                  className={`
                    block p-6 text-center rounded-lg border-2 transition-all
                    ${isAvailable
                      ? 'border-blue-500 dark:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 hover:shadow-lg cursor-pointer'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed opacity-50'
                    }
                  `}
                  aria-disabled={!isAvailable}
                >
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{year}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {isAvailable ? '年度' : 'データなし'}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-gray-900 dark:text-white">このアプリについて</h2>
          <div className="space-y-2 text-gray-700 dark:text-gray-300">
            <p>
              このアプリケーションは、行政事業レビューの公開データを使用して、
              予算から執行までの資金の流れをサンキー図で可視化します。
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>府省庁ごとの予算配分</li>
              <li>支出先への資金の流れ</li>
              <li>契約方式や執行率などの詳細情報</li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="mt-16 pt-8 border-t dark:border-gray-700 text-center text-gray-600 dark:text-gray-400">
        <p>
          データソース:{' '}
          <a
            href="https://www.gyoukaku.go.jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            行政事業レビュー
          </a>
        </p>
      </footer>
    </div>
  );
}
