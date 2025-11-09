'use client';

import { useState, useEffect } from 'react';
import { useSankeyConfig } from '@/client/hooks/useSankeyConfig';
import type { SankeyConfig } from '@/types/sankey-config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void; // 保存時のコールバック
}

export default function SankeyConfigPanel({ isOpen, onClose, onSaved }: Props) {
  const { config, updateConfig, resetConfig, isLoaded } = useSankeyConfig();
  const [localConfig, setLocalConfig] = useState<SankeyConfig>(config);

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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  色分けする府省庁数
                </label>
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={localConfig.coloredMinistriesCount}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      coloredMinistriesCount: parseInt(e.target.value) || 10,
                    })
                  }
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  予算額上位のN府省庁に色を割り当てます。残りはグレーで表示（デフォルト: 10）
                </p>
              </div>

              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <strong>現在の色マッピング:</strong>
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {Object.entries(localConfig.ministryColorMapping).map(([ministry, color]) => (
                    <div key={ministry} className="flex items-center text-sm">
                      <div
                        className="w-4 h-4 rounded mr-2"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{ministry}</span>
                    </div>
                  ))}
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
