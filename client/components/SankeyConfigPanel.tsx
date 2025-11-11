'use client';

import { useState, useEffect } from 'react';
import { useSankeyConfig } from '@/client/hooks/useSankeyConfig';
import type { SankeyConfig } from '@/types/sankey-config';
import { MINISTRY_BUDGET_2024 } from '@/types/sankey-config';
import { formatBudget } from '@/client/lib/formatBudget';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void; // 保存時のコールバック
}

// HSL to HEX converter
function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

type SortKey = 'name' | 'budget';
type SortOrder = 'asc' | 'desc';

export default function SankeyConfigPanel({ isOpen, onClose, onSaved }: Props) {
  const { config, updateConfig, resetConfig, isLoaded } = useSankeyConfig();
  const [localConfig, setLocalConfig] = useState<SankeyConfig>(config);
  const [sortKey, setSortKey] = useState<SortKey>('budget');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 設定が読み込まれたら、またはダイアログが開かれたら同期
  useEffect(() => {
    if (isLoaded && isOpen) {
      setLocalConfig(config);
    }
  }, [config, isLoaded, isOpen]);

  const handleSave = () => {
    updateConfig(localConfig);
    onSaved?.(); // 保存後にコールバック実行
    onClose();
  };

  const handleReset = () => {
    resetConfig();
    onSaved?.(); // リセット後にコールバック実行
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">サンキー図の設定</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Top N設定 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">事業表示設定</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Top N事業の表示数
                </label>
                <input
                  type="number"
                  min="5"
                  max="50"
                  value={localConfig.topProjectsCount}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, topProjectsCount: parseInt(e.target.value) || 20 })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  全府省庁からTop N事業を表示します（デフォルト: 20）
                </p>
              </div>
            </div>

            {/* 府省庁閾値設定 */}
            <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">府省庁表示設定</h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  閾値タイプ
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={localConfig.ministryThresholdType === 'percentage'}
                      onChange={() =>
                        setLocalConfig({ ...localConfig, ministryThresholdType: 'percentage' })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">割合（%）</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={localConfig.ministryThresholdType === 'absolute'}
                      onChange={() =>
                        setLocalConfig({ ...localConfig, ministryThresholdType: 'absolute' })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">絶対値（億円）</span>
                  </label>
                </div>
              </div>

              {localConfig.ministryThresholdType === 'percentage' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    府省庁予算の閾値（%）
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={localConfig.ministryThresholdPercentage * 100}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        ministryThresholdPercentage: parseFloat(e.target.value) / 100 || 0.01,
                      })
                    }
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">%</span>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    総予算の{(localConfig.ministryThresholdPercentage * 100).toFixed(1)}
                    %未満の府省庁を「その他」にまとめます（デフォルト: 1%）
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    府省庁予算の閾値（億円）
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={localConfig.ministryThreshold / 100000000}
                    onChange={(e) =>
                      setLocalConfig({
                        ...localConfig,
                        ministryThreshold: (parseFloat(e.target.value) || 1000) * 100000000,
                      })
                    }
                    className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">億円</span>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {(localConfig.ministryThreshold / 100000000).toFixed(0)}
                    億円未満の府省庁を「その他」にまとめます（デフォルト: 1000億円）
                  </p>
                </div>
              )}
            </div>

            {/* 色分け設定 */}
            <div className="pb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">色分け設定</h3>

              {/* その他の色設定 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  「残りN」「その他」の色
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex-shrink-0"
                    style={{ backgroundColor: localConfig.othersColor }}
                  />
                  <input
                    type="text"
                    value={localConfig.othersColor}
                    onChange={(e) => {
                      const newColor = e.target.value;
                      const hexValue = newColor.startsWith('#') ? newColor : `#${newColor}`;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(hexValue) && hexValue.length === 7) {
                        setLocalConfig({ ...localConfig, othersColor: hexValue });
                      }
                    }}
                    placeholder="#6b7280"
                    className="w-28 px-2 py-1 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* 府省庁ごとの色設定 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    府省庁ごとの色設定
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        // HUE等分で色を生成
                        const ministries = Object.keys(localConfig.ministryColorMapping);
                        const count = ministries.length;
                        const newMapping: Record<string, string> = {};
                        ministries.forEach((ministry, index) => {
                          const hue = (index * 360) / count;
                          // HSLをHEXに変換
                          const hex = hslToHex(hue, 70, 50);
                          newMapping[ministry] = hex;
                        });
                        setLocalConfig({
                          ...localConfig,
                          ministryColorMapping: newMapping,
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded"
                      title="HUE等分で色を生成"
                    >
                      🌈<span className="hidden sm:inline"> 等分</span>
                    </button>
                    <button
                      onClick={() => {
                        // パステルカラーパレット
                        const pastelColors = [
                          '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
                          '#FFB3E6', '#E6B3FF', '#B3FFE6', '#FFE6B3', '#B3E6FF',
                          '#FFE6E6', '#E6FFE6', '#E6E6FF', '#FFFFE6', '#FFE6FF',
                          '#E6FFFF', '#FFCCCC', '#CCFFCC', '#CCCCFF', '#FFFFCC',
                        ];
                        const ministries = Object.keys(localConfig.ministryColorMapping);
                        const newMapping: Record<string, string> = {};
                        ministries.forEach((ministry, index) => {
                          newMapping[ministry] = pastelColors[index % pastelColors.length];
                        });
                        setLocalConfig({
                          ...localConfig,
                          ministryColorMapping: newMapping,
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 border border-purple-300 dark:border-purple-600 rounded"
                      title="パステルカラーパレット"
                    >
                      🎨<span className="hidden sm:inline"> パステル</span>
                    </button>
                    <button
                      onClick={() => {
                        // 全ランダム色生成（黒・白・グレー系を避ける）
                        const ministries = Object.keys(localConfig.ministryColorMapping);
                        const newMapping: Record<string, string> = {};
                        ministries.forEach((ministry) => {
                          let color;
                          do {
                            const r = Math.floor(Math.random() * 256);
                            const g = Math.floor(Math.random() * 256);
                            const b = Math.floor(Math.random() * 256);
                            // 明度が極端に低い（黒）または高い（白）、彩度が低い（グレー）を避ける
                            const brightness = (r + g + b) / 3;
                            const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(b - r));
                            if (brightness > 40 && brightness < 230 && maxDiff > 30) {
                              color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                              break;
                            }
                          } while (true);
                          newMapping[ministry] = color;
                        });
                        setLocalConfig({
                          ...localConfig,
                          ministryColorMapping: newMapping,
                        });
                      }}
                      className="px-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 border border-green-300 dark:border-green-600 rounded"
                      title="全府省庁にランダムな色を生成"
                    >
                      🎲<span className="hidden sm:inline"> 全ランダム</span>
                    </button>
                  </div>
                </div>
                {/* データグリッド風テーブル */}
                <div className="border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
                        <tr>
                          <th className="px-2 py-2 text-left">
                            <button
                              onClick={() => {
                                if (sortKey === 'name') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortKey('name');
                                  setSortOrder('asc');
                                }
                              }}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <span>色</span>
                            </button>
                          </th>
                          <th className="px-2 py-2 text-left">
                            <button
                              onClick={() => {
                                if (sortKey === 'name') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortKey('name');
                                  setSortOrder('asc');
                                }
                              }}
                              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                            >
                              <span>府省庁</span>
                              {sortKey === 'name' && (
                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-right">
                            <button
                              onClick={() => {
                                if (sortKey === 'budget') {
                                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setSortKey('budget');
                                  setSortOrder('desc');
                                }
                              }}
                              className="flex items-center justify-end gap-1 hover:text-blue-600 dark:hover:text-blue-400 ml-auto"
                            >
                              <span>2024年度予算</span>
                              {sortKey === 'budget' && (
                                <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                              )}
                            </button>
                          </th>
                          <th className="px-2 py-2 text-left">カラーコード</th>
                          <th className="px-2 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(localConfig.ministryColorMapping)
                          .sort((a, b) => {
                            if (sortKey === 'name') {
                              const comparison = a[0].localeCompare(b[0], 'ja');
                              return sortOrder === 'asc' ? comparison : -comparison;
                            } else {
                              const budgetA = MINISTRY_BUDGET_2024[a[0]] || 0;
                              const budgetB = MINISTRY_BUDGET_2024[b[0]] || 0;
                              return sortOrder === 'asc' ? budgetA - budgetB : budgetB - budgetA;
                            }
                          })
                          .map(([ministry, color]) => {
                            const budget = MINISTRY_BUDGET_2024[ministry] || 0;
                            return (
                              <tr key={ministry} className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <td className="px-2 py-2">
                                  <div
                                    className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600"
                                    style={{ backgroundColor: color }}
                                  />
                                </td>
                                <td className="px-2 py-2 text-gray-700 dark:text-gray-300">
                                  {ministry}
                                </td>
                                <td className="px-2 py-2 text-right text-gray-600 dark:text-gray-400 font-mono text-xs">
                                  {formatBudget(budget)}
                                </td>
                                <td className="px-2 py-2">
                                  <input
                                    type="text"
                                    value={color}
                                    onChange={(e) => {
                                      const newColor = e.target.value;
                                      const hexValue = newColor.startsWith('#') ? newColor : `#${newColor}`;
                                      if (/^#[0-9A-Fa-f]{0,6}$/.test(hexValue)) {
                                        setLocalConfig({
                                          ...localConfig,
                                          ministryColorMapping: {
                                            ...localConfig.ministryColorMapping,
                                            [ministry]: hexValue.length === 7 ? hexValue : color,
                                          },
                                        });
                                      }
                                    }}
                                    placeholder="#000000"
                                    className="w-20 px-2 py-1 text-xs font-mono border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                                  />
                                </td>
                                <td className="px-2 py-2">
                                  <button
                                    onClick={() => {
                                      const randomColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
                                      setLocalConfig({
                                        ...localConfig,
                                        ministryColorMapping: {
                                          ...localConfig.ministryColorMapping,
                                          [ministry]: randomColor,
                                        },
                                      });
                                    }}
                                    className="text-sm hover:scale-110 transition-transform"
                                    title="ランダムな色を生成"
                                  >
                                    🎲
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              デフォルトに戻す
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              キャンセル
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
