import type { FundGroupDefinition } from '../../models/fundGroupDefinition.ts'
import type { FundHolding } from '../../models/fundHolding.ts'
import type { FundReturns, FundSnapshot } from '../../models/fundSnapshot.ts'
import type { FundState } from '../../models/fundState.ts'

const returnKeys = [
  'oneWeek',
  'oneMonth',
  'threeMonths',
  'sixMonths',
  'yearToDate',
  'oneYear',
  'twoYears',
  'threeYears',
  'fiveYears',
  'sinceInception',
] as const satisfies readonly (keyof FundReturns)[]

export function validateAndCloneFundState(
  value: unknown,
  filterUnknownGroupCodes = false,
): FundState {
  if (
    !isRecord(value) ||
    !Array.isArray(value.fundOrder) ||
    !isRecord(value.holdingsByCode) ||
    !isRecord(value.snapshotsByCode)
  ) {
    throw new TypeError('Fund state has an invalid shape')
  }

  const fundOrder = validateUniqueStrings(value.fundOrder, 'fund codes')
  const knownCodes = new Set(fundOrder)
  const snapshotsRecord = value.snapshotsByCode
  const snapshotKeys = Object.keys(snapshotsRecord)
  if (
    snapshotKeys.length !== fundOrder.length ||
    snapshotKeys.some((code) => !knownCodes.has(code))
  ) {
    throw new TypeError('Fund snapshots must match fundOrder')
  }

  const snapshotsByCode = Object.fromEntries(
    fundOrder.map((code) => {
      const snapshot = snapshotsRecord[code]
      if (!isFundSnapshot(snapshot) || snapshot.code !== code) {
        throw new TypeError(`Fund snapshot ${code} has an invalid shape`)
      }
      return [code, cloneSnapshot(snapshot)]
    }),
  )

  if (!Array.isArray(value.groups)) {
    throw new TypeError('Fund groups have an invalid shape')
  }

  const groups = validateGroups(value.groups, knownCodes, filterUnknownGroupCodes)
  const holdingsByCode = validateHoldings(value.holdingsByCode, knownCodes, filterUnknownGroupCodes)
  return { fundOrder, groups, holdingsByCode, snapshotsByCode }
}

function validateHoldings(
  values: Record<string, unknown>,
  knownCodes: ReadonlySet<string>,
  filterUnknownCodes: boolean,
): Record<string, FundHolding> {
  const holdings: Record<string, FundHolding> = {}
  for (const [code, value] of Object.entries(values)) {
    if (!knownCodes.has(code)) {
      if (filterUnknownCodes) continue
      throw new TypeError('Fund holding references an unknown fund')
    }
    if (
      !isRecord(value) ||
      value.code !== code ||
      !isPositiveNumberWithFourDecimals(value.units) ||
      !isPositiveNumberWithFourDecimals(value.costPrice) ||
      (value.dividendMode !== 'cash' && value.dividendMode !== 'reinvest') ||
      !isValidPurchaseDate(value.purchaseDate)
    ) {
      throw new TypeError(`Fund holding ${code} has an invalid shape`)
    }
    holdings[code] = {
      code,
      costPrice: value.costPrice,
      dividendMode: value.dividendMode,
      purchaseDate: value.purchaseDate,
      units: value.units,
    }
  }
  return holdings
}

function validateGroups(
  values: readonly unknown[],
  knownCodes: ReadonlySet<string>,
  filterUnknownGroupCodes: boolean,
): FundGroupDefinition[] {
  const ids = new Set<string>()
  const names = new Set<string>()

  return values.map((value) => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      value.id.length === 0 ||
      typeof value.name !== 'string' ||
      !Array.isArray(value.fundCodes)
    ) {
      throw new TypeError('Fund group has an invalid shape')
    }

    const name = value.name.trim()
    if (name.length === 0 || [...name].length > 20 || ids.has(value.id) || names.has(name)) {
      throw new TypeError('Fund groups contain duplicate or invalid identifiers or names')
    }
    ids.add(value.id)
    names.add(name)

    const fundCodes = validateUniqueStrings(value.fundCodes, 'group fund codes')
    if (!filterUnknownGroupCodes && fundCodes.some((code) => !knownCodes.has(code))) {
      throw new TypeError('Fund group references an unknown fund')
    }

    return {
      fundCodes: fundCodes.filter((code) => knownCodes.has(code)),
      id: value.id,
      name,
    }
  })
}

function validateUniqueStrings(value: readonly unknown[], label: string): string[] {
  if (value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new TypeError(`${label} have an invalid shape`)
  }
  const strings = value as string[]
  if (new Set(strings).size !== strings.length) {
    throw new TypeError(`${label} must be unique`)
  }
  return [...strings]
}

function isFundSnapshot(value: unknown): value is FundSnapshot {
  if (
    !isRecord(value) ||
    typeof value.code !== 'string' ||
    typeof value.name !== 'string' ||
    value.name.length === 0 ||
    !Array.isArray(value.tags) ||
    !value.tags.every((tag) => typeof tag === 'string' && tag.length > 0) ||
    !isNullableFiniteNumber(value.estimatedNav) ||
    !isNullableFiniteNumber(value.estimatedChangePercent) ||
    !isNullableString(value.estimatedAt) ||
    !isNullableFiniteNumber(value.nav) ||
    !isNullableString(value.navDate) ||
    !isNullableFiniteNumber(value.dailyChangePercent) ||
    !isNullableString(value.returnsDate) ||
    !isNullableFiniteNumber(value.fetchedAt) ||
    !isRecord(value.returns)
  ) {
    return false
  }

  const returns = value.returns
  return returnKeys.every((key) => isNullableFiniteNumber(returns[key]))
}

function cloneSnapshot(snapshot: FundSnapshot): FundSnapshot {
  return {
    ...snapshot,
    returns: { ...snapshot.returns },
    tags: [...snapshot.tags],
  }
}

function isNullableFiniteNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isPositiveNumberWithFourDecimals(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return false
  const scaled = value * 10_000
  return Math.abs(scaled - Math.round(scaled)) < 1e-8
}

function isValidPurchaseDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return false
  }
  const today = new Date()
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return date <= localToday
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
