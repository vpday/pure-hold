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
  const first = source[0]
  if (!first) return { maximumDrawdown: null, points: [] }

  let peak = first.value
  let maximumDrawdown = 0
  const points = source.map(({ date, value }) => {
    peak = Math.max(peak, value)
    const drawdown = Math.min(value / peak - 1, 0)
    maximumDrawdown = Math.min(maximumDrawdown, drawdown)
    return { date, drawdown }
  })

  return {
    maximumDrawdown: points.length < 2 ? null : maximumDrawdown,
    points,
  }
}
