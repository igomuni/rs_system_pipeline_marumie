# 行政事業レビュー サンキー図可視化アプリ

行政事業レビューの公開データをサンキー図で可視化し、予算から執行までの資金の流れを理解しやすくするWebアプリケーションです。

## 特徴

- **サンキー図による可視化**: 府省庁から支出先への資金の流れを直感的に表示
- **年度選択**: 2014年度〜2024年度のデータを選択可能
- **府省庁フィルター**: 特定の府省庁に絞り込んで表示
- **インタラクティブ**: ノードやリンクにカーソルを当てると詳細情報を表示
- **統計情報**: 予算総額、執行額、執行率などの集計データを表示
- **高速パフォーマンス**: ビルド時にデータを事前処理し、JSONとして最適化（80MB→112KB、約700倍の削減）

## 技術スタック

- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データ可視化**: D3.js + d3-sankey
- **データ処理**: csv-parse

## プロジェクト構成

```
rs_system_pipeline_marumie/
├── app/                        # Next.js App Router
│   ├── [year]/                # 年度別ページ
│   ├── layout.tsx             # ルートレイアウト
│   └── page.tsx               # トップページ
├── client/                     # クライアントコンポーネント
│   └── components/
│       ├── SankeyChart.tsx    # サンキー図コンポーネント
│       └── YearSelector.tsx   # 年度選択コンポーネント
├── server/                     # サーバーサイドロジック
│   ├── lib/
│   │   ├── csv-parser.ts      # CSVパーサー
│   │   └── sankey-transformer.ts  # データ変換
│   ├── repositories/
│   │   └── csv-repository.ts  # CSVファイルアクセス
│   └── loaders/
│       └── data-loader.ts     # データローダー
├── types/                      # TypeScript型定義
│   ├── rs-system.ts           # RSシステムデータの型
│   └── sankey.ts              # サンキー図の型
├── data/                       # データディレクトリ
│   └── rs_system/
│       └── year_YYYY/         # 年度別CSVデータ
└── docs/                       # ドキュメント
```

## セットアップ

### 前提条件

- Node.js 18以上
- npm または yarn

### インストール

1. リポジトリをクローン:

```bash
git clone https://github.com/igomuni/rs_system_pipeline_marumie.git
cd rs_system_pipeline_marumie
```

2. 依存関係をインストール:

```bash
npm install
```

3. データの確認:

`data/rs_system/` ディレクトリに年度別のCSVファイルが配置されていることを確認してください。

4. データの前処理（初回のみ）:

```bash
npm run preprocess
```

このコマンドにより、CSVデータが最適化されたJSON形式に変換されます（`public/data/`に保存）。

### 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開いてアプリケーションにアクセスできます。

## 使い方

1. **トップページ**: 年度を選択して該当年度のページに移動
2. **年度別ページ**:
   - サンキー図で予算の流れを確認
   - サイドバーから府省庁でフィルタリング
   - ノードをクリックして詳細情報を表示
   - 年度セレクターで別の年度に切り替え

## データソース

- [行政事業レビュー](https://www.gyoukaku.go.jp/)
- [RS System Pipeline](https://github.com/igomuni/rs_system_pipeline) - データ変換パイプライン

## ビルド

プロダクション用のビルド（データ前処理を含む）:

```bash
npm run build
npm run start
```

**注意**: `npm run build` は自動的に `npm run preprocess` を実行してデータを前処理します。

### パフォーマンス最適化

このアプリケーションは、ビルド時にデータを事前処理することで高速なパフォーマンスを実現しています：

- **元のCSVデータ**: 2024年度で約150MB（3ファイル合計）
- **最適化後のJSON**: 約11KB（99.99%の削減）
- **ページロード時間**: 数秒 → 数十ミリ秒

前処理では以下を行います：
1. CSVファイルをパースしてJSONに変換
2. 対象年度（予算年度）のデータのみを抽出
3. 金額の単位を正規化（2014-2023年：百万円単位→円単位に変換、2024年：円単位のまま）
4. 府省庁ごとに予算を集約
5. サンキー図データを生成（左側：年度予算合計、右側：府省庁別予算）
6. 統計情報を事前計算（予算総額、執行額、執行率など）

### データの年度間の違い

行政事業レビューのデータには年度によって以下の違いがあります：

- **2014-2023年度**: 過去データ（Excel→CSV変換）
  - 金額単位: 百万円（前処理で円単位に正規化）
  - ファイル命名: `{番号}_{年度}_{名称}.csv`
  - 5-2ファイル（支出ブロックのつながり）: 存在しない

- **2024年度**: RSシステム公開データ（CSV形式）
  - 金額単位: 円（1円単位）
  - ファイル命名: `{番号}_RS_{年度}_{名称}.csv`
  - 5-2ファイル（支出ブロックのつながり）: 存在する

これらの違いは前処理スクリプトで自動的に処理されます。

## デプロイ

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/igomuni/rs_system_pipeline_marumie)

### 手動デプロイ

1. ビルドを実行
2. `.next` ディレクトリと `data` ディレクトリをサーバーにアップロード
3. `npm run start` でサーバーを起動

## 参考プロジェクト

- [みらいまる見え政治資金](https://github.com/igomuni/marumie) - 政治資金のサンキー図可視化

## ライセンス

MIT

## コントリビューション

Issue や Pull Request を歓迎します。

## 設計ドキュメント

詳細な設計については以下をご覧ください:
- [設計書](docs/20251016_2043_行政事業レビューサンキー図可視化WEBアプリ設計.md)
