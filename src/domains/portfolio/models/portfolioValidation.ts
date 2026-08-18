import type {
  FieldValue,
  Portfolio,
  PortfolioAdjustmentEvent,
  PortfolioBuyEvent,
  PortfolioCashDividendEvent,
  PortfolioDividendReinvestmentEvent,
  PortfolioEvent,
  PortfolioInitialHoldingEvent,
  PortfolioSellEvent,
} from './portfolio.ts'
import {
  deriveTransactionSchedule,
  getShanghaiDate,
  getShanghaiMinute,
  isShanghaiMinuteAtOrBefore,
  isTradingDay,
  isValidShanghaiMinute,
} from '../services/tradingCalendar.ts'

const EVENT_COMMON_KEYS = new Set([
  'id',
  'fundCode',
  'settlementStatus',
  'source',
  'auditedAt',
  'createdAt',
  'updatedAt',
])

export function createPortfolio(value: unknown): Portfolio {
  return validatePortfolio(value)
}

export function validatePortfolio(value: unknown): Portfolio {
  const record = requireRecord(value, 'Portfolio')
  for (const key of Object.keys(record)) {
    if (key !== 'events' && key !== 'fundCodes') {
      throw new TypeError(`Portfolio field ${key} is incompatible with its structure`)
    }
  }
  const fundCodes = validateFundCodes(record.fundCodes)
  const events = validateArray(record.events, 'Portfolio events').map(validatePortfolioEvent)
  const ids = new Set<string>()
  for (const event of events) {
    if (ids.has(event.id)) throw new TypeError('Portfolio contains duplicate ID')
    ids.add(event.id)
  }
  return { events, fundCodes }
}

export function createPortfolioEvent(value: unknown): PortfolioEvent {
  return validatePortfolioEvent(value)
}

export function validatePortfolioEvent(value: unknown): PortfolioEvent {
  const record = requireRecord(value, 'Portfolio event')
  validateEventCommon(record)
  const kind = requireStringUnion(
    record.kind,
    ['buy', 'sell', 'cash-dividend', 'dividend-reinvestment', 'initial-holding', 'adjustment'],
    'event kind',
  )
  const source = requireStringUnion(
    record.source,
    ['manual', 'dividend-reinvestment', 'initial-holding', 'adjustment'],
    'event source',
  )
  validateEventSource(kind, source)

  switch (kind) {
    case 'buy':
      return validateBuyEvent(record)
    case 'sell':
      return validateSellEvent(record)
    case 'cash-dividend':
      return validateCashDividendEvent(record)
    case 'dividend-reinvestment':
      return validateDividendReinvestmentEvent(record)
    case 'initial-holding':
      return validateInitialHoldingEvent(record)
    case 'adjustment':
      return validateAdjustmentEvent(record)
  }
}

function validateEventCommon(record: Record<string, unknown>): void {
  validateId(record.id, 'event ID')
  validateFundCode(record.fundCode)
  requireStringUnion(record.settlementStatus, ['pending-settlement', 'settled'], 'event status')
  validateDateTime(record.auditedAt, 'event audit time')
  validateDateTime(record.createdAt, 'event created audit time')
  validateDateTime(record.updatedAt, 'event updated audit time')
}

function validateEventSource(kind: string, source: string): void {
  const expected = {
    adjustment: 'adjustment',
    'cash-dividend': 'manual',
    buy: 'manual',
    'dividend-reinvestment': 'dividend-reinvestment',
    'initial-holding': 'initial-holding',
    sell: 'manual',
  }[kind as keyof Record<string, string | string[]>]
  if (Array.isArray(expected) ? !expected.includes(source) : expected !== source) {
    throw new TypeError('Event source does not match its kind')
  }
}

function validateBuyEvent(record: Record<string, unknown>): PortfolioBuyEvent {
  rejectUnexpectedKeys(
    record,
    new Set([
      ...EVENT_COMMON_KEYS,
      'kind',
      'entryMode',
      'submittedAt',
      'navDate',
      'expectedConfirmationDate',
      'confirmedDate',
      'totalAmount',
      'units',
      'unitNav',
      'purchaseFee',
      'purchaseFeeRate',
    ]),
  )
  const totalAmount = validateField(record.totalAmount, 'total amount', {
    allowNegative: false,
    maxDecimals: 0,
  })
  requirePositiveField(totalAmount, 'total amount')
  const units = validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 })
  const transaction = validateTransactionBase(record, units)
  return {
    ...transaction,
    kind: 'buy',
    purchaseFee: validateField(record.purchaseFee, 'purchase fee', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    purchaseFeeRate: validateRateField(record.purchaseFeeRate, 'purchase fee rate'),
    totalAmount,
    unitNav: validateField(record.unitNav, 'unit NAV', { allowNegative: false, maxDecimals: 4 }),
    units,
  } as unknown as PortfolioBuyEvent
}

function validateSellEvent(record: Record<string, unknown>): PortfolioSellEvent {
  rejectUnexpectedKeys(
    record,
    new Set([
      ...EVENT_COMMON_KEYS,
      'kind',
      'entryMode',
      'submittedAt',
      'navDate',
      'expectedConfirmationDate',
      'confirmedDate',
      'requestedUnits',
      'units',
      'unitNav',
      'grossAmount',
      'netAmount',
      'redemptionFee',
    ]),
  )
  const requestedUnits = validateField(record.requestedUnits, 'requested units', {
    allowNegative: false,
    maxDecimals: 4,
  })
  requirePositiveField(requestedUnits, 'requested units')
  const units = validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 })
  const transaction = validateTransactionBase(record, units)
  const result: Record<string, unknown> = {
    ...transaction,
    kind: 'sell',
    requestedUnits,
    units,
  }
  result.unitNav = validateField(record.unitNav, 'unit NAV', {
    allowNegative: false,
    maxDecimals: 4,
  })
  result.grossAmount = validateField(record.grossAmount, 'gross redemption amount', {
    allowNegative: false,
    maxDecimals: 0,
  })
  result.netAmount = validateField(record.netAmount, 'net redemption amount', {
    allowNegative: false,
    maxDecimals: 0,
  })
  result.redemptionFee = validateField(record.redemptionFee, 'redemption fee', {
    allowNegative: false,
    maxDecimals: 0,
  })
  return result as unknown as PortfolioSellEvent
}

function validateCashDividendEvent(record: Record<string, unknown>): PortfolioCashDividendEvent {
  rejectUnexpectedKeys(
    record,
    new Set([...EVENT_COMMON_KEYS, 'confirmedDate', 'kind', 'cashAmount']),
  )
  return {
    ...eventBase(record, 'cash-dividend'),
    cashAmount: validateField(record.cashAmount, 'cash dividend amount', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    kind: 'cash-dividend',
  } as unknown as PortfolioCashDividendEvent
}

function validateDividendReinvestmentEvent(
  record: Record<string, unknown>,
): PortfolioDividendReinvestmentEvent {
  rejectUnexpectedKeys(
    record,
    new Set([...EVENT_COMMON_KEYS, 'confirmedDate', 'kind', 'dividendAmount', 'units', 'unitNav']),
  )
  return {
    ...eventBase(record, 'dividend-reinvestment'),
    dividendAmount: validateField(record.dividendAmount, 'dividend amount', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    kind: 'dividend-reinvestment',
    unitNav: validateField(record.unitNav, 'unit NAV', { allowNegative: false, maxDecimals: 4 }),
    units: validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 }),
  } as unknown as PortfolioDividendReinvestmentEvent
}

function validateInitialHoldingEvent(
  record: Record<string, unknown>,
): PortfolioInitialHoldingEvent {
  rejectUnexpectedKeys(
    record,
    new Set([...EVENT_COMMON_KEYS, 'confirmedDate', 'kind', 'units', 'costAmount']),
  )
  return {
    ...eventBase(record, 'initial-holding'),
    costAmount: validateField(record.costAmount, 'initial holding cost amount', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    kind: 'initial-holding',
    units: validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 }),
  } as unknown as PortfolioInitialHoldingEvent
}

function validateAdjustmentEvent(record: Record<string, unknown>): PortfolioAdjustmentEvent {
  rejectUnexpectedKeys(
    record,
    new Set([
      ...EVENT_COMMON_KEYS,
      'confirmedDate',
      'kind',
      'targetUnits',
      'targetCostAmount',
      'reason',
    ]),
  )
  const reason = requireString(record.reason, 'adjustment reason').trim()
  if (reason.length === 0) throw new TypeError('Adjustment reason must not be empty')
  const targetCostAmount = validateField(record.targetCostAmount, 'target cost amount', {
    allowNegative: false,
    maxDecimals: 0,
  })
  const targetUnits = validateField(record.targetUnits, 'target units', {
    allowNegative: false,
    maxDecimals: 4,
  })
  validateTargetAggregate(targetUnits, targetCostAmount)
  return {
    ...eventBase(record, 'adjustment'),
    targetCostAmount,
    kind: 'adjustment',
    reason,
    targetUnits,
  } as unknown as PortfolioAdjustmentEvent
}

function validateTargetAggregate(units: FieldValue<number>, costAmount: FieldValue<number>): void {
  if (units.value === null || costAmount.value === null) return
  const unitsAreZero = units.value === 0
  const costAmountIsZero = costAmount.value === 0
  if (unitsAreZero !== costAmountIsZero) {
    throw new TypeError('Adjustment target units and cost amount must be zero together')
  }
}

function eventBase(
  record: Record<string, unknown>,
  kind: PortfolioEvent['kind'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    auditedAt: validateDateTime(record.auditedAt, 'event audit time'),
    createdAt: validateDateTime(record.createdAt, 'event created audit time'),
    fundCode: validateFundCode(record.fundCode),
    id: validateId(record.id, 'event ID'),
    kind,
    settlementStatus: requireStringUnion(
      record.settlementStatus,
      ['pending-settlement', 'settled'],
      'event status',
    ),
    source: requireString(record.source, 'event source') as PortfolioEvent['source'],
    updatedAt: validateDateTime(record.updatedAt, 'event updated audit time'),
  }
  if (kind !== 'buy' && kind !== 'sell') {
    result.confirmedDate = validateDate(record.confirmedDate, 'event confirmation date')
  }
  return result
}

function validateTransactionBase(
  record: Record<string, unknown>,
  units: FieldValue<number>,
): Record<string, unknown> {
  const entryMode = requireStringUnion(record.entryMode, ['pending', 'historical'], 'entry mode')
  const submittedAt = requireString(record.submittedAt, 'transaction submission time')
  if (!isValidShanghaiMinute(submittedAt)) {
    throw new TypeError('Transaction submission time is invalid')
  }
  if (!isShanghaiMinuteAtOrBefore(submittedAt, getShanghaiMinute())) {
    throw new TypeError('Transaction submission time cannot be in the future')
  }
  const navDate = validateDate(record.navDate, 'transaction NAV date')
  const schedule = deriveTransactionSchedule({ submittedAt, confirmationDays: null })
  if (navDate !== schedule.navDate) throw new TypeError('Transaction NAV date is inconsistent')

  const expectedConfirmationDate = optionalDate(
    record.expectedConfirmationDate,
    'expected confirmation date',
  )
  if (entryMode === 'historical' && expectedConfirmationDate !== undefined) {
    throw new TypeError('Historical transaction cannot have an expected confirmation date')
  }
  if (
    expectedConfirmationDate !== undefined &&
    (!isTradingDay(expectedConfirmationDate) || expectedConfirmationDate < navDate)
  ) {
    throw new TypeError('Expected confirmation date is invalid')
  }

  const confirmedDate = optionalDate(record.confirmedDate, 'event confirmation date')
  if (confirmedDate !== undefined) {
    const today = getShanghaiDate()
    if (!isTradingDay(confirmedDate) || confirmedDate < navDate || confirmedDate > today) {
      throw new TypeError('Event confirmation date is invalid')
    }
  }
  if (confirmedDate !== undefined && expectedConfirmationDate !== undefined) {
    throw new TypeError('Settled transaction cannot have an expected confirmation date')
  }
  const hasConfirmedUnits = units.value !== null && units.confidence === 'actual'
  if (entryMode === 'historical' && (confirmedDate === undefined || !hasConfirmedUnits)) {
    throw new TypeError('Historical transaction requires confirmation facts')
  }
  const isSettled = confirmedDate !== undefined && hasConfirmedUnits
  const status = requireStringUnion(
    record.settlementStatus,
    ['pending-settlement', 'settled'],
    'event status',
  )
  if ((status === 'settled') !== isSettled) {
    throw new TypeError('Transaction settlement status does not match confirmation facts')
  }

  return {
    ...eventBase(record, 'buy'),
    entryMode,
    navDate,
    ...(expectedConfirmationDate === undefined ? {} : { expectedConfirmationDate }),
    ...(confirmedDate === undefined ? {} : { confirmedDate }),
    submittedAt,
  }
}

function validateField(
  value: unknown,
  label: string,
  options: { readonly allowNegative: boolean; readonly maxDecimals: number },
): FieldValue<number> {
  const record = requireRecord(value, label)
  const confidence = requireStringUnion(
    record.confidence,
    ['actual', 'estimated', 'unknown'],
    `${label} confidence`,
  )
  const source = requireStringUnion(
    record.source,
    ['manual', 'platform', 'fund-basic-info', 'nav-history', 'formula', 'migration'],
    `${label} source`,
  )
  if (confidence === 'unknown') {
    if (record.value !== null) throw new TypeError(`${label} unknown value must be null`)
    return { confidence, source, value: null }
  }
  const number = validateNumber(record.value, label, options.allowNegative, options.maxDecimals)
  return { confidence, source, value: number }
}

function validateRateField(value: unknown, label: string): FieldValue<number> {
  const field = validateField(value, label, { allowNegative: false, maxDecimals: 4 })
  if (field.value !== null && field.value > 100) throw new TypeError(`${label} is out of range`)
  return field
}

function optionalDate(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : validateDate(value, label)
}

function requirePositiveField(field: FieldValue<number>, label: string): void {
  if (field.value === null || field.value <= 0) throw new TypeError(`${label} must be positive`)
}

function validateFundCodes(value: unknown): string[] {
  if (!Array.isArray(value)) throw new TypeError('Portfolio fund codes have an invalid shape')
  const codes = value.map((code) => validateFundCode(code))
  if (new Set(codes).size !== codes.length)
    throw new TypeError('Portfolio fund codes must be unique')
  return [...codes]
}

function validateFundCode(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{6}$/.test(value)) {
    throw new TypeError('Fund code must contain exactly six digits')
  }
  return value
}

function validateId(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${label} is invalid`)
  }
  return value
}

function validateDate(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${label} is invalid`)
  }
  const date = new Date(`${value}T00:00:00.000Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new TypeError(`${label} is invalid`)
  }
  return value
}

function validateDateTime(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value)) {
    throw new TypeError(`${label} is invalid`)
  }
  validateDate(value.slice(0, 10), label)
  if (!Number.isFinite(Date.parse(value))) throw new TypeError(`${label} is invalid`)
  return value
}

function validateNumber(
  value: unknown,
  label: string,
  allowNegative: boolean,
  maxDecimals: number,
  maximum?: number,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || (!allowNegative && value < 0)) {
    throw new TypeError(`${label} must be a non-negative number`)
  }
  const scale = 10 ** maxDecimals
  if (Math.abs(value * scale - Math.round(value * scale)) > 1e-8) {
    throw new TypeError(`${label} has invalid precision`)
  }
  if (maximum !== undefined && value > maximum) throw new TypeError(`${label} is out of range`)
  return value
}

function rejectUnexpectedKeys(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError(`Event field ${key} is incompatible with its kind`)
  }
}

function validateArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} have an invalid shape`)
  return value
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} has an invalid shape`)
  }
  return value as Record<string, unknown>
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} has an invalid shape`)
  return value
}

function requireStringUnion<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    throw new TypeError(`${label} is invalid`)
  }
  return value as T[number]
}
