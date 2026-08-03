export function formatRowDate(rowDate: string, headerDate?: string): string {
  if (rowDate === '--') return rowDate

  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(rowDate)
  if (!match?.[2] || !match[3]) return rowDate
  if (headerDate === undefined && match[4] && match[5]) {
    return `${match[4]}:${match[5]}`
  }
  if (/^\d{2}:\d{2}$/.test(headerDate ?? '') && match[4] && match[5]) {
    return `${match[4]}:${match[5]}`
  }
  if (/^\d{2}-\d{2} \d{2}:\d{2}$/.test(headerDate ?? '') && match[4] && match[5]) {
    return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`
  }
  if (/^\d{2}-\d{2}$/.test(headerDate ?? '')) return `${match[2]}-${match[3]}`
  return rowDate
}
