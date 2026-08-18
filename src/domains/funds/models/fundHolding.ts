export type FundDividendMode = 'cash' | 'reinvest'

export interface FundHolding {
  readonly code: string
  readonly dividendMode: FundDividendMode
  readonly purchaseDate: string
  /** The persisted cost fact. The value is always an integer number of cents. */
  readonly totalCostCents?: number
  readonly units: number
  /**
   * Temporary read-only compatibility for the transaction form.
   * Validated settings never persist this field; it is derived from totalCostCents.
   */
  readonly costPrice?: number
}

export interface ExactFundHolding extends FundHolding {
  readonly totalCostCents: number
}

export function createFundHolding(input: {
  readonly code: string
  readonly dividendMode: FundDividendMode
  readonly purchaseDate: string
  readonly totalCostCents: number
  readonly units: number
}): ExactFundHolding {
  const holding: ExactFundHolding = { ...input }
  Object.defineProperty(holding, 'costPrice', {
    configurable: true,
    enumerable: false,
    get: () => averageCostPrice(holding),
  })
  return holding
}

export function holdingTotalCostCents(holding: FundHolding): number | null {
  if (
    holding.totalCostCents !== undefined &&
    Number.isSafeInteger(holding.totalCostCents) &&
    holding.totalCostCents >= 0
  ) {
    return holding.totalCostCents
  }

  if (
    holding.costPrice !== undefined &&
    Number.isFinite(holding.costPrice) &&
    holding.costPrice >= 0 &&
    Number.isFinite(holding.units) &&
    holding.units >= 0
  ) {
    const totalCostCents = Math.round(holding.costPrice * holding.units * 100)
    return Number.isSafeInteger(totalCostCents) && totalCostCents >= 0 ? totalCostCents : null
  }

  return null
}

export function averageCostPrice(holding: FundHolding): number | null {
  const totalCostCents = holdingTotalCostCentsWithoutLegacy(holding)
  if (totalCostCents === null || !Number.isFinite(holding.units) || holding.units <= 0) {
    return null
  }
  return totalCostCents / 100 / holding.units
}

function holdingTotalCostCentsWithoutLegacy(holding: FundHolding): number | null {
  if (
    holding.totalCostCents === undefined ||
    !Number.isSafeInteger(holding.totalCostCents) ||
    holding.totalCostCents < 0
  ) {
    return holdingTotalCostCents(holding)
  }
  return holding.totalCostCents
}
