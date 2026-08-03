import type {
  FundBondHoldingDisclosure,
  FundHoldingChangeType,
  FundHoldingMarket,
  FundHoldingsDisclosure,
  FundStockHoldingDisclosure,
} from '../../models/fundHoldingsDisclosure.ts'
import type {
  TiantianFundBondHoldingDto,
  TiantianFundHoldingsDto,
  TiantianFundStockHoldingDto,
} from './tiantianFundHoldingsDto.ts'
import { isSuccessfulTiantianResponse } from './tiantianResponse.ts'

const invalidResponseMessage = '基金持仓服务返回了无效数据'

export function parseTiantianFundHoldingsDisclosureResponse(
  value: unknown,
  fundCode: string,
  requestedReportDate: string,
): FundHoldingsDisclosure {
  if (
    !isSuccessfulTiantianResponse(value) ||
    !isRecord(value.data) ||
    value.expansion !== requestedReportDate
  ) {
    throw new Error(invalidResponseMessage)
  }
  const data = value.data as TiantianFundHoldingsDto
  const stockRecords = normalizeRecords(data.fundStocks)
  const bondRecords = normalizeRecords(data.fundboods)
  return {
    bonds: parseBonds(bondRecords),
    fundCode,
    reportDate: requestedReportDate,
    stocks: parseStocks(stockRecords),
  }
}

function normalizeRecords(value: unknown): readonly unknown[] {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw new Error(invalidResponseMessage)
  return value
}

function parseStocks(records: readonly unknown[]): readonly FundStockHoldingDisclosure[] {
  const holdings: FundStockHoldingDisclosure[] = []
  const seen = new Set<string>()
  for (const value of records) {
    if (!isRecord(value) || value.ISINVISBL !== '0') continue
    const record = value as TiantianFundStockHoldingDto
    const code = parseCode(record.GPDM)
    const name = parseText(record.GPJC)
    if (!code || !name) continue
    const market = parseMarket(record.NEWTEXCH)
    const key = `${market ?? 'unknown'}:${code}`
    if (seen.has(key)) continue
    seen.add(key)
    holdings.push({
      changePercent: parseNumber(record.PCTNVCHG),
      changeType: parseChangeType(record.PCTNVCHGTYPE),
      code,
      heavyQuarterCount: parseNonNegativeInteger(record.HOLDCOUNT),
      industryName: parseText(record.INDEXNAME),
      market,
      name,
      netAssetPercent: parseNumber(record.JZBL),
    })
  }
  return holdings
}

function parseBonds(records: readonly unknown[]): readonly FundBondHoldingDisclosure[] {
  const holdings: FundBondHoldingDisclosure[] = []
  const seen = new Set<string>()
  for (const value of records) {
    if (!isRecord(value)) continue
    const record = value as TiantianFundBondHoldingDto
    const code = parseCode(record.ZQDM)
    const name = parseText(record.ZQMC)
    if (!code || !name) continue
    const market = parseMarket(record.NEWTEXCH)
    const key = `${market ?? 'unknown'}:${code}`
    if (seen.has(key)) continue
    seen.add(key)
    holdings.push({ code, market, name, netAssetPercent: parseNumber(record.ZJZBL) })
  }
  return holdings
}

function parseChangeType(value: unknown): FundHoldingChangeType {
  if (value === '增持') return 'increased'
  if (value === '减持') return 'decreased'
  if (value === '新增') return 'new'
  if (value === '持平') return 'unchanged'
  return 'unknown'
}

function parseMarket(value: unknown): FundHoldingMarket | null {
  if (value === '1') return 'sh'
  if (value === '0') return 'sz'
  return null
}

function parseCode(value: unknown): string | null {
  return typeof value === 'string' && /^\d{6}$/.test(value.trim()) ? value.trim() : null
}

function parseText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text || null
}

function parseNumber(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseNonNegativeInteger(value: unknown): number | null {
  const parsed = parseNumber(value)
  return parsed !== null && Number.isInteger(parsed) && parsed >= 0 ? parsed : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
