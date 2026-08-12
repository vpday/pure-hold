export interface AppRefreshPreferences {
  readonly index: {
    readonly enabled: boolean
    readonly intervalSeconds: number
  }
  readonly funds: {
    readonly enabled: boolean
    readonly intervalMinutes: number
  }
}

export const indexRefreshInterval = {
  max: 60,
  min: 10,
  step: 10,
} as const

export const fundRefreshInterval = {
  max: 5,
  min: 1,
  step: 1,
} as const

export const defaultAppRefreshPreferences: AppRefreshPreferences = {
  funds: { enabled: true, intervalMinutes: 2 },
  index: { enabled: true, intervalSeconds: 10 },
}

export function cloneAppRefreshPreferences(
  preferences: AppRefreshPreferences,
): AppRefreshPreferences {
  return {
    funds: { ...preferences.funds },
    index: { ...preferences.index },
  }
}
