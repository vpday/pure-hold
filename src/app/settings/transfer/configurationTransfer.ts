import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition.ts'
import { validateIndexGroups } from '@/domains/indices/models/validateIndexGroups.ts'
import type { FundSettings } from '@/domains/funds/models/fundSettings.ts'
import { validateAndCloneFundSettings } from '@/domains/funds/services/persistence/validateFundSettings.ts'
import type { Portfolio } from '@/domains/portfolio/models/index.ts'
import { validateAndClonePortfolio } from '@/domains/portfolio/services/persistence/index.ts'

export const configurationTransferFormat = 'pure-hold-settings'
export const configurationTransferVersion = 1

export interface ConfigurationTransferPackage {
  readonly format: typeof configurationTransferFormat
  readonly version: typeof configurationTransferVersion
  readonly index?: {
    readonly groups: readonly IndexGroupDefinition[]
  }
  readonly funds?: FundSettings
  readonly portfolio?: Portfolio
}

export interface ConfigurationTransferSources {
  readonly indexGroups?: readonly IndexGroupDefinition[]
  readonly fundSettings?: FundSettings
  readonly portfolio?: Portfolio
}

export interface ConfigurationTransferWarning {
  readonly section: 'index' | 'funds' | 'portfolio'
  readonly message: string
}

export interface ConfigurationTransferSectionError {
  readonly section: 'index' | 'funds' | 'portfolio'
  readonly message: string
}

export type ConfigurationTransferParseResult =
  | {
      readonly ok: true
      readonly package: ConfigurationTransferPackage
      readonly warnings: readonly ConfigurationTransferWarning[]
      readonly sectionErrors: readonly ConfigurationTransferSectionError[]
    }
  | { readonly ok: false; readonly message: string }

export function createConfigurationTransferPackage(
  sources: ConfigurationTransferSources,
): ConfigurationTransferPackage {
  const result: {
    format: typeof configurationTransferFormat
    version: typeof configurationTransferVersion
    index?: { readonly groups: readonly IndexGroupDefinition[] }
    funds?: FundSettings
    portfolio?: Portfolio
  } = {
    format: configurationTransferFormat,
    version: configurationTransferVersion,
  }

  if (sources.indexGroups !== undefined) {
    result.index = { groups: cloneIndexGroups(sources.indexGroups) }
  }
  if (sources.fundSettings !== undefined) {
    result.funds = validateAndCloneFundSettings(sources.fundSettings)
  }
  if (sources.portfolio !== undefined) {
    result.portfolio = validateAndClonePortfolio(sources.portfolio)
  }
  return result
}

export function serializeConfigurationTransfer(sources: ConfigurationTransferSources): string {
  return JSON.stringify(createConfigurationTransferPackage(sources), null, 2)
}

export function parseConfigurationTransfer(
  text: string,
  knownIndexQuoteCodes: ReadonlySet<string>,
  knownFundCodes?: ReadonlySet<string>,
): ConfigurationTransferParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { message: '配置文件不是有效的 JSON', ok: false }
  }

  if (
    !isRecord(parsed) ||
    parsed.format !== configurationTransferFormat ||
    parsed.version !== configurationTransferVersion
  ) {
    return { message: '配置文件版本或格式不兼容', ok: false }
  }

  const result: {
    format: typeof configurationTransferFormat
    version: typeof configurationTransferVersion
    index?: { readonly groups: readonly IndexGroupDefinition[] }
    funds?: FundSettings
    portfolio?: Portfolio
  } = {
    format: configurationTransferFormat,
    version: configurationTransferVersion,
  }

  const hasIndex = parsed.index !== undefined
  if (hasIndex) {
    try {
      const groups = parseIndexGroups(parsed.index, knownIndexQuoteCodes)
      result.index = { groups }
    } catch (error) {
      return { message: getErrorMessage(error, '指数配置结构无效'), ok: false }
    }
  }

  const hasFunds = parsed.funds !== undefined
  if (hasFunds) {
    try {
      result.funds = validateAndCloneFundSettings(parsed.funds)
    } catch (error) {
      return { message: getErrorMessage(error, '基金配置结构无效'), ok: false }
    }
  }

  const hasPortfolio = parsed.portfolio !== undefined
  if (hasPortfolio) {
    try {
      result.portfolio = validateAndClonePortfolio(parsed.portfolio)
    } catch (error) {
      return { message: getErrorMessage(error, '投资账本结构无效'), ok: false }
    }
  }

  if (!hasIndex && !hasFunds && !hasPortfolio) {
    return { message: '配置文件不包含可导入的配置分区', ok: false }
  }

  const warnings =
    hasPortfolio && knownFundCodes !== undefined
      ? createPortfolioWarnings(result.portfolio!, knownFundCodes)
      : []

  return { ok: true, package: result, sectionErrors: [], warnings }
}

function createPortfolioWarnings(
  portfolio: Portfolio,
  knownFundCodes: ReadonlySet<string>,
): ConfigurationTransferWarning[] {
  const orphanedFundCodes = new Set<string>(portfolio.fundCodes)
  for (const event of portfolio.events) orphanedFundCodes.add(event.fundCode)

  const missingFundCodes = [...orphanedFundCodes]
    .filter((fundCode) => !knownFundCodes.has(fundCode))
    .sort()
  if (missingFundCodes.length === 0) return []

  return [
    {
      message: `投资账本包含未添加基金 ${missingFundCodes.join('、')} 的孤立记录，恢复基金后会按代码重新关联`,
      section: 'portfolio',
    },
  ]
}

function parseIndexGroups(
  value: unknown,
  knownQuoteCodes: ReadonlySet<string>,
): IndexGroupDefinition[] {
  if (!isRecord(value) || !Array.isArray(value.groups)) {
    throw new TypeError('指数配置缺少 groups 数组')
  }

  const groups = value.groups.map((group) => {
    if (
      !isRecord(group) ||
      typeof group.id !== 'string' ||
      typeof group.name !== 'string' ||
      !Array.isArray(group.quoteCodes) ||
      group.quoteCodes.some((quoteCode) => typeof quoteCode !== 'string')
    ) {
      throw new TypeError('指数分组结构无效')
    }

    return { id: group.id, name: group.name, quoteCodes: [...group.quoteCodes] }
  })

  const validation = validateIndexGroups(groups, knownQuoteCodes)
  if (!validation.ok) {
    throw new TypeError(`指数配置无效：${validation.issue.code}`)
  }
  return [...validation.groups]
}

function cloneIndexGroups(groups: readonly IndexGroupDefinition[]): IndexGroupDefinition[] {
  return groups.map((group) => {
    if (
      typeof group.id !== 'string' ||
      typeof group.name !== 'string' ||
      !Array.isArray(group.quoteCodes) ||
      group.quoteCodes.some((quoteCode) => typeof quoteCode !== 'string')
    ) {
      throw new TypeError('指数配置结构无效')
    }
    return { id: group.id, name: group.name, quoteCodes: [...group.quoteCodes] }
  })
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message.length > 0 ? error.message : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
