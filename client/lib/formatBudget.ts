/**
 * 金額を適切な単位（兆円/億円/万円）でフォーマット
 */
export function formatBudget(amount: number): string {
  const absAmount = Math.abs(amount);

  // 1兆円以上
  if (absAmount >= 1000000000000) {
    const cho = amount / 1000000000000;
    return `${cho.toFixed(1)}兆円`;
  }

  // 1億円以上
  if (absAmount >= 100000000) {
    const oku = amount / 100000000;
    return `${oku.toFixed(0)}億円`;
  }

  // 1万円以上
  if (absAmount >= 10000) {
    const man = amount / 10000;
    return `${man.toFixed(0)}万円`;
  }

  // それ以下
  return `${amount.toFixed(0)}円`;
}
