import {
  fundRefreshInterval,
  type AppRefreshPreferences,
  indexRefreshInterval,
} from '../models/appRefreshPreferences.ts'

export function validateAndCloneAppRefreshPreferences(value: unknown): AppRefreshPreferences {
  if (!isRecord(value) || !isRefreshSource(value.index) || !isRefreshSource(value.funds)) {
    throw new TypeError('App refresh preferences have an invalid shape')
  }

  if (
    !isValidInterval(
      value.index.intervalSeconds,
      indexRefreshInterval.min,
      indexRefreshInterval.max,
      indexRefreshInterval.step,
    ) ||
    !isValidInterval(
      value.funds.intervalMinutes,
      fundRefreshInterval.min,
      fundRefreshInterval.max,
      fundRefreshInterval.step,
    )
  ) {
    throw new TypeError('App refresh preferences contain an invalid interval')
  }

  return {
    funds: {
      enabled: value.funds.enabled,
      intervalMinutes: value.funds.intervalMinutes,
    },
    index: {
      enabled: value.index.enabled,
      intervalSeconds: value.index.intervalSeconds,
    },
  }
}

function isRefreshSource(value: unknown): value is {
  readonly enabled: boolean
  readonly intervalMinutes?: unknown
  readonly intervalSeconds?: unknown
} {
  return isRecord(value) && typeof value.enabled === 'boolean'
}

function isValidInterval(value: unknown, min: number, max: number, step: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max &&
    (value - min) % step === 0
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
