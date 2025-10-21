'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { ProjectTimeSeriesData } from '@/types/report';

interface BudgetTrendChartProps {
  data: ProjectTimeSeriesData;
}

export function BudgetTrendChart({ data }: BudgetTrendChartProps) {
  // チャートデータを生成
  const chartData = Object.entries(data.yearlyData)
    .map(([year, values]) => ({
      year: Number(year),
      budget: values.budget / 100000000, // 億円に変換
      execution: values.execution / 100000000,
    }))
    .sort((a, b) => a.year - b.year);

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        予算・執行額の推移
      </h2>

      <div className="w-full" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
            <XAxis
              dataKey="year"
              stroke="currentColor"
              className="text-gray-600 dark:text-gray-400"
            />
            <YAxis
              label={{
                value: '億円',
                angle: -90,
                position: 'insideLeft',
                className: 'text-gray-600 dark:text-gray-400',
              }}
              stroke="currentColor"
              className="text-gray-600 dark:text-gray-400"
            />
            <Tooltip
              formatter={(value: number) => `${value.toFixed(1)}億円`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
              labelStyle={{ color: '#111827' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="budget"
              name="当初予算"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="execution"
              name="執行額"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
