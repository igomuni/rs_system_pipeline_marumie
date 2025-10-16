# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js web application that visualizes Japanese government budget data (行政事業レビュー) from 2014-2024 using Sankey diagrams. It shows the flow of funds from ministries to expenditure destinations.

## Key Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production (includes data preprocessing)
npm run start        # Start production server
npm run preprocess   # Preprocess CSV data to JSON (run before first build)
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run ESLint
```

### Important Notes
- **Always run `npm run typecheck` and `npm run lint` before pushing logic changes**
- Data preprocessing converts large CSV files (~150MB) to optimized JSON (~11KB per year)
- The `build` command automatically runs preprocessing

## Architecture Overview

### Data Flow Architecture

This application uses a **build-time preprocessing strategy** for optimal performance:

1. **Raw Data** (`data/rs_system/year_YYYY/*.csv`): Government budget CSV files (2014-2024)
   - 2014-2023: Excel-to-CSV format, amounts in millions of yen
   - 2024: RS System CSV format, amounts in yen (1 yen unit)

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
  └── page.tsx          # Top page with year selector

client/                 # Client-side components ("use client")
  └── components/
      ├── SankeyChart.tsx    # D3.js Sankey visualization
      └── YearSelector.tsx   # Year selection UI

server/                 # Server-side logic (import "server-only")
  ├── loaders/          # Data loading entry points
  │   └── data-loader.ts     # Load Sankey data, statistics, ministry lists
  ├── repositories/     # Data access layer
  │   └── csv-repository.ts  # CSV file access (used in dev/legacy)
  ├── lib/              # Business logic
  │   ├── csv-parser.ts         # CSV parsing utilities
  │   └── sankey-transformer.ts # Transform CSV to Sankey structure
  └── usecases/         # Top-level use case functions (if needed)

types/                  # TypeScript type definitions
  ├── rs-system.ts      # Government budget data types
  └── sankey.ts         # Sankey diagram types

scripts/                # Build-time scripts
  └── preprocess-data.ts # CSV → JSON preprocessing

public/data/            # Preprocessed JSON files (generated)
  └── year_YYYY/
      ├── sankey.json
      ├── statistics.json
      ├── ministries.json
      └── ministry-projects.json
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

**Critical**: 2014-2023 data uses **millions of yen**, 2024 uses **yen** (1 yen unit)
- Always use `normalizeAmount(amount, year)` when processing budget amounts
- Preprocessing script handles this conversion automatically

### Year-specific File Naming

- 2024: `{番号}_RS_{年度}_{名称}.csv` (e.g., `5-1_RS_2024_支出先_支出情報.csv`)
- 2014-2023: `{番号}_{年度}_{名称}.csv` (e.g., `5-1_2023_支出先_支出情報.csv`)
- 5-2 file (expenditure connections) only exists for 2024

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
- **Visualization**: D3.js + d3-sankey
- **Data Parsing**: csv-parse
- **Runtime**: Node.js 18+

## Performance Characteristics

- **Build-time optimization**: All data processing happens at build time
- **Minimal runtime overhead**: Pre-calculated aggregations and statistics
- **Small payload**: ~11KB JSON per year (vs ~150MB CSV)
- **Fast page loads**: Milliseconds instead of seconds

## Development Tips

1. **First time setup**: Run `npm run preprocess` to generate JSON files
2. **Data changes**: Re-run preprocessing after modifying CSV files
3. **Year filtering**: All data processing filters by `予算年度` (budget year) field
4. **Testing locally**: Use `npm run dev` - dev server serves preprocessed JSON from `public/data/`
