export function fmtYen(n: number): string {
  if (n >= 10000) return `¥${Math.round(n / 10000)}万`
  return `¥${n.toLocaleString('ja-JP')}`
}

export function jstDateLabel(date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`
}

export function jstMonth(date = new Date()): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const y = jst.getUTCFullYear()
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}
