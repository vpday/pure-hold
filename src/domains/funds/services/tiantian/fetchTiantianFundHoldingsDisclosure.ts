import type {
  FundHoldingsDisclosure,
  FundStockHoldingsSource,
} from '../../models/fundHoldingsDisclosure.ts'
import { createTiantianFundHoldingsDisclosureRequestUrl } from './createTiantianFundHoldingsDisclosureRequestUrl.ts'
import { parseTiantianFundHoldingsDisclosureResponse } from './parseTiantianFundHoldingsDisclosureResponse.ts'
import type { TiantianFundHoldingsDto } from './tiantianFundHoldingsDto.ts'

export async function fetchTiantianFundHoldingsDisclosure(
  fundCode: string,
  reportDate: string,
  signal?: AbortSignal,
): Promise<FundHoldingsDisclosure> {
  const primary = await requestTiantianFundHoldingsDisclosure(fundCode, reportDate, signal)
  if (primary.disclosure.stocks.length > 0) return primary.disclosure

  const etfSource = primary.etfSource
  if (!etfSource || etfSource.code === fundCode) return primary.disclosure

  try {
    const etf = await requestTiantianFundHoldingsDisclosure(etfSource.code, reportDate, signal)
    if (etf.disclosure.stocks.length === 0) return primary.disclosure
    return {
      ...primary.disclosure,
      stockHoldingsSource: etfSource,
      stocks: etf.disclosure.stocks,
    }
  } catch (error) {
    if (isAbortError(error)) throw error
    return primary.disclosure
  }
}

async function requestTiantianFundHoldingsDisclosure(
  fundCode: string,
  reportDate: string,
  signal?: AbortSignal,
): Promise<{
  readonly disclosure: FundHoldingsDisclosure
  readonly etfSource?: FundStockHoldingsSource
}> {
  const response = await fetch(
    createTiantianFundHoldingsDisclosureRequestUrl(fundCode, reportDate),
    {
      signal,
    },
  )
  if (!response.ok) {
    throw new Error(`Tiantian fund holdings request failed with HTTP ${response.status}`)
  }
  const payload: unknown = await response.json()
  const etfSource = extractEtfSource(payload)
  return {
    disclosure: parseTiantianFundHoldingsDisclosureResponse(payload, fundCode, reportDate),
    etfSource,
  }
}

function extractEtfSource(value: unknown): FundStockHoldingsSource | undefined {
  if (!isRecord(value) || !isRecord(value.data)) return undefined
  const data = value.data as TiantianFundHoldingsDto
  const rawCode = data.ETFCODE
  const rawName = data.ETFSHORTNAME
  if (typeof rawCode !== 'string') return undefined
  const code = rawCode.trim()
  const name = typeof rawName === 'string' ? rawName.trim() : ''
  return /^\d{6}$/.test(code) ? { code, name: name || null } : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
