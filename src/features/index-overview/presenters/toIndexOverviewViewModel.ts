import type { IndexDefinition } from '@/domains/indices/models/indexDefinition'
import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition'
import type { IndexQuoteHealth, IndexQuoteSnapshot } from '@/domains/indices/models/indexQuote'
import type {
  IndexOverviewViewModel,
  IndexQuoteViewModel,
  QuoteTrend,
} from '../models/indexOverviewViewModel'

interface IndexOverviewSource {
  readonly definitions: readonly IndexDefinition[]
  readonly groups: readonly IndexGroupDefinition[]
  readonly health: IndexQuoteHealth
  readonly lastSuccessfulAt?: number
  readonly quotesByIndexId: Readonly<Record<string, IndexQuoteSnapshot>>
}

export function toIndexOverviewViewModel(source: IndexOverviewSource): IndexOverviewViewModel {
  const definitionsByQuoteCode = new Map(
    source.definitions.map((definition) => [definition.quoteCode, definition]),
  )
  const groups = source.groups.map((group) => ({
    id: group.id,
    items: group.quoteCodes.flatMap((quoteCode) => {
      const definition = definitionsByQuoteCode.get(quoteCode)
      return definition
        ? [toIndexQuoteViewModel(definition, source.quotesByIndexId[definition.id])]
        : []
    }),
    name: group.name,
  }))
  const quoteTimes = Object.values(source.quotesByIndexId).map((quote) => quote.quotedAt)
  const latestQuoteTime = quoteTimes.length > 0 ? Math.max(...quoteTimes) : source.lastSuccessfulAt

  if (source.health === 'failed') {
    return {
      groups,
      statusText: latestQuoteTime
        ? `更新失败，显示 ${formatShanghaiTime(latestQuoteTime)} 数据`
        : '行情加载失败',
      statusTone: 'error',
    }
  }

  if (source.health === 'partial') {
    return {
      groups,
      statusText: latestQuoteTime
        ? `部分行情更新失败，更新于 ${formatShanghaiTime(latestQuoteTime)}`
        : '部分行情加载失败',
      statusTone: 'warning',
    }
  }

  return {
    groups,
    statusText: latestQuoteTime ? `更新于 ${formatShanghaiTime(latestQuoteTime)}` : '行情加载中',
    statusTone: 'neutral',
  }
}

function toIndexQuoteViewModel(
  definition: IndexDefinition,
  quote?: IndexQuoteSnapshot,
): IndexQuoteViewModel {
  if (!quote) {
    return {
      changeAmountText: '--',
      changePercentText: '--',
      code: definition.securityCode,
      id: definition.id,
      name: definition.name,
      priceText: '--',
      trend: 'unknown',
    }
  }

  return {
    changeAmountText: formatSignedNumber(quote.changeAmount),
    changePercentText: `${formatSignedNumber(quote.changePercent)}%`,
    code: definition.securityCode,
    id: definition.id,
    name: definition.name,
    priceText: quote.price.toFixed(2),
    trend: toTrend(quote.changePercent),
  }
}

function formatSignedNumber(value: number): string {
  const formatted = value.toFixed(2)
  return value > 0 ? `+${formatted}` : formatted
}

function toTrend(value: number): QuoteTrend {
  if (value > 0) {
    return 'up'
  }
  if (value < 0) {
    return 'down'
  }
  return 'flat'
}

function formatShanghaiTime(timestamp: number): string {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
  }).formatToParts(timestamp)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`
}
