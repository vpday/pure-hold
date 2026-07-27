import type { FundSearchPage } from '../../models/fundSearch.ts'
import type {
  EastmoneyFundSearchRecord,
  EastmoneyFundSearchResponse,
} from './eastmoneyFundSearchDto.ts'

export function parseEastmoneyFundSearchResponse(
  value: unknown,
  pageIndex: number,
): FundSearchPage {
  if (
    !isRecord(value) ||
    value.success !== true ||
    value.errorCode !== 0 ||
    !Array.isArray(value.data) ||
    !Number.isInteger(value.totalCount) ||
    Number(value.totalCount) < 0
  ) {
    throw new TypeError('基金搜索服务返回了无效数据')
  }

  const response = value as EastmoneyFundSearchResponse
  const seenCodes = new Set<string>()
  const items = (response.data as unknown[]).flatMap((item) => {
    const mapped = mapRecord(item)
    if (!mapped || seenCodes.has(mapped.code)) return []
    seenCodes.add(mapped.code)
    return [mapped]
  })

  return {
    items,
    pageIndex,
    pageSize: 20,
    totalCount: response.totalCount as number,
  }
}

function mapRecord(value: unknown) {
  if (!isRecord(value)) return undefined
  const record = value as EastmoneyFundSearchRecord
  if (typeof record.fcode !== 'string' || !/^\d{6}$/.test(record.fcode)) return undefined
  if (typeof record.shortname !== 'string') return undefined
  const name = record.shortname.trim()
  return name.length > 0 ? { code: record.fcode, name } : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
