import { computed, getCurrentScope, onScopeDispose, ref, shallowRef } from 'vue'

import { calculateFundReinvestedNav } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundReinvestedNavPoint } from '@/domains/funds/models/fundReinvestedNav.ts'
import type { FundRiskAssumptions } from '@/domains/funds/models/fundRiskMetrics.ts'
import type { IndexPerformanceHistory } from '@/domains/indices/models/indexPerformanceHistory.ts'
import type { FundMetricsView } from '../models/fundMetricsSectionModel.ts'
import {
  calculateFundMetricsComparison,
  calculateFundRiskMetricsComparison,
  type FundMetricsComparison,
  type FundRiskMetricsComparison,
} from '../models/fundMetricsComparison.ts'
import { toFundMetricsSectionModel } from '../presenters/toFundMetricsSectionModel.ts'
import type { FundMetricsQualitySource } from '../presenters/toFundMetricsSectionModel.ts'
import type { FundBenchmarkDataSource } from './useFundBenchmarkDataSource.ts'
import type { FundHistoryDataSource } from './useFundHistoryDataSource.ts'

export type FundMetricsRequestResult = 'failed' | 'showing-stale-data' | 'unchanged' | 'updated'

interface BenchmarkLoadFailure {
  readonly cause: unknown
  readonly source: 'benchmark'
}

interface SuccessfulRiskInputs {
  readonly benchmark: IndexPerformanceHistory
  readonly commonCutoffDate: string
  readonly fundPoints: readonly FundReinvestedNavPoint[]
}

const defaultRiskFreeRatePercent = 1.15
const defaultTargetRatePercent = 4

export function useFundMetrics(
  dataSource: FundHistoryDataSource,
  benchmarkDataSource: FundBenchmarkDataSource,
) {
  const activeView = ref<FundMetricsView>('periods')
  const currentFundCode = ref<string>()
  const data = shallowRef<FundMetricsComparison>()
  const error = ref('')
  const isActivated = ref(false)
  const isLoading = ref(false)
  const quality = shallowRef<FundMetricsQualitySource>(emptyQuality())
  const riskData = shallowRef<FundRiskMetricsComparison>()
  const riskFreeRateDraft = ref<number | null>(defaultRiskFreeRatePercent)
  const riskParameterError = ref('')
  const targetRateDraft = ref<number | null>(defaultTargetRatePercent)
  const model = computed(() =>
    data.value
      ? toFundMetricsSectionModel(data.value, {
          quality: quality.value,
          riskComparison: riskData.value,
          riskParameters: {
            parameterError: riskParameterError.value,
            riskFreeRatePercent: riskFreeRateDraft.value,
            targetRatePercent: targetRateDraft.value,
          },
        })
      : undefined,
  )
  let appliedAssumptions: FundRiskAssumptions = {
    riskFreeAnnualRate: defaultRiskFreeRatePercent / 100,
    targetAnnualRate: defaultTargetRatePercent / 100,
  }
  let lastSuccessfulRiskInputs: SuccessfulRiskInputs | undefined
  let requestGeneration = 0
  let activeRequest:
    | {
        readonly controller: AbortController
        readonly generation: number
        readonly promise: Promise<FundMetricsRequestResult>
      }
    | undefined

  function open(fundCode: string): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = fundCode
    activeView.value = 'periods'
    data.value = undefined
    error.value = ''
    isActivated.value = false
    isLoading.value = false
    lastSuccessfulRiskInputs = undefined
    quality.value = emptyQuality()
    riskData.value = undefined
  }

  async function activate(): Promise<FundMetricsRequestResult> {
    if (isActivated.value) return 'unchanged'
    isActivated.value = true
    return await request(false)
  }

  async function retry(): Promise<FundMetricsRequestResult> {
    if (!isActivated.value) return 'unchanged'
    return await request(true)
  }

  async function refresh(): Promise<FundMetricsRequestResult> {
    if (!isActivated.value) return 'unchanged'
    return await request(true)
  }

  function selectView(view: FundMetricsView): void {
    activeView.value = view
  }

  function updateRiskFreeRateDraft(value: number | null): void {
    riskFreeRateDraft.value = value
    riskParameterError.value = ''
  }

  function updateTargetRateDraft(value: number | null): void {
    targetRateDraft.value = value
    riskParameterError.value = ''
  }

  function applyRiskAssumptions(): void {
    const riskFreePercent = riskFreeRateDraft.value
    const targetPercent = targetRateDraft.value
    if (!isValidRatePercent(riskFreePercent) || !isValidRatePercent(targetPercent)) {
      riskParameterError.value = '请输入大于 -100% 的有效年化百分比'
      return
    }
    appliedAssumptions = {
      riskFreeAnnualRate: riskFreePercent / 100,
      targetAnnualRate: targetPercent / 100,
    }
    riskParameterError.value = ''
    if (lastSuccessfulRiskInputs) {
      riskData.value = calculateRisk(lastSuccessfulRiskInputs, appliedAssumptions)
    }
  }

  function close(): void {
    cancelActiveRequest()
    requestGeneration += 1
    currentFundCode.value = undefined
    activeView.value = 'periods'
    data.value = undefined
    error.value = ''
    isActivated.value = false
    isLoading.value = false
    lastSuccessfulRiskInputs = undefined
    quality.value = emptyQuality()
    riskData.value = undefined
  }

  async function request(force: boolean): Promise<FundMetricsRequestResult> {
    const fundCode = currentFundCode.value
    if (!fundCode) return 'unchanged'
    if (activeRequest) return await activeRequest.promise

    const controller = new AbortController()
    const generation = ++requestGeneration
    const promise = loadBatch(fundCode, force, controller.signal, generation)
    activeRequest = { controller, generation, promise }
    isLoading.value = true
    error.value = ''
    return await promise
  }

  async function loadBatch(
    fundCode: string,
    force: boolean,
    signal: AbortSignal,
    generation: number,
  ): Promise<FundMetricsRequestResult> {
    try {
      const [netValues, distribution, benchmark] = await Promise.all([
        dataSource.loadNetValueHistory(fundCode, 'ln', { force, signal }),
        dataSource.loadDistribution(fundCode, { force, signal }),
        benchmarkDataSource.load({ force, signal }).catch((cause: unknown) => {
          throw { cause, source: 'benchmark' } satisfies BenchmarkLoadFailure
        }),
      ])
      if (!isCurrent(fundCode, generation)) return 'unchanged'
      const reinvested = calculateFundReinvestedNav(netValues, distribution)
      const comparison = calculateFundMetricsComparison(reinvested.points, benchmark.points)
      const riskInputs: SuccessfulRiskInputs = {
        benchmark,
        commonCutoffDate: comparison.commonCutoffDate,
        fundPoints: reinvested.points,
      }
      const riskComparison = calculateRisk(riskInputs, appliedAssumptions)
      data.value = comparison
      riskData.value = riskComparison
      lastSuccessfulRiskInputs = riskInputs
      error.value = ''
      quality.value = {
        benchmarkIssues: benchmark.issues,
        isShowingStaleData: false,
        reinvestedIssues: reinvested.issues,
      }
      return 'updated'
    } catch (requestError) {
      if (isCurrent(fundCode, generation) && !isAbortError(requestError)) {
        if (force && data.value && isBenchmarkLoadFailure(requestError)) {
          quality.value = { ...quality.value, isShowingStaleData: true }
          return 'showing-stale-data'
        } else {
          error.value = '基金数据指标加载失败，请稍后重试'
          return 'failed'
        }
      }
      return 'unchanged'
    } finally {
      if (isCurrent(fundCode, generation)) {
        isLoading.value = false
        activeRequest = undefined
      }
    }
  }

  function isCurrent(fundCode: string, generation: number): boolean {
    return currentFundCode.value === fundCode && requestGeneration === generation
  }

  function cancelActiveRequest(): void {
    activeRequest?.controller.abort()
    activeRequest = undefined
  }

  if (getCurrentScope()) onScopeDispose(close)

  return {
    activate,
    activeView,
    applyRiskAssumptions,
    close,
    currentFundCode,
    data,
    error,
    isActivated,
    isLoading,
    model,
    open,
    refresh,
    retry,
    riskData,
    riskFreeRateDraft,
    riskParameterError,
    selectView,
    targetRateDraft,
    updateRiskFreeRateDraft,
    updateTargetRateDraft,
  }
}

function calculateRisk(
  inputs: SuccessfulRiskInputs,
  assumptions: FundRiskAssumptions,
): FundRiskMetricsComparison {
  return calculateFundRiskMetricsComparison(
    inputs.fundPoints,
    inputs.benchmark,
    inputs.commonCutoffDate,
    assumptions,
  )
}

function emptyQuality(): FundMetricsQualitySource {
  return { benchmarkIssues: [], isShowingStaleData: false, reinvestedIssues: [] }
}

function isValidRatePercent(value: number | null): value is number {
  return value !== null && Number.isFinite(value) && value > -100
}

function isBenchmarkLoadFailure(error: unknown): error is BenchmarkLoadFailure {
  return (
    typeof error === 'object' && error !== null && 'source' in error && error.source === 'benchmark'
  )
}

function isAbortError(error: unknown): boolean {
  if (isBenchmarkLoadFailure(error)) return isAbortError(error.cause)
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError')
  )
}
