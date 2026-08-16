import type {
  FieldValue,
  Portfolio,
  PortfolioAdjustmentEvent,
  PortfolioBatch,
  PortfolioBuyEvent,
  PortfolioCashDividendEvent,
  PortfolioDividendReinvestmentEvent,
  PortfolioEvent,
  PortfolioInitialHoldingEvent,
  PortfolioInstallment,
  PortfolioPlan,
  PortfolioSellEvent,
} from './portfolio.ts'

const EVENT_COMMON_KEYS = new Set([
  'id',
  'fundCode',
  'confirmedDate',
  'submittedDate',
  'settlementStatus',
  'source',
  'auditedAt',
  'createdAt',
  'updatedAt',
  'planId',
  'installmentId',
])

export function createPortfolio(value: unknown): Portfolio {
  return validatePortfolio(value)
}

export function validatePortfolio(value: unknown): Portfolio {
  const record = requireRecord(value, 'Portfolio')
  const fundCodes = validateFundCodes(record.fundCodes)
  const events = validateArray(record.events, 'Portfolio events').map(validatePortfolioEvent)
  const plans = validateArray(record.plans, 'Portfolio plans').map(validatePortfolioPlan)
  const installments = validateArray(record.installments, 'Portfolio installments').map(
    validatePortfolioInstallment,
  )

  const ids = new Set<string>()
  for (const item of [...events, ...plans, ...installments]) {
    if (ids.has(item.id)) throw new TypeError('Portfolio contains duplicate ID')
    ids.add(item.id)
  }

  const plansById = new Map(plans.map((plan) => [plan.id, plan]))
  const installmentsById = new Map(installments.map((installment) => [installment.id, installment]))
  for (const event of events) {
    if (event.planId === undefined && event.installmentId === undefined) continue
    if (event.kind !== 'buy') {
      throw new TypeError('Plan associations are only valid for buy events')
    }
    if (event.planId === undefined || event.installmentId === undefined) {
      throw new TypeError('Buy plan association requires plan and installment IDs')
    }
    const plan = plansById.get(event.planId)
    const installment = installmentsById.get(event.installmentId)
    if (!plan || !installment || installment.planId !== plan.id) {
      throw new TypeError('Portfolio event references an unknown plan or installment')
    }
    if (event.fundCode !== plan.fundCode || event.fundCode !== installment.fundCode) {
      throw new TypeError('Portfolio plan association references another fund')
    }
  }
  for (const installment of installments) {
    const plan = plansById.get(installment.planId)
    if (!plan) throw new TypeError('Portfolio installment references an unknown plan')
    if (plan.fundCode !== installment.fundCode) {
      throw new TypeError('Portfolio installment references another fund')
    }
  }

  return { events, fundCodes, installments, plans }
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
    ['manual', 'plan', 'dividend-reinvestment', 'initial-holding', 'adjustment'],
    'event source',
  )
  validateEventSource(kind, source)
  validateAssociationFields(record, kind, source)

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

export function createPortfolioBatch(value: unknown): PortfolioBatch {
  return validatePortfolioBatch(value)
}

export function validatePortfolioBatch(value: unknown): PortfolioBatch {
  const record = requireRecord(value, 'Portfolio batch')
  const id = validateId(record.id, 'batch ID')
  const eventId = validateId(record.eventId, 'batch event ID')
  const fundCode = validateFundCode(record.fundCode)
  const confirmedDate = validateDate(record.confirmedDate, 'batch confirmation date')
  const units = validateField(record.units, 'batch units', { allowNegative: false, maxDecimals: 4 })
  const costAmount = validateField(record.costAmount, 'batch cost amount', {
    allowNegative: false,
    maxDecimals: 0,
  })
  return { confirmedDate, costAmount, eventId, fundCode, id, units }
}

export function createPortfolioPlan(value: unknown): PortfolioPlan {
  return validatePortfolioPlan(value)
}

export function validatePortfolioPlan(value: unknown): PortfolioPlan {
  const record = requireRecord(value, 'Portfolio plan')
  validateId(record.id, 'plan ID')
  const fundCode = validateFundCode(record.fundCode)
  const amountCents = validateInteger(record.amountCents, 'plan amount', false)
  const cycle = requireStringUnion(record.cycle, ['weekly', 'monthly', 'daily'], 'plan cycle')
  const executionDay = validateInteger(record.executionDay, 'plan execution day', false)
  if (
    (cycle === 'weekly' && (executionDay < 1 || executionDay > 7)) ||
    (cycle === 'monthly' && (executionDay < 1 || executionDay > 31)) ||
    (cycle === 'daily' && executionDay !== 1)
  ) {
    throw new TypeError('Plan execution day is out of range')
  }
  const startDate = validateDate(record.startDate, 'plan start date')
  const endDate =
    record.endDate === undefined ? undefined : validateDate(record.endDate, 'plan end date')
  if (endDate !== undefined && endDate < startDate) {
    throw new TypeError('Plan end date must not precede its start date')
  }
  const status = requireStringUnion(record.status, ['active', 'paused'], 'plan status')
  const executionMode = requireStringUnion(
    record.executionMode,
    ['manual', 'local-draft'],
    'plan execution mode',
  )
  const purchaseFeeRate =
    record.purchaseFeeRate === undefined
      ? undefined
      : validateRate(record.purchaseFeeRate, 'plan purchase fee rate')
  const createdAt = validateDateTime(record.createdAt, 'plan created audit time')
  const updatedAt = validateDateTime(record.updatedAt, 'plan updated audit time')
  const result: Record<string, unknown> = {
    amountCents,
    createdAt,
    cycle,
    executionDay,
    executionMode,
    fundCode,
    id: record.id,
    startDate,
    status,
    updatedAt,
  }
  if (endDate !== undefined) result.endDate = endDate
  if (purchaseFeeRate !== undefined) result.purchaseFeeRate = purchaseFeeRate
  return result as unknown as PortfolioPlan
}

export function createPortfolioInstallment(value: unknown): PortfolioInstallment {
  return validatePortfolioInstallment(value)
}

export function validatePortfolioInstallment(value: unknown): PortfolioInstallment {
  const record = requireRecord(value, 'Portfolio installment')
  validateId(record.id, 'installment ID')
  const planId = validateId(record.planId, 'installment plan ID')
  const fundCode = validateFundCode(record.fundCode)
  const plannedDate = validateDate(record.plannedDate, 'installment planned date')
  const confirmedDate =
    record.confirmedDate === undefined
      ? undefined
      : validateDate(record.confirmedDate, 'installment confirmation date')
  const status = requireStringUnion(
    record.status,
    ['pending', 'executed', 'skipped', 'cancelled'],
    'installment status',
  )
  const createdAt = validateDateTime(record.createdAt, 'installment created audit time')
  const updatedAt = validateDateTime(record.updatedAt, 'installment updated audit time')
  const result: Record<string, unknown> = {
    createdAt,
    fundCode,
    id: record.id,
    planId,
    plannedDate,
    status,
    updatedAt,
  }
  if (confirmedDate !== undefined) result.confirmedDate = confirmedDate
  return result as unknown as PortfolioInstallment
}

function validateEventCommon(record: Record<string, unknown>): void {
  validateId(record.id, 'event ID')
  validateFundCode(record.fundCode)
  validateDate(record.confirmedDate, 'event confirmation date')
  if (record.submittedDate !== undefined)
    validateDate(record.submittedDate, 'event submission date')
  requireStringUnion(record.settlementStatus, ['pending-settlement', 'settled'], 'event status')
  validateDateTime(record.auditedAt, 'event audit time')
  validateDateTime(record.createdAt, 'event created audit time')
  validateDateTime(record.updatedAt, 'event updated audit time')
}

function validateEventSource(kind: string, source: string): void {
  const expected = {
    adjustment: 'adjustment',
    'cash-dividend': 'manual',
    buy: ['manual', 'plan'],
    'dividend-reinvestment': 'dividend-reinvestment',
    'initial-holding': 'initial-holding',
    sell: 'manual',
  }[kind as keyof Record<string, string | string[]>]
  if (Array.isArray(expected) ? !expected.includes(source) : expected !== source) {
    throw new TypeError('Event source does not match its kind')
  }
}

function validateAssociationFields(
  record: Record<string, unknown>,
  kind: string,
  source: string,
): void {
  const hasPlanId = record.planId !== undefined
  const hasInstallmentId = record.installmentId !== undefined
  if (hasPlanId !== hasInstallmentId || (hasPlanId && kind !== 'buy')) {
    throw new TypeError('Event has an invalid plan or installment association')
  }
  if (hasPlanId) {
    validateId(record.planId, 'event plan ID')
    validateId(record.installmentId, 'event installment ID')
    if (source !== 'plan') throw new TypeError('Only plan events may have plan associations')
  } else if (source === 'plan') {
    throw new TypeError('Plan event requires plan associations')
  }
}

function validateBuyEvent(record: Record<string, unknown>): PortfolioBuyEvent {
  rejectUnexpectedKeys(
    record,
    new Set([
      ...EVENT_COMMON_KEYS,
      'kind',
      'totalAmount',
      'units',
      'unitNav',
      'purchaseFee',
      'purchaseFeeRate',
    ]),
  )
  return {
    ...eventBase(record, 'buy'),
    kind: 'buy',
    purchaseFee: validateField(record.purchaseFee, 'purchase fee', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    purchaseFeeRate: validateRateField(record.purchaseFeeRate, 'purchase fee rate'),
    totalAmount: validateField(record.totalAmount, 'total amount', {
      allowNegative: false,
      maxDecimals: 0,
    }),
    unitNav: validateField(record.unitNav, 'unit NAV', { allowNegative: false, maxDecimals: 4 }),
    units: validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 }),
  } as unknown as PortfolioBuyEvent
}

function validateSellEvent(record: Record<string, unknown>): PortfolioSellEvent {
  rejectUnexpectedKeys(
    record,
    new Set([
      ...EVENT_COMMON_KEYS,
      'kind',
      'units',
      'unitNav',
      'grossAmount',
      'netAmount',
      'redemptionFee',
    ]),
  )
  const result: Record<string, unknown> = {
    ...eventBase(record, 'sell'),
    kind: 'sell',
    units: validateField(record.units, 'units', { allowNegative: false, maxDecimals: 4 }),
  }
  const unitNav = optionalField(record.unitNav, 'unit NAV', 4)
  const grossAmount = optionalField(record.grossAmount, 'gross redemption amount', 0)
  const netAmount = optionalField(record.netAmount, 'net redemption amount', 0)
  const redemptionFee = optionalField(record.redemptionFee, 'redemption fee', 0)
  if (unitNav !== undefined) result.unitNav = unitNav
  if (grossAmount !== undefined) result.grossAmount = grossAmount
  if (netAmount !== undefined) result.netAmount = netAmount
  if (redemptionFee !== undefined) result.redemptionFee = redemptionFee
  return result as unknown as PortfolioSellEvent
}

function validateCashDividendEvent(record: Record<string, unknown>): PortfolioCashDividendEvent {
  rejectUnexpectedKeys(record, new Set([...EVENT_COMMON_KEYS, 'kind', 'cashAmount']))
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
    new Set([...EVENT_COMMON_KEYS, 'kind', 'dividendAmount', 'units', 'unitNav']),
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
  rejectUnexpectedKeys(record, new Set([...EVENT_COMMON_KEYS, 'kind', 'units', 'costAmount']))
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
    new Set([...EVENT_COMMON_KEYS, 'kind', 'unitsDelta', 'costAmountDelta', 'reason']),
  )
  const reason = requireString(record.reason, 'adjustment reason').trim()
  if (reason.length === 0) throw new TypeError('Adjustment reason must not be empty')
  return {
    ...eventBase(record, 'adjustment'),
    costAmountDelta: validateField(record.costAmountDelta, 'cost amount delta', {
      allowNegative: true,
      maxDecimals: 0,
    }),
    kind: 'adjustment',
    reason,
    unitsDelta: validateField(record.unitsDelta, 'units delta', {
      allowNegative: true,
      maxDecimals: 4,
    }),
  } as unknown as PortfolioAdjustmentEvent
}

function eventBase(
  record: Record<string, unknown>,
  kind: PortfolioEvent['kind'],
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    auditedAt: validateDateTime(record.auditedAt, 'event audit time'),
    confirmedDate: validateDate(record.confirmedDate, 'event confirmation date'),
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
  const planId = optionalId(record.planId, 'event plan ID')
  const installmentId = optionalId(record.installmentId, 'event installment ID')
  if (planId !== undefined) result.planId = planId
  if (installmentId !== undefined) result.installmentId = installmentId
  if (record.submittedDate !== undefined) {
    result.submittedDate = validateDate(record.submittedDate, 'event submission date')
  }
  return result
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

function optionalField(
  value: unknown,
  label: string,
  maxDecimals: number,
): FieldValue<number> | undefined {
  return value === undefined
    ? undefined
    : validateField(value, label, { allowNegative: false, maxDecimals })
}

function validateRate(value: unknown, label: string): number {
  return validateNumber(value, label, false, 4, 100)
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

function optionalId(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : validateId(value, label)
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

function validateInteger(value: unknown, label: string, allowNegative: boolean): number {
  return validateNumber(value, label, allowNegative, 0)
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
