/**
 * プロジェクトインデックスからeventId → projectKeyのマッピングを取得
 */

interface ProjectIndexItem {
  projectKey: string;
  projectName: string;
  ministry: string;
  yearlyBudgets: Record<string, number>;
}

let projectIndexCache: ProjectIndexItem[] | null = null;
let eventIdToKeyCache: Map<number, string> | null = null;

/**
 * プロジェクトインデックスをロード
 */
async function loadProjectIndex(): Promise<ProjectIndexItem[]> {
  if (projectIndexCache) {
    return projectIndexCache;
  }

  const response = await fetch('/data/project-index.json');
  if (!response.ok) {
    throw new Error('Failed to load project index');
  }

  const data: ProjectIndexItem[] = await response.json();
  projectIndexCache = data;
  return data;
}

/**
 * eventIdからprojectKeyを取得
 * 注: eventIdは年度ごとに異なるため、プロジェクト名で一致させる
 */
export async function getProjectKeyByEventId(eventId: number): Promise<string | null> {
  // インデックスをロード
  const index = await loadProjectIndex();

  // eventIdからprojectKeyへの直接マッピングは存在しないため、
  // サンキー図データから事業名を取得してマッピングする必要がある
  // ここでは、キャッシュを返すのみ
  return null;
}

/**
 * プロジェクト名からprojectKeyを取得
 */
export async function getProjectKeyByName(projectName: string): Promise<string | null> {
  const index = await loadProjectIndex();
  const project = index.find((p) => p.projectName === projectName);
  return project?.projectKey || null;
}

/**
 * 全プロジェクトのインデックスを取得
 */
export async function getAllProjects(): Promise<ProjectIndexItem[]> {
  return loadProjectIndex();
}
