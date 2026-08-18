import type { FundGroupDefinition } from '../../models/fundGroupDefinition.ts'
import { createFundHolding, type FundHolding } from '../../models/fundHolding.ts'
import type { FundSettings } from '../../models/fundSettings.ts'

export function validateAndCloneFundSettings(
  value: unknown,
  filterUnknownGroupCodes = false,
  allowLegacyCostPrice = true,
): FundSettings {
  if (
    !isRecord(value) ||
    !Array.isArray(value.funds) ||
    !Array.isArray(value.groups) ||
    !Array.isArray(value.holdingOrder) ||
    !isRecord(value.holdingsByCode)
  ) {
    throw new TypeError('Fund settings have an invalid shape')
  }

  const funds = validateFunds(value.funds)
  const knownCodes = new Set(funds.map(({ code }) => code))
  const groups = validateGroups(value.groups, knownCodes, filterUnknownGroupCodes)
  const holdingsByCode = validateHoldings(
    value.holdingsByCode,
    knownCodes,
    filterUnknownGroupCodes,
    allowLegacyCostPrice,
  )
  const holdingOrder = validateHoldingOrder(
    value.holdingOrder,
    knownCodes,
    holdingsByCode,
    filterUnknownGroupCodes,
  )
  return { funds, groups, holdingOrder, holdingsByCode }
}

function validateFunds(values: readonly unknown[]): { code: string; name: string }[] {
  const codes = new Set<string>()
  return values.map((value) => {
    if (!isRecord(value) || !isFundCode(value.code) || typeof value.name !== 'string') {
      throw new TypeError('Fund setting has an invalid shape')
    }
    const name = value.name.trim()
    if (name.length === 0 || codes.has(value.code)) {
      throw new TypeError('Fund settings contain duplicate or invalid funds')
    }
    codes.add(value.code)
    return { code: value.code, name }
  })
}

function validateHoldingOrder(
  values: readonly unknown[],
  knownCodes: ReadonlySet<string>,
  holdingsByCode: Readonly<Record<string, FundHolding>>,
  filterUnknownCodes: boolean,
): string[] {
  const order = validateUniqueStrings(values, 'holding order')
  const filteredOrder = filterUnknownCodes ? order.filter((code) => knownCodes.has(code)) : order
  if (!filterUnknownCodes && filteredOrder.some((code) => !knownCodes.has(code))) {
    throw new TypeError('Holding order references an unknown fund')
  }

  const holdingCodes = Object.keys(holdingsByCode)
  if (
    filteredOrder.length !== holdingCodes.length ||
    holdingCodes.some((code) => !filteredOrder.includes(code))
  ) {
    throw new TypeError('Holding order must match fund holdings')
  }
  return filteredOrder
}

function validateHoldings(
  values: Record<string, unknown>,
  knownCodes: ReadonlySet<string>,
  filterUnknownCodes: boolean,
  allowLegacyCostPrice: boolean,
): Record<string, FundHolding> {
  const holdings: Record<string, FundHolding> = {}
  for (const [code, value] of Object.entries(values)) {
    if (!knownCodes.has(code)) {
      if (filterUnknownCodes) continue
      throw new TypeError('Fund holding references an unknown fund')
    }
    const record = isRecord(value) ? value : null
    const totalCostCents = isNonNegativeIntegerCents(record?.totalCostCents)
      ? record.totalCostCents
      : allowLegacyCostPrice
        ? legacyTotalCostCents(value)
        : null
    if (
      !isRecord(value) ||
      value.code !== code ||
      (!allowLegacyCostPrice && record !== null && Object.hasOwn(record, 'costPrice')) ||
      !isNonNegativeNumberWithFourDecimals(value.units) ||
      totalCostCents === null ||
      !hasConsistentHoldingCost(value.units, totalCostCents) ||
      (value.dividendMode !== 'cash' && value.dividendMode !== 'reinvest') ||
      !isValidPurchaseDate(value.purchaseDate)
    ) {
      throw new TypeError(`Fund holding ${code} has an invalid shape`)
    }
    holdings[code] = createFundHolding({
      code,
      dividendMode: value.dividendMode,
      purchaseDate: value.purchaseDate,
      totalCostCents,
      units: value.units,
    })
  }
  return holdings
}

function legacyTotalCostCents(value: unknown): number | null {
  if (!isRecord(value)) return null
  if (
    typeof value.costPrice !== 'number' ||
    !Number.isFinite(value.costPrice) ||
    value.costPrice < 0 ||
    typeof value.units !== 'number' ||
    !Number.isFinite(value.units) ||
    value.units < 0
  ) {
    return null
  }
  const totalCostCents = Math.round(value.costPrice * value.units * 100)
  return Number.isSafeInteger(totalCostCents) && totalCostCents >= 0 ? totalCostCents : null
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

function isFundCode(value: unknown): value is string {
  return typeof value === 'string' && /^\d{6}$/.test(value)
}

function isNonNegativeNumberWithFourDecimals(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false
  const scaled = value * 10_000
  return Math.abs(scaled - Math.round(scaled)) < 1e-8
}

function isNonNegativeIntegerCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function hasConsistentHoldingCost(units: number, totalCostCents: number): boolean {
  return (units === 0 && totalCostCents === 0) || (units > 0 && totalCostCents > 0)
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
