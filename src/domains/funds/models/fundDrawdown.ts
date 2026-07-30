import type { FundCumulativeReturnPoint } from './fundCumulativeReturns'

export interface FundDrawdownAnalysis {
  readonly maximumDrawdownPercent: number
  readonly peakIndex: number
  readonly troughIndex: number
}

export function analyzeFundDrawdown(
  points: readonly FundCumulativeReturnPoint[],
): FundDrawdownAnalysis | null {
  let maximumDrawdownPercent = 0
  let peakIndex = -1
  let runningPeakIndex = -1
  let runningPeakLevel = 0
  let troughIndex = -1

  points.forEach(({ fundYieldPercent }, index) => {
    if (fundYieldPercent === null) return
    const level = 100 + fundYieldPercent
    if (level < 0) return
    if (runningPeakIndex === -1) {
      if (level === 0) return
      runningPeakIndex = index
      runningPeakLevel = level
      return
    }
    if (level > runningPeakLevel) {
      runningPeakIndex = index
      runningPeakLevel = level
      return
    }

    const drawdownPercent = ((runningPeakLevel - level) / runningPeakLevel) * 100
    if (drawdownPercent <= maximumDrawdownPercent) return
    maximumDrawdownPercent = drawdownPercent
    peakIndex = runningPeakIndex
    troughIndex = index
  })

  if (peakIndex === -1 || troughIndex === -1) return null

  return {
    maximumDrawdownPercent,
    peakIndex,
    troughIndex,
  }
}
