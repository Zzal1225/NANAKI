/** 0–100 범위 퍼센트 (분모 0이면 0) */
export function calculatePercent(part: number, total: number) {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, (part / total) * 100))
}
