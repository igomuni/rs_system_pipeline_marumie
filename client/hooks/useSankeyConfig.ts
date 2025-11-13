'use client';

import { useState, useEffect } from 'react';
import type { SankeyConfig } from '@/types/sankey-config';
import { DEFAULT_SANKEY_CONFIG, SANKEY_CONFIG_STORAGE_KEY } from '@/types/sankey-config';

/**
 * サンキー図の設定を管理するカスタムフック
 */
export function useSankeyConfig() {
  const [config, setConfig] = useState<SankeyConfig>(DEFAULT_SANKEY_CONFIG);
  const [isLoaded, setIsLoaded] = useState(false);

  // LocalStorageから設定を読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SANKEY_CONFIG_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as any;

        // マイグレーション: 古いフィールドを削除
        if ('coloredMinistriesCount' in parsed) {
          delete parsed.coloredMinistriesCount;
        }

        // マイグレーション: othersColorが存在しない場合はデフォルト値を設定
        if (!parsed.othersColor) {
          parsed.othersColor = DEFAULT_SANKEY_CONFIG.othersColor;
        }

        // マイグレーション: differenceColorが存在しない場合はデフォルト値を設定
        if (!parsed.differenceColor) {
          parsed.differenceColor = DEFAULT_SANKEY_CONFIG.differenceColor;
        }

        // マイグレーション: topNが存在しない場合はデフォルト値を設定
        if (!parsed.topN) {
          parsed.topN = DEFAULT_SANKEY_CONFIG.topN;
        }

        // マイグレーション: totalColorが存在しない場合はデフォルト値を設定
        if (!parsed.totalColor) {
          parsed.totalColor = DEFAULT_SANKEY_CONFIG.totalColor;
        }

        // ministryColorMappingをデフォルトとマージ（新しい府省庁を追加）
        if (parsed.ministryColorMapping) {
          const defaultMinistries = Object.keys(DEFAULT_SANKEY_CONFIG.ministryColorMapping);
          const storedMinistries = Object.keys(parsed.ministryColorMapping);
          // デフォルトに存在するが保存されていない府省庁を追加
          defaultMinistries.forEach((ministry) => {
            if (!storedMinistries.includes(ministry)) {
              parsed.ministryColorMapping[ministry] = DEFAULT_SANKEY_CONFIG.ministryColorMapping[ministry];
            }
          });
        } else {
          parsed.ministryColorMapping = DEFAULT_SANKEY_CONFIG.ministryColorMapping;
        }

        setConfig(parsed as SankeyConfig);
      }
    } catch (error) {
      console.error('Failed to load sankey config from localStorage:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // 設定を保存
  const saveConfig = (newConfig: SankeyConfig) => {
    try {
      localStorage.setItem(SANKEY_CONFIG_STORAGE_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error('Failed to save sankey config to localStorage:', error);
      throw error;
    }
  };

  // 設定を部分的に更新
  const updateConfig = (partial: Partial<SankeyConfig>) => {
    const newConfig = { ...config, ...partial };
    saveConfig(newConfig);
  };

  // 設定をデフォルトに戻す
  const resetConfig = () => {
    saveConfig(DEFAULT_SANKEY_CONFIG);
  };

  return {
    config,
    isLoaded,
    saveConfig,
    updateConfig,
    resetConfig,
  };
}
