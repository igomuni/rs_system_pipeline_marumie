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
        const parsed = JSON.parse(stored) as SankeyConfig;
        setConfig(parsed);
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
