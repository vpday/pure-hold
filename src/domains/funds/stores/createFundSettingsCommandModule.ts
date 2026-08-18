import type { FundAddition } from '../models/fundAddition.ts'
import type { FundGroupDefinition } from '../models/fundGroupDefinition.ts'
import {
  createFundHolding,
  holdingTotalCostCents,
  type FundHolding,
} from '../models/fundHolding.ts'
import type { FundSetting, FundSettings } from '../models/fundSettings.ts'
import { validateAndCloneFundSettings } from '../services/persistence/validateFundSettings.ts'

export type FundSettingsWriter = (settings: FundSettings) => void

export type FundSettingsCommand =
  | { readonly kind: 'add-funds'; readonly additions: readonly FundAddition[] }
  | { readonly kind: 'delete-fund'; readonly code: string }
  | { readonly kind: 'replace-groups'; readonly groups: readonly FundGroupDefinition[] }
  | {
      readonly kind: 'replace-fund-organization'
      readonly fundOrder: readonly string[]
      readonly groups: readonly FundGroupDefinition[]
      readonly holdingOrder: readonly string[]
    }
  | { readonly kind: 'replace-holding-projection'; readonly holding: FundHolding }
  | {
      readonly kind: 'update-holding-metadata'
      readonly code: string
      readonly dividendMode: FundHolding['dividendMode']
      readonly purchaseDate: string
    }
  | { readonly kind: 'update-fund-holding'; readonly holding: FundHolding }
  | {
      readonly kind: 'update-fund-group-membership'
      readonly code: string
      readonly selectedGroupIds: ReadonlySet<string>
    }
  | { readonly kind: 'replace-settings'; readonly settings: FundSettings }

export type FundSettingsEffect =
  | { readonly kind: 'funds-added'; readonly funds: readonly FundSetting[] }
  | { readonly kind: 'fund-deleted'; readonly code: string }
  | { readonly kind: 'settings-replaced'; readonly funds: readonly FundSetting[] }

export type FundSettingsCommandFailure =
  | 'no-additions'
  | 'invalid-additions'
  | 'fund-data-changed'
  | 'unknown-fund'
  | 'unknown-group'
  | 'invalid-settings'
  | 'persistence-failed'

export type FundSettingsCommitResult =
  | {
      readonly ok: true
      readonly settings: FundSettings
      readonly effect?: FundSettingsEffect
    }
  | { readonly ok: false; readonly reason: FundSettingsCommandFailure }

export type FundSettingsNameSyncResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'persistence-failed' }

export interface FundSettingsCommandModule {
  readonly getSettings: () => FundSettings
  readonly commit: (command: FundSettingsCommand) => FundSettingsCommitResult
  readonly syncObservedNames: (
    names: Readonly<Record<string, string>>,
  ) => FundSettingsNameSyncResult
}

interface CandidateResult {
  readonly ok: true
  readonly settings: FundSettings
  readonly effect?: FundSettingsEffect
  readonly changed: boolean
}

export function createFundSettingsCommandModule(
  initialSettings: FundSettings,
  writer: FundSettingsWriter,
): FundSettingsCommandModule {
  let effectiveSettings = cloneSettings(initialSettings)
  let persistedSettings = cloneSettings(effectiveSettings)

  function getSettings(): FundSettings {
    return cloneSettings(effectiveSettings)
  }

  function commit(command: FundSettingsCommand): FundSettingsCommitResult {
    const candidate = createCandidate(command, effectiveSettings)
    if (!candidate.ok) return candidate
    if (!candidate.changed) {
      return { ok: true, settings: getSettings() }
    }

    let validated: FundSettings
    try {
      validated = cloneSettings(candidate.settings)
    } catch {
      return { ok: false, reason: 'invalid-settings' }
    }

    try {
      writer(validated)
    } catch {
      return { ok: false, reason: 'persistence-failed' }
    }

    effectiveSettings = validated
    persistedSettings = cloneSettings(validated)
    return {
      effect: candidate.effect,
      ok: true,
      settings: getSettings(),
    }
  }

  function syncObservedNames(names: Readonly<Record<string, string>>): FundSettingsNameSyncResult {
    const observedNames = new Map<string, string>()
    for (const setting of effectiveSettings.funds) {
      const observedName = names[setting.code]
      if (typeof observedName !== 'string') continue
      const normalizedName = observedName.trim()
      if (normalizedName.length > 0) observedNames.set(setting.code, normalizedName)
    }

    if (observedNames.size === 0) return { ok: true }

    const nextFunds = effectiveSettings.funds.map((setting) => {
      const observedName = observedNames.get(setting.code)
      return observedName === undefined ? setting : { ...setting, name: observedName }
    })
    const candidate = cloneSettings({ ...effectiveSettings, funds: nextFunds })
    const needsPersistence = [...observedNames].some(([code, name]) => {
      const persisted = persistedSettings.funds.find((setting) => setting.code === code)
      return persisted?.name !== name
    })

    effectiveSettings = candidate
    if (!needsPersistence) return { ok: true }

    try {
      writer(candidate)
    } catch {
      return { ok: false, reason: 'persistence-failed' }
    }

    persistedSettings = cloneSettings(candidate)
    return { ok: true }
  }

  return { commit, getSettings, syncObservedNames }
}

function createCandidate(
  command: FundSettingsCommand,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  switch (command.kind) {
    case 'add-funds':
      return createAddCandidate(command.additions, current)
    case 'delete-fund':
      return createDeleteCandidate(command.code, current)
    case 'replace-groups':
      return {
        changed: true,
        ok: true,
        settings: { ...current, groups: command.groups },
      }
    case 'replace-fund-organization':
      return createOrganizationCandidate(command, current)
    case 'replace-holding-projection':
      return createHoldingCandidate(command.holding, current)
    case 'update-holding-metadata':
      return createHoldingMetadataCandidate(command, current)
    case 'update-fund-holding':
      return createHoldingCandidate(command.holding, current)
    case 'update-fund-group-membership':
      return createMembershipCandidate(command.code, command.selectedGroupIds, current)
    case 'replace-settings':
      return createReplaceCandidate(command.settings, current)
  }
}

function createReplaceCandidate(
  settings: FundSettings,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  let validated: FundSettings
  try {
    validated = cloneSettings(settings)
  } catch {
    return { ok: false, reason: 'invalid-settings' }
  }

  const changed = JSON.stringify(validated) !== JSON.stringify(current)
  return {
    changed,
    effect: changed ? { funds: validated.funds, kind: 'settings-replaced' } : undefined,
    ok: true,
    settings: validated,
  }
}

function createAddCandidate(
  additions: readonly FundAddition[],
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  if (additions.length === 0) return { ok: false, reason: 'no-additions' }

  const existingCodes = new Set(current.funds.map(({ code }) => code))
  const batchCodes = new Set<string>()
  const normalizedAdditions: Array<FundAddition & { readonly name: string }> = []
  for (const addition of additions) {
    const name = addition.name.trim()
    if (
      !/^\d{6}$/.test(addition.code) ||
      name.length === 0 ||
      existingCodes.has(addition.code) ||
      batchCodes.has(addition.code) ||
      (addition.holding !== undefined && addition.holding.code !== addition.code)
    ) {
      return { ok: false, reason: 'invalid-additions' }
    }
    batchCodes.add(addition.code)
    normalizedAdditions.push({ ...addition, name })
  }

  const nextHoldings = { ...current.holdingsByCode }
  for (const addition of normalizedAdditions) {
    if (addition.holding) {
      const normalizedHolding = normalizeHolding(addition.holding)
      if (normalizedHolding === null) return { ok: false, reason: 'invalid-additions' }
      nextHoldings[addition.code] = normalizedHolding
    }
  }

  return {
    changed: true,
    effect: {
      funds: normalizedAdditions.map(({ code, name }) => ({ code, name })),
      kind: 'funds-added',
    },
    ok: true,
    settings: {
      funds: [...current.funds, ...normalizedAdditions.map(({ code, name }) => ({ code, name }))],
      groups: current.groups,
      holdingOrder: [
        ...current.holdingOrder,
        ...normalizedAdditions.flatMap((addition) => (addition.holding ? [addition.code] : [])),
      ],
      holdingsByCode: nextHoldings,
    },
  }
}

function createDeleteCandidate(code: string, current: FundSettings): CandidateResult {
  if (!current.funds.some((fund) => fund.code === code)) {
    return { changed: false, ok: true, settings: current }
  }

  const nextHoldings = { ...current.holdingsByCode }
  delete nextHoldings[code]
  return {
    changed: true,
    effect: { code, kind: 'fund-deleted' },
    ok: true,
    settings: {
      funds: current.funds.filter((fund) => fund.code !== code),
      groups: current.groups.map((group) => ({
        ...group,
        fundCodes: group.fundCodes.filter((fundCode) => fundCode !== code),
      })),
      holdingOrder: current.holdingOrder.filter((fundCode) => fundCode !== code),
      holdingsByCode: nextHoldings,
    },
  }
}

function createOrganizationCandidate(
  command: Extract<FundSettingsCommand, { readonly kind: 'replace-fund-organization' }>,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  const currentFundCodes = current.funds.map(({ code }) => code)
  if (
    !haveSameItems(command.fundOrder, currentFundCodes) ||
    !haveSameItems(command.holdingOrder, Object.keys(current.holdingsByCode))
  ) {
    return { ok: false, reason: 'fund-data-changed' }
  }

  return {
    changed: true,
    ok: true,
    settings: {
      funds: command.fundOrder.map((code) => current.funds.find((fund) => fund.code === code)!),
      groups: command.groups.map((group) => ({ ...group, fundCodes: [...group.fundCodes] })),
      holdingOrder: [...command.holdingOrder],
      holdingsByCode: current.holdingsByCode,
    },
  }
}

function createHoldingCandidate(
  holding: FundHolding,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  if (!current.funds.some((fund) => fund.code === holding.code)) {
    return { ok: false, reason: 'unknown-fund' }
  }
  const normalizedHolding = normalizeHolding(holding)
  if (normalizedHolding === null) return { ok: false, reason: 'invalid-settings' }

  return {
    changed: true,
    ok: true,
    settings: {
      ...current,
      holdingOrder: current.holdingsByCode[holding.code]
        ? current.holdingOrder
        : [...current.holdingOrder, holding.code],
      holdingsByCode: { ...current.holdingsByCode, [holding.code]: normalizedHolding },
    },
  }
}

function createHoldingMetadataCandidate(
  command: Extract<FundSettingsCommand, { readonly kind: 'update-holding-metadata' }>,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  if (!current.funds.some((fund) => fund.code === command.code)) {
    return { ok: false, reason: 'unknown-fund' }
  }
  const existing = current.holdingsByCode[command.code]
  const normalizedHolding = createFundHolding({
    code: command.code,
    dividendMode: command.dividendMode,
    purchaseDate: command.purchaseDate,
    totalCostCents: existing === undefined ? 0 : (holdingTotalCostCents(existing) ?? 0),
    units: existing?.units ?? 0,
  })
  return {
    changed: true,
    ok: true,
    settings: {
      ...current,
      holdingOrder: existing ? current.holdingOrder : [...current.holdingOrder, command.code],
      holdingsByCode: { ...current.holdingsByCode, [command.code]: normalizedHolding },
    },
  }
}

function createMembershipCandidate(
  code: string,
  selectedGroupIds: ReadonlySet<string>,
  current: FundSettings,
): CandidateResult | { readonly ok: false; readonly reason: FundSettingsCommandFailure } {
  if (!current.funds.some((fund) => fund.code === code)) {
    return { ok: false, reason: 'unknown-fund' }
  }
  const knownGroupIds = new Set(current.groups.map(({ id }) => id))
  if ([...selectedGroupIds].some((id) => !knownGroupIds.has(id))) {
    return { ok: false, reason: 'unknown-group' }
  }

  return {
    changed: true,
    ok: true,
    settings: {
      ...current,
      groups: current.groups.map((group) => {
        const containsFund = group.fundCodes.includes(code)
        if (selectedGroupIds.has(group.id)) {
          return containsFund ? group : { ...group, fundCodes: [...group.fundCodes, code] }
        }
        return containsFund
          ? { ...group, fundCodes: group.fundCodes.filter((fundCode) => fundCode !== code) }
          : group
      }),
    },
  }
}

function cloneSettings(settings: FundSettings): FundSettings {
  return validateAndCloneFundSettings(settings)
}

function normalizeHolding(holding: FundHolding): FundHolding | null {
  const totalCostCents = holdingTotalCostCents(holding)
  if (totalCostCents === null) return null
  return createFundHolding({
    code: holding.code,
    dividendMode: holding.dividendMode,
    purchaseDate: holding.purchaseDate,
    totalCostCents,
    units: holding.units,
  })
}

function haveSameItems(first: readonly string[], second: readonly string[]): boolean {
  return (
    first.length === second.length &&
    new Set(first).size === first.length &&
    first.every((item) => second.includes(item))
  )
}
