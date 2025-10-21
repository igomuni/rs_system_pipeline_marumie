import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import type { ProjectIndexItem, ProjectTimeSeriesData } from '@/types/report';

const DATA_BASE_PATH = path.join(process.cwd(), 'public', 'data');

/**
 * プロジェクトインデックスを読み込む
 */
export async function loadProjectIndex(): Promise<ProjectIndexItem[]> {
  try {
    const filePath = path.join(DATA_BASE_PATH, 'project-index.json');
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('Error loading project index:', error);
    return [];
  }
}

/**
 * 特定のプロジェクトの詳細データを読み込む（projectKeyで検索）
 */
export async function loadProjectData(
  projectKey: string
): Promise<ProjectTimeSeriesData | null> {
  try {
    const filePath = path.join(DATA_BASE_PATH, 'projects', `${projectKey}.json`);
    const fileContent = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading project ${projectKey}:`, error);
    return null;
  }
}

/**
 * 府省庁のユニークリストを取得
 */
export async function getMinistryList(): Promise<string[]> {
  const projectIndex = await loadProjectIndex();
  const ministries = new Set(projectIndex.map((p) => p.ministry));
  return Array.from(ministries).sort();
}
