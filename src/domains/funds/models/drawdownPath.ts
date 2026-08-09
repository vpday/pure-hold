export interface DrawdownValuePoint {
  readonly date: string
  readonly value: number
}

export interface DrawdownPathPoint {
  readonly date: string
  readonly drawdown: number
}

export interface DrawdownPath {
  readonly maximumDrawdown: number | null
  readonly points: readonly DrawdownPathPoint[]
}

export function calculateDrawdownPath(source: readonly DrawdownValuePoint[]): DrawdownPath {
  const points = normalizePoints(source)
  const first = points[0]
  if (!first) return { maximumDrawdown: null, points: [] }

  let peak = first.value
  let maximumDrawdown = 0
  const drawdownPoints = points.map(({ date, value }) => {
    peak = Math.max(peak, value)
    const drawdown = peak === 0 ? 0 : Math.min(value / peak - 1, 0)
    maximumDrawdown = Math.min(maximumDrawdown, drawdown)
    return { date, drawdown }
  })

  return {
    maximumDrawdown: drawdownPoints.length < 2 ? null : maximumDrawdown,
    points: drawdownPoints,
  }
}

function normalizePoints(source: readonly DrawdownValuePoint[]): readonly DrawdownValuePoint[] {
  const byDate = new Map<string, DrawdownValuePoint>()
  for (const point of source) {
    if (
      !isIsoDate(point.date) ||
      !Number.isFinite(point.value) ||
      point.value < 0 ||
      byDate.has(point.date)
    ) {
      continue
    }
    byDate.set(point.date, point)
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date))
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
