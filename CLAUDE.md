# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js web application that visualizes Japanese government budget data (行政事業レビュー) from 2016-2024 using Sankey diagrams. It shows the flow of funds from ministries to expenditure destinations.

### Key Features
- **Sankey Diagram Visualization**: Intuitive flow visualization from ministries to expenditure destinations
  - **Interactive Modals**: Click on aggregated nodes to view full lists
    - "小規模府省庁（N）": Click to show all minor ministries (searchable/sortable)
    - "残りN事業": Click to show all projects (with links to project reports)
    - "事業ノード": Click to show expenditure list (with link to project report)
    - "残りN支出先": Click to show all expenditures (searchable/sortable)
  - **Drilldown Navigation**: Click ministries to see projects (sorted by total expenditure), then expenditures
  - **Configurable Display**: Adjust Top N display (5-50), 20 ministry colors, dark mode support
- **Year Selection**: Browse data from 2014-2024
- **Statistics Dashboard**: Budget totals, execution amounts, and execution rates
- **Project Reports**: 12,573 projects with search, filtering, and time-series analysis
  - Fuzzy search using Fuse.js
  - Year range filtering (default: 2016-2024, recommended years)
  - Sortable columns (project name, ministry, total budget)
  - Budget trend charts (Recharts)
  - Top 10 expenditure destinations
  - Time-series charts by expenditure destination
  - Year range customization on detail pages

## Key Commands

### Development
```bash
npm run dev           # Start development server
npm run build         # Build for production (auto-downloads preprocessed JSON)
npm run start         # Start production server
npm run download-data # Download project JSON from GitHub Release (auto in build)
npm run preprocess    # Preprocess CSV data to JSON (development only)
npm run typecheck     # Run TypeScript type checking
npm run lint          # Run ESLint
```

### Important Notes
- **Always run `npm run typecheck` and `npm run lint` before pushing logic changes**
- The `build` command automatically downloads preprocessed project files (5.1MB) from GitHub Release
- Project files (12,573 JSON, 52MB) are NOT committed to git - downloaded during build
- CSV preprocessing is only needed during development when updating data

## Architecture Overview

### Data Flow Architecture

This application uses a **build-time preprocessing strategy** for optimal performance:

1. **Raw Data** (`data/rs_system/year_YYYY/*.csv`): Government budget CSV files (2016-2024, 2014-2015 available but not displayed)
   - 2016-2023: Excel-to-CSV format, amounts in millions of yen
   - 2024: RS System CSV format, amounts in yen (1 yen unit)
   - 2014-2015: Low data quality, excluded from display but kept for reference

2. **Preprocessing** (`scripts/preprocess-data.ts`): Converts CSV to JSON at build time
   - Filters by target year (予算年度)
   - Normalizes amounts (converts millions → yen for 2014-2023)
   - Aggregates by ministry
   - Generates Sankey diagram structure
   - Outputs to `public/data/year_YYYY/*.json`
   - Achieves ~700x data reduction (80MB → 112KB)

3. **Client-side Loading**: Optimized JSON loaded via fetch in browser
   - Fast page loads (seconds → milliseconds)
   - Pre-calculated statistics and aggregations

### Key CSV Files

- `2-1_予算・執行_サマリ.csv`: Budget and execution summary per event
- `5-1_支出先_支出情報.csv`: Detailed expenditure information (61.7MB for 2024)
- `5-2_支出先_支出ブロックのつながり.csv`: Expenditure block connections (2024 only)

### Directory Structure and Responsibilities

```
app/                    # Next.js App Router
  ├── [year]/page.tsx   # Year-specific visualization page
  ├── reports/          # Project reports feature
  │   ├── [projectKey]/ # Individual project detail pages
  │   └── page.tsx      # Project list page (12,573 projects)
  └── page.tsx          # Top page with year selector

client/                 # Client-side components ("use client")
  ├── components/
  │   ├── reports/      # Project report components
  │   │   ├── BudgetTrendChart.tsx          # Budget trend visualization
  │   │   ├── ExpenditureTopList.tsx        # Top 10 expenditure list
  │   │   ├── ExpenditureTimeSeriesChart.tsx # Time-series chart
  │   │   ├── ProjectSearchInterface.tsx    # Search UI with Fuse.js
  │   │   ├── ProjectTable.tsx              # Project list table (with sorting)
  │   │   └── ProjectDetailView.tsx         # Project detail view (with year filter)
  │   ├── ExpenditureListModal.tsx  # Expenditure list modal (searchable/sortable)
  │   ├── MinistryListModal.tsx     # Ministry list modal (searchable/sortable)
  │   ├── ProjectListModal.tsx      # Project list modal (with report links)
  │   ├── SankeyChart.tsx           # D3.js Sankey visualization with interactivity
  │   ├── SankeyChartWithSettings.tsx # Sankey chart with config panel
  │   ├── SankeyConfigPanel.tsx     # Configuration panel for Sankey settings
  │   └── YearSelector.tsx          # Year selection UI
  ├── hooks/
  │   └── useSankeyConfig.ts        # Hook for Sankey config (localStorage persistence)
  └── lib/
      ├── expenditureLoader.ts      # Load expenditure data dynamically
      ├── formatBudget.ts           # Budget formatting utilities (trillion/billion/10k yen)
      ├── projectIndex.ts           # Project index utilities (name → projectKey)
      ├── projectKey.ts             # MD5 hash generation for project keys
      ├── sankeyDrilldown.ts        # Drilldown data generation logic
      └── sankeyFilter.ts           # Filtering logic based on config

server/                 # Server-side logic (import "server-only")
  ├── loaders/          # Data loading entry points
  │   ├── data-loader.ts   # Load Sankey data, statistics, ministry lists
  │   └── report-loader.ts # Load project reports (server-only)
  ├── repositories/     # Data access layer
  │   └── csv-repository.ts  # CSV file access (used in dev/legacy)
  ├── lib/              # Business logic
  │   ├── csv-parser.ts         # CSV parsing utilities
  │   └── sankey-transformer.ts # Transform CSV to Sankey structure
  └── usecases/         # Top-level use case functions (if needed)

types/                  # TypeScript type definitions
  ├── rs-system.ts      # Government budget data types
  ├── sankey.ts         # Sankey diagram types
  ├── sankey-config.ts  # Sankey configuration types
  └── report.ts         # Project report types

scripts/                # Build-time scripts
  ├── preprocess-data.ts # CSV → JSON preprocessing (Sankey + Reports)
  └── download-data.js   # Download preprocessed data from GitHub Release

data/rs_system/         # Raw CSV data (NOT committed)
  └── year_YYYY/        # Year-specific CSV files

public/data/            # Preprocessed JSON files (generated, NOT committed)
  ├── year_YYYY/        # Sankey diagram data
  │   ├── sankey.json
  │   ├── statistics.json
  │   ├── ministries.json
  │   └── ministry-projects.json
  ├── projects/         # 12,573 individual project JSON files (52MB)
  └── project-index.json # Project index for search/list (5.5MB, with yearlyBudgets)
```

## Code Organization Rules

### Next.js Implementation Principles

1. **Server Components First**: Use server components for data fetching unless there's a specific need for client-side
   - Exception: Interactive visualizations (D3.js charts), real-time updates, browser APIs

2. **No Unnecessary "use client"**: Only use for state management, browser APIs, or heavy UI libraries

3. **Separation of Concerns**: Extract data fetching logic to loaders/repositories
   - Server components call loaders
   - Loaders orchestrate repositories and usecases
   - Keep data access logic in repositories

4. **Server-only Protection**: Add `import "server-only"` to files that must run on server
   - Prevents accidental client-side imports
   - Use in: loaders, repositories, usecases, server/lib

5. **Server Actions**: Use `"use server"` only for mutations (updates, file uploads)
   - Always pair with revalidatePath/revalidateTag
   - Not for read operations

6. **Client-side Data Fetching**: Only for special cases
   - Real-time communication
   - High-frequency polling
   - User-triggered search
   - Offline optimization (React Query)

### Data Normalization

**Critical**: 2016-2023 data uses **millions of yen**, 2024 uses **yen** (1 yen unit)
- Always use `normalizeAmount(amount, year)` when processing budget amounts
- Preprocessing script handles this conversion automatically
- Note: 2014-2015 data exists but is excluded from display due to low quality

### Year-specific File Naming

**Updated 2024-10-28**: 2024 data files now use the same naming pattern as 2014-2023 (without `RS_` prefix)

- **All years (2014-2024)**: `{番号}_{年度}_{名称}.csv`
  - Example: `5-1_2024_支出先_支出情報.csv`
  - Exception: 1-2 file for 2024 uses「事業概要等」instead of「事業概要」
    - 2024: `1-2_2024_基本情報_事業概要等.csv`
    - 2014-2023: `1-2_{年度}_基本情報_事業概要.csv`
- 5-2 file (expenditure connections) only exists for 2024

**Note**: CSV field names may use either half-width `(合計)` or full-width `（合計）` parentheses. The preprocessing script handles both formats.

## Design Documentation

Detailed design documentation is in `docs/`:
- Design rules: When asked to create design docs, use format `YYYYMMDD_HHMM_{日本語の作業内容}.md`
- Save to `docs/` directory

## Git Workflow Rules

### Branch Strategy
- **Never push directly to `develop` or `main`**
- Always create feature branches for new work
- When user asks to create a PR:
  1. Create feature branch
  2. Commit changes
  3. Create PR using `gh pr create` (without `--base` option to use default base branch)

### Pre-push Checklist
- Run `npm run typecheck` to check types
- Run `npm run lint` to check code style
- These are **mandatory** before pushing logic changes

### Special Considerations
- **Prisma migrations**: Ask user permission before executing (can break auto-deploy)
- **PR base branch**: Do not specify `--base` - use repository default

## Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Visualization**: D3.js + d3-sankey, Recharts
- **Search**: Fuse.js (fuzzy search)
- **Data Parsing**: csv-parse
- **Runtime**: Node.js 18+

## Performance Characteristics

- **Build-time optimization**: All data processing happens at build time
- **Minimal runtime overhead**: Pre-calculated aggregations and statistics
- **Small payload**: ~11KB JSON per year (vs ~150MB CSV)
- **Fast page loads**: Milliseconds instead of seconds

## Development Tips

1. **First time setup**: Run `npm run download-data` OR `npm run preprocess` to generate JSON files
   - `download-data`: Fast (downloads 5.1MB from GitHub Release, extracts to 52MB)
   - `preprocess`: Slow (processes CSV files, useful when updating data)
2. **Data changes**: Re-run preprocessing after modifying CSV files
3. **Year filtering**: All data processing filters by `予算年度` (budget year) field
4. **Testing locally**: Use `npm run dev` - dev server serves preprocessed JSON from `public/data/`

## Important Implementation Details

### Data Integrity Handling

**2024 Data Multi-row Issue**:
- 2024 CSV contains multiple rows for same project (budget data + previous year execution data)
- Empty string rows should not overwrite existing data
- Update logic: Only overwrite with positive values if existing data is present

**Project ID Inconsistency Across Years**:
- Same project has different IDs in different years
- Solution: Use project name as primary key, map year-specific IDs
- URL key: MD5 hash of project name (URL-safe, fixed length)

**Project Start/End Year Reliability**:
- Older year data (especially 2014) can be inaccurate
- Solution: Prioritize newer year data by sorting in descending order

### Preprocessing Output

**Sankey Diagram Data** (`public/data/year_YYYY/`):
- `sankey.json`: Node and link structure for D3.js
- `statistics.json`: Pre-calculated totals (budget, execution, rates)
- `ministries.json`: Ministry list for filtering
- `ministry-projects.json`: Project counts per ministry

**Project Report Data** (`public/data/`):
- `projects/`: 12,573 individual JSON files (one per project)
- `project-index.json`: Index for search and list views (includes yearlyBudgets for filtering)
- Project key: MD5 hash of project name
- Size: 52MB uncompressed, 5.1MB compressed (tar.gz)
