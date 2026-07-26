export function formatEstimatedDisplayDate(value: string, now = new Date()): string {
  const parts = parseFundDate(value)
  if (!parts?.hour || !parts.minute) {
    return value
  }

  const todayParts = new Intl.DateTimeFormat('en', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(now)
  const todayValues = Object.fromEntries(todayParts.map((part) => [part.type, part.value]))
  const shanghaiToday = `${todayValues.year}-${todayValues.month}-${todayValues.day}`
  const time = `${parts.hour}:${parts.minute}`
  return parts.date === shanghaiToday ? time : `${parts.month}-${parts.day} ${time}`
}

export function formatNavDisplayDate(value: string): string {
  const parts = parseFundDate(value)
  return parts ? `${parts.month}-${parts.day}` : value
}

function parseFundDate(value: string):
  | {
      readonly date: string
      readonly day: string
      readonly hour?: string
      readonly minute?: string
      readonly month: string
    }
  | undefined {
  const match = /^(\d{4})[-/](\d{2})[-/](\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(value)
  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined
  }
  return {
    date: `${match[1]}-${match[2]}-${match[3]}`,
    day: match[3],
    hour: match[4],
    minute: match[5],
    month: match[2],
  }
}
