/**
 * RSシステムのCSVデータの型定義
 */

// 1-1_基本情報_組織情報.csv
export interface OrganizationInfo {
  シート種別: string;
  事業年度: number;
  予算事業ID: number;
  事業名: string;
  建制順: number;
  所管府省庁: string;
  府省庁: string;
  '局・庁': string;
  部: string;
  課: string;
  室: string;
  班: string;
  係: string;
  その他担当組織_作成責任者_no?: number;
  '府省庁(その他担当組織)'?: string;
  '局・庁(その他担当組織)'?: string;
  '部(その他担当組織)'?: string;
  '課(その他担当組織)'?: string;
  '室(その他担当組織)'?: string;
  '班(その他担当組織)'?: string;
  '係(その他担当組織)'?: string;
  作成責任者: string;
}

// 2-1_予算・執行_サマリ.csv
export interface BudgetSummary {
  シート種別: string;
  事業年度: number;
  予算事業ID: number;
  事業名: string;
  府省庁の建制順: number;
  政策所管府省庁: string;
  府省庁: string;
  '局・庁': string;
  部: string;
  課: string;
  室: string;
  班: string;
  係: string;
  予算年度: number;
  '当初予算(合計)': number;
  '補正予算(合計)': number;
  '前年度からの繰越し(合計)': number;
  '予備費等(合計)': number;
  '計(歳出予算現額合計)': number;
  '執行額(合計)': number;
  執行率?: number;
  '翌年度への繰越し(合計)': number;
  '翌年度要求額(合計)'?: number;
  主な増減理由?: string;
  その他特記事項?: string;
  会計区分?: string;
  会計?: string;
  勘定?: string;
  当初予算?: number;
  第1次補正予算?: number;
  第2次補正予算?: number;
  第3次補正予算?: number;
  第4次補正予算?: number;
  第5次補正予算?: number;
  前年度から繰越し?: number;
  予備費等1?: number;
  予備費等2?: number;
  予備費等3?: number;
  予備費等4?: number;
  歳出予算現額?: number;
  執行額?: number;
  翌年度要求額?: number;
  要望額?: number;
  備考?: string;
}

// 5-1_支出先_支出情報.csv
export interface ExpenditureInfo {
  シート種別: string;
  事業年度: number;
  予算事業ID: number;
  事業名: string;
  府省庁の建制順: number;
  政策所管府省庁: string;
  府省庁: string;
  '局・庁': string;
  部: string;
  課: string;
  室: string;
  班: string;
  係: string;
  支出先ブロック番号: string;
  支出先ブロック名: string;
  支出先の数?: number;
  事業を行う上での役割?: string;
  ブロックの合計支出額?: number;
  支出先名?: string;
  法人番号?: string;
  所在地?: string;
  法人種別?: string;
  その他支出先?: boolean;
  支出先の合計支出額?: number;
  契約概要?: string;
  金額?: number;
  契約方式等?: string;
  具体的な契約方式等?: string;
  入札者数?: number;
  落札率?: number;
  '一者応札・一者応募又は競争性のない随意契約となった理由及び改善策(支出額10億円以上)'?: string;
  その他の契約?: boolean;
}

// 5-2_支出先_支出ブロックのつながり.csv
export interface ExpenditureConnection {
  シート種別: string;
  事業年度: number;
  予算事業ID: number;
  事業名: string;
  府省庁の建制順: number;
  政策所管府省庁: string;
  府省庁: string;
  '局・庁': string;
  部: string;
  課: string;
  室: string;
  班: string;
  係: string;
  支出元の支出先ブロック?: string;
  支出元の支出先ブロック名?: string;
  担当組織からの支出: boolean;
  支出先の支出先ブロック: string;
  支出先の支出先ブロック名: string;
  資金の流れの補足情報?: string;
  国自らが支出する間接経費?: string;
  国自らが支出する間接経費の項目?: string;
  国自らが支出する間接経費の金額?: number;
}

// 年度の型
export type Year = 2014 | 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 2023 | 2024;

// 全年度のリスト
export const AVAILABLE_YEARS: Year[] = [2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

// 推奨年度のリスト（2014-2015はデータ品質が低いため、事業レポートでは除外を推奨）
export const RECOMMENDED_YEARS: Year[] = [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];
