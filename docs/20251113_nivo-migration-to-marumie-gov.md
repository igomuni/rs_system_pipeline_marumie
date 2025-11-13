# Nivo版サンキー図の新リポジトリ移行計画

**作成日**: 2025-11-13
**対象リポジトリ**: `marumie-gov`
**移行元**: `rs_system_pipeline_marumie` (feature/sankey-topology-based ブランチ)

## 1. 移行の背景と目的

### なぜ分離するか

現在の `rs_system_pipeline_marumie` リポジトリには2つの異なるサンキー図実装が混在しています:

1. **D3版** (`SankeyChart.tsx`): カスタムレイアウトアルゴリズム、クライアント側フィルタリング
2. **Nivo版** (`SankeyChartNivo.tsx`): トポロジーベースの4列レイアウト、事前生成データ

これらは設計思想が異なり、同一リポジトリでの管理が複雑になっています:

- **設定UIの分岐**: 府省庁閾値設定はD3版のみ適用可能
- **データ生成ロジックの二重管理**: 同じ前処理スクリプト内に2つのSankey生成関数
- **依存関係の違い**: D3版は `d3-sankey`、Nivo版は `@nivo/sankey`

### 期待される効果

- **シンプルな構成**: 各リポジトリが1つの実装に集中
- **独立したリリースサイクル**: Nivo版の改善がD3版に影響しない
- **明確な責任範囲**: データ前処理とUI実装の分離

## 2. アーキテクチャ比較

### D3版の特徴

```
[Raw CSV] → [前処理: sankey.json] → [クライアント側フィルタリング] → [D3レンダリング]
```

- **利点**: 柔軟なフィルタリング、カスタムレイアウト
- **欠点**: クライアント側の計算負荷、複雑なロジック

### Nivo版の特徴（移行対象）

```
[Raw CSV] → [前処理: sankey-main-topology-nivo.json] → [Nivoレンダリング]
```

- **利点**: シンプルな実装、標準化されたUI、パフォーマンス最適化
- **欠点**: ランタイムフィルタリング不可、事前計算必須

## 3. 移行対象ファイル

### 必須ファイル（コア機能）

#### フロントエンド

```
client/
├── components/
│   ├── SankeyChartNivo.tsx                    # Nivoサンキー図本体
│   ├── SankeyChartNivoWithSettings.tsx        # 設定パネル統合
│   ├── SankeyConfigPanel.tsx                  # 色設定UI
│   ├── SankeyNodeDetailModal.tsx              # ノード詳細モーダル
│   ├── ExpenditureListModal.tsx               # 支出先一覧モーダル
│   ├── MinistryListModal.tsx                  # 府省庁一覧モーダル
│   ├── ProjectListModal.tsx                   # 事業一覧モーダル
│   └── YearSelector.tsx                       # 年度選択UI
├── hooks/
│   └── useSankeyConfig.ts                     # 設定管理フック
└── lib/
    ├── expenditureLoader.ts                   # 支出先データローダー
    ├── formatBudget.ts                        # 金額フォーマット
    ├── projectIndex.ts                        # 事業インデックス
    └── projectKey.ts                          # MD5ハッシュ生成
```

#### バックエンド

```
server/
├── loaders/
│   └── data-loader.ts                         # サンキーデータローダー
└── lib/
    └── sankey-transformer.ts                  # データ変換ロジック
```

#### 前処理スクリプト

```
scripts/
├── preprocess-data.ts                         # CSV→JSON変換
│   └── generate4ColumnTopologyBasedSankeyData() # Nivo用データ生成関数
└── download-data.js                           # GitHub Releaseからダウンロード
```

#### 型定義

```
types/
├── sankey.ts                                  # サンキー図型定義
├── sankey-config.ts                           # 設定型定義
├── rs-system.ts                               # 政府予算データ型
└── report.ts                                  # 事業レポート型
```

#### Next.jsページ

```
app/
├── [year]/page.tsx                            # 年度別ページ
└── page.tsx                                   # トップページ（年度選択）
```

### 設定ファイル

```
package.json                                   # 依存関係（@nivo/sankey必須）
tsconfig.json                                  # TypeScript設定
tailwind.config.ts                             # Tailwind CSS設定
next.config.mjs                                # Next.js設定
.gitignore                                     # 除外ファイル設定
```

### データファイル（.gitignore対象）

```
data/rs_system/year_YYYY/*.csv                 # 元データ（約150MB/年）
public/data/year_YYYY/sankey-main-topology-nivo.json  # Nivo用JSON（約11KB/年）
public/data/year_YYYY/ministries.json          # 府省庁一覧
public/data/year_YYYY/ministry-projects.json   # 府省庁別事業数
```

### 不要なファイル（D3版のみで使用）

```
client/components/SankeyChart.tsx              # D3版サンキー図（削除）
client/components/SankeyChartWithSettings.tsx  # D3版設定統合（削除）
client/lib/sankeyDrilldown.ts                  # ドリルダウンロジック（削除）
client/lib/sankeyFilter.ts                     # フィルタリングロジック（削除）
public/data/year_YYYY/sankey.json              # D3版データ（削除）
```

## 4. 依存関係

### 必須パッケージ

```json
{
  "dependencies": {
    "@nivo/sankey": "^0.87.0",
    "next": "15.0.3",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "csv-parse": "^5.6.0",
    "typescript": "^5"
  }
}
```

### 削除可能なパッケージ

```json
{
  "d3": "^7.9.0",              // D3版のみで使用
  "d3-sankey": "^0.12.3"       // D3版のみで使用
}
```

## 5. データパイプライン

### 前処理フロー

```bash
# 1. CSVファイルを配置
data/rs_system/year_2023/
├── 2-1_予算・執行_サマリ.csv
├── 5-1_支出先_支出情報.csv
└── ...

# 2. 前処理実行（全年度）
npm run preprocess

# 3. 生成されるJSON（Nivo用）
public/data/year_2023/
├── sankey-main-topology-nivo.json  # トポロジーベースSankey
├── ministries.json                  # 府省庁一覧
└── ministry-projects.json           # 府省庁別事業数
```

### 重要な実装詳細

#### 支出額集計ロジック（2024年11月修正）

```typescript
// 事業ごとに支出先を集約してから府省庁ごとに合計（重複回避）
const projectsByName = new Map<string, string>(); // projectName -> ministry

// 1. 予算データから事業と府省庁のマッピングを作成
currentYearBudgetData.forEach((budget) => {
  const projectName = budget.事業名;
  const ministry = budget.府省庁;
  if (!projectName || !ministry) return;
  projectsByName.set(projectName, ministry);
});

// 2. 事業ごとに支出先を集約
const projectExpenditures = new Map<string, { ministry: string; expenditures: Map<string, number> }>();

currentYearExpenditureData.forEach((exp) => {
  const projectName = exp.事業名;
  if (!projectName) return;

  // 予算データに存在する事業のみ処理（yearlyと同じロジック）
  const ministry = projectsByName.get(projectName);
  if (!ministry) return;

  const expenditureName = exp.支出先名;
  if (!expenditureName) return;

  const expenditureAmount = normalizeAmount(exp.金額 || exp['支出額（百万円）'] || 0, year);
  if (!expenditureAmount) return;

  // 事業ごとに支出先を集約
  const projectKey = `${ministry}_${projectName}`;
  if (!projectExpenditures.has(projectKey)) {
    projectExpenditures.set(projectKey, { ministry, expenditures: new Map() });
  }

  const project = projectExpenditures.get(projectKey)!;
  const currentAmount = project.expenditures.get(expenditureName) || 0;
  project.expenditures.set(expenditureName, currentAmount + expenditureAmount);
});

// 3. 府省庁ごとの支出額を計算
projectExpenditures.forEach((project) => {
  const ministry = project.ministry;
  const totalProjectExecution = Array.from(project.expenditures.values()).reduce((sum, amount) => sum + amount, 0);
  ministryData.get(ministry)!.execution += totalProjectExecution;
});
```

**修正理由**: 直接CSV行を集計すると、同じ支出先への複数支払いを重複カウントしていた（6.5倍のインフレーション）。事業レベルで集約することで正確な金額を算出。

## 6. ビルドとデプロイ

### 開発環境セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/your-org/marumie-gov.git
cd marumie-gov

# 2. 依存関係インストール
npm install

# 3. CSVデータ配置（Gitには含まれない）
# data/rs_system/year_YYYY/*.csv を手動配置

# 4. 前処理実行
npm run preprocess

# 5. 開発サーバー起動
npm run dev
```

### 本番ビルド

```bash
# 1. 型チェック
npm run typecheck

# 2. Lint実行
npm run lint

# 3. ビルド（前処理済みデータをGitHub Releaseからダウンロード）
npm run build

# 4. 本番サーバー起動
npm start
```

### GitHub Actions（推奨）

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run build

      # Vercel/Netlify等へのデプロイ
```

## 7. 設定の分離

### Nivo版で不要な設定

`SankeyConfigPanel.tsx` で以下を非表示:

```typescript
<SankeyConfigPanel
  isOpen={isConfigPanelOpen}
  onClose={() => setIsConfigPanelOpen(false)}
  showProjectSettings={false}        // 事業表示設定（不要）
  showMinistryThreshold={false}      // 府省庁閾値設定（不要）
/>
```

**理由**: Nivo版は事前生成データを使用するため、クライアント側でのフィルタリング設定は適用できない。色設定のみが有効。

### 必要な設定

- **40府省庁の色設定**: すべてlocalStorageに保存、ランタイム適用可能
- **色生成ツール**: HUE分布、パステルパレット、ランダム色
- **ダークモード対応**: Tailwind CSSのdark:クラス

## 8. テスト戦略

### 手動テストチェックリスト

- [ ] 全年度（2016-2024）でサンキー図が正常に表示される
- [ ] ノードクリックでモーダルが開く
- [ ] 府省庁フィルターが動作する（チェックボックス、検索）
- [ ] 支出先一覧モーダルが表示される（検索、ソート）
- [ ] 色設定変更が即座に反映される
- [ ] ダークモードが正常に動作する
- [ ] モバイル表示が適切にレスポンシブ対応している

### データ整合性チェック

```bash
# 各年度のSankeyデータを検証
for year in {2016..2024}; do
  echo "Checking year $year..."
  node -e "
    const data = require('./public/data/year_$year/sankey-main-topology-nivo.json');
    const budgetNode = data.nodes.find(n => n.id === 'total_budget');
    const executionNode = data.nodes.find(n => n.id === 'total_execution');
    console.log(\`Budget: \${budgetNode.metadata.budget}\`);
    console.log(\`Execution: \${executionNode.metadata.execution}\`);
  "
done
```

### 期待される結果

- 予算総計と支出総計の合計値が妥当な範囲（1-14%以内の誤差は許容）
- ノード数とリンク数が一定の範囲内
- 全ノードに適切なmetadataが設定されている

## 9. 移行手順チェックリスト

### Phase 1: リポジトリ作成とチェックアウト

```bash
# 1. GitHub上でリポジトリ作成
# https://github.com/new で `marumie-gov` を作成（Public/Private選択）

# 2. ローカルにクローン
git clone https://github.com/your-username/marumie-gov.git
cd marumie-gov

# 3. 初期commit（README等）
echo "# marumie-gov" > README.md
git add README.md
git commit -m "chore: 初期コミット"
git push origin main
```

- [ ] GitHub上で `marumie-gov` リポジトリを作成
- [ ] ローカルにクローン
- [ ] 初期commitを作成してpush

### Phase 2: 新しいVS Code Workspaceでの開発環境準備

```bash
# 1. 新しいVS Code Workspaceを開く
code marumie-gov

# 2. Claude Codeを起動
# VS Code内でClaude Code拡張を起動

# 3. 移行元のパスを確認
# 例: /Users/igomuni/MyGitHub/rs_system_pipeline_marumie
```

- [ ] 新しいVS Code Workspaceで `marumie-gov` を開く
- [ ] Claude Codeを起動
- [ ] 移行元リポジトリのパスを確認

### Phase 3: ローカルでファイルコピー

```bash
# 移行元のパス（例）
SOURCE_DIR="/Users/igomuni/MyGitHub/rs_system_pipeline_marumie"
TARGET_DIR="."

# 1. 必須ディレクトリをコピー
cp -r $SOURCE_DIR/app $TARGET_DIR/
cp -r $SOURCE_DIR/client $TARGET_DIR/
cp -r $SOURCE_DIR/server $TARGET_DIR/
cp -r $SOURCE_DIR/scripts $TARGET_DIR/
cp -r $SOURCE_DIR/types $TARGET_DIR/
cp -r $SOURCE_DIR/public $TARGET_DIR/  # 構造のみ（データは後で生成）

# 2. 設定ファイルをコピー
cp $SOURCE_DIR/package.json $TARGET_DIR/
cp $SOURCE_DIR/tsconfig.json $TARGET_DIR/
cp $SOURCE_DIR/tailwind.config.ts $TARGET_DIR/
cp $SOURCE_DIR/next.config.mjs $TARGET_DIR/
cp $SOURCE_DIR/.gitignore $TARGET_DIR/
cp $SOURCE_DIR/postcss.config.js $TARGET_DIR/

# 3. CSVデータをコピー（開発用）
mkdir -p $TARGET_DIR/data
cp -r $SOURCE_DIR/data/rs_system $TARGET_DIR/data/
```

- [ ] 必須ディレクトリ（app, client, server, scripts, types, public）をコピー
- [ ] 設定ファイル（package.json, tsconfig.json等）をコピー
- [ ] CSVデータをコピー（data/rs_system/）

### Phase 4: ローカル起動確認（初回）

```bash
# 1. 依存関係インストール
npm install

# 2. 型チェック
npm run typecheck

# 3. 前処理実行（全年度）
npm run preprocess

# 4. 開発サーバー起動
npm run dev

# 5. ブラウザで確認
# http://localhost:3000
```

- [ ] `npm install` 成功
- [ ] `npm run typecheck` エラーなし
- [ ] `npm run preprocess` 成功（全年度JSON生成）
- [ ] `npm run dev` で起動成功
- [ ] ブラウザで全年度のサンキー図が表示される

### Phase 5: リポジトリ構成に合わせたリネーム・調整

```bash
# 1. YearPageClient.tsxのインポートを確認
# SankeyChartNivoWithSettingsのみを使用していることを確認

# 2. 不要なD3関連コンポーネントを削除（次のPhaseで実施）
```

- [ ] コンポーネントのインポートパスを確認
- [ ] 必要に応じてパス調整

### Phase 6: D3関連コードの削除

```bash
# 1. D3版サンキーコンポーネントを削除
rm -f client/components/SankeyChart.tsx
rm -f client/components/SankeyChartWithSettings.tsx
rm -f client/lib/sankeyDrilldown.ts
rm -f client/lib/sankeyFilter.ts

# 2. D3版データファイルを削除（生成されないように前処理スクリプトも調整）
# public/data/year_*/sankey.json は前処理スクリプトから生成を削除

# 3. package.jsonから不要な依存関係を削除
# 手動で package.json を編集:
# - "d3": "^7.9.0" を削除
# - "d3-sankey": "^0.12.3" を削除

# 4. scripts/preprocess-data.ts を編集
# - generateSankeyData() 関数の呼び出しをコメントアウト or 削除
# - D3版sankey.jsonの生成処理を削除

npm install  # 依存関係を更新
```

- [ ] D3版コンポーネントファイルを削除（4ファイル）
- [ ] package.jsonから `d3`, `d3-sankey` を削除
- [ ] 前処理スクリプトからD3版データ生成を削除
- [ ] `npm install` で依存関係を更新

### Phase 7: ローカル起動確認（D3削除後）

```bash
# 1. 型チェック
npm run typecheck

# 2. Lint
npm run lint

# 3. ビルド確認
npm run build

# 4. 開発サーバー起動
npm run dev

# 5. 動作確認
# - 全年度のサンキー図表示
# - ノードクリックでモーダル表示
# - 府省庁フィルター動作
# - 色設定変更反映
# - ダークモード切り替え
```

- [ ] `npm run typecheck` エラーなし
- [ ] `npm run lint` エラーなし
- [ ] `npm run build` 成功
- [ ] `npm run dev` で起動成功
- [ ] 全機能が正常動作することを確認

### Phase 8: GitHubへコミットとプッシュ

```bash
# 1. 変更をステージング
git add .

# 2. コミット
git commit -m "feat: Nivo版サンキー図の初期実装

- トポロジーベースの4列サンキー図
- ノードクリック詳細モーダル（府省庁フィルター、検索、ソート）
- 40府省庁の色設定（localStorage保存）
- ダークモード対応
- D3版関連コードを削除

データ修正履歴:
- 2024-11-13: 支出額集計ロジック修正（事業レベル集約で重複排除）
"

# 3. プッシュ
git push origin main
```

- [ ] `git add .` で全ファイルをステージング
- [ ] コミットメッセージを記述
- [ ] `git push origin main` でプッシュ成功

### Phase 9: Vercelへデプロイ

```bash
# 1. Vercel CLIをインストール（未インストールの場合）
npm install -g vercel

# 2. Vercelにログイン
vercel login

# 3. デプロイ
vercel

# または、Vercel Dashboard経由でデプロイ:
# 1. https://vercel.com/new でリポジトリを選択
# 2. フレームワーク: Next.js
# 3. ビルドコマンド: npm run build
# 4. 環境変数: 不要（静的ファイルのみ）
# 5. Deploy
```

- [ ] Vercel CLIをインストール
- [ ] Vercelにログイン
- [ ] デプロイ成功（本番URL取得）
- [ ] または、Vercel Dashboard経由でデプロイ

### Phase 10: グローバル動作確認

```bash
# デプロイされた本番URLで確認
# 例: https://marumie-gov.vercel.app
```

- [ ] 本番環境で全年度のサンキー図が表示される
- [ ] ノードクリックでモーダルが正常に開く
- [ ] 府省庁フィルター、検索、ソートが動作
- [ ] 色設定変更が反映される
- [ ] ダークモードが正常に動作
- [ ] モバイル表示が適切にレスポンシブ対応
- [ ] パフォーマンス確認（Lighthouse等）

### Phase 11: ドキュメント整備

```bash
# 1. README.mdを充実化
cat > README.md << 'EOF'
# marumie-gov

日本政府の予算・支出データをサンキー図で可視化するWebアプリケーション

## 特徴

- トポロジーベースの4列サンキー図
- 2016-2024年度のデータ対応
- インタラクティブなノード詳細モーダル
- 40府省庁の色設定カスタマイズ
- ダークモード対応

## セットアップ

\`\`\`bash
npm install
npm run preprocess  # CSVデータの前処理
npm run dev
\`\`\`

## デプロイ

\`\`\`bash
npm run build
npm start
\`\`\`

## データソース

行政事業レビュー公開システム
https://www.gyoukaku.go.jp/review/
EOF

# 2. CLAUDE.mdを作成
cp $SOURCE_DIR/CLAUDE.md ./CLAUDE.md

# 3. コミット
git add README.md CLAUDE.md
git commit -m "docs: READMEとCLAUDE.mdを追加"
git push origin main
```

- [ ] README.mdを充実化（プロジェクト概要、セットアップ、デプロイ手順）
- [ ] CLAUDE.mdを作成（Claude Code向けの指示）
- [ ] コミットしてプッシュ

### 完了確認

- [ ] 全Phaseのチェックリストが完了
- [ ] 本番環境で全機能が正常動作
- [ ] ドキュメントが整備されている
- [ ] GitHubリポジトリが公開（または適切にPrivate設定）

## 10. 今後の改善案

### 短期（移行直後）

- 支出先詳細データの動的読み込み最適化
- モーダルUIのアクセシビリティ改善（キーボード操作、ARIA属性）
- エラーハンドリングの強化（JSONファイル読み込み失敗時）

### 中期（3-6ヶ月）

- ユニットテスト導入（Jest + React Testing Library）
- E2Eテスト導入（Playwright/Cypress）
- パフォーマンス計測とチューニング
- 多言語対応（英語版）

### 長期（6ヶ月以降）

- リアルタイムデータ更新（WebSocket/SSE）
- カスタムビュー保存機能（ユーザー設定のクラウド保存）
- データエクスポート機能（CSV/Excel/PDF）
- AI解析機能（予算推移の異常検知、予測分析）

## 11. 注意事項

### データの取り扱い

- **CSVファイルはGitにコミットしない** (合計約1.5GB)
- **生成JSONファイルもGitにコミットしない** (合計約500KB、GitHub Releaseで配布)
- 本番環境では `npm run build` 時に自動ダウンロード

### ブランチ戦略

- `main`: 本番リリース用
- `develop`: 開発統合ブランチ
- `feature/*`: 機能開発用ブランチ

### コミットメッセージ規約

```
feat: 新機能追加
fix: バグ修正
docs: ドキュメント更新
style: コードスタイル変更（機能変更なし）
refactor: リファクタリング
test: テスト追加・修正
chore: ビルドプロセス・ツール変更
```

## 12. 問い合わせ先

- **技術的な質問**: GitHub Issuesを使用
- **データに関する問い合わせ**: 行政事業レビュー公開システムを参照

---

**移行予定日**: 未定
**最終更新**: 2025-11-13
