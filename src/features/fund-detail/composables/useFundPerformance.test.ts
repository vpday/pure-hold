import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  FundCumulativeReturns,
  FundPerformanceRange,
} from '@/domains/funds/models/fundCumulativeReturns.ts'
import type { FundBasicInfo } from '@/domains/funds/models/fundBasicInfo.ts'
import { useFundPerformance } from './useFundPerformance.ts'

test('initializes index funds with their own index and the default range', async () => {
  const calls: RequestArgs[] = []
  const performance = useFundPerformance(async (...args) => {
    calls.push(args)
    return result(args[0], args[1], args[2])
  })

  await performance.initialize('161725', basicInfo('161725', '399997', '中证白酒指数'))

  assert.equal(performance.selectedReferenceIndexCode.value, '399997')
  assert.equal(performance.referenceIndexOptions.value[0]?.name, '中证白酒指数')
  assert.equal(performance.selectedRange.value, 'y')
  assert.deepEqual(calls[0]?.slice(0, 3), ['161725', '399997', 'y'])
})

test('keeps old data while switching and caches every combination independently', async () => {
  const requests: PendingRequest[] = []
  const performance = useFundPerformance((fundCode, indexCode, range, signal) => {
    const pending = deferred<FundCumulativeReturns>()
    requests.push({ fundCode, indexCode, range, signal, pending })
    return pending.promise
  })

  const initial = performance.initialize('161725', basicInfo('161725'))
  requests[0]?.pending.resolve(result('161725', '000001', 'y'))
  await initial
  const original = performance.data.value

  const switching = performance.selectRange('3y')
  assert.equal(performance.isLoading.value, true)
  assert.equal(performance.data.value, original)
  requests[1]?.pending.resolve(result('161725', '000001', '3y'))
  await switching

  await performance.selectRange('y')
  assert.equal(requests.length, 2)
  assert.equal(performance.data.value?.range, 'y')

  performance.close()
  const anotherFund = performance.initialize('000001', basicInfo('000001'))
  requests[2]?.pending.resolve(result('000001', '000001', 'y'))
  await anotherFund
  assert.equal(requests.length, 3)
})

test('aborts obsolete requests and ignores their late responses', async () => {
  const requests: PendingRequest[] = []
  const performance = useFundPerformance((fundCode, indexCode, range, signal) => {
    const pending = deferred<FundCumulativeReturns>()
    requests.push({ fundCode, indexCode, range, signal, pending })
    return pending.promise
  })

  const initial = performance.initialize('161725', basicInfo('161725'))
  const switched = performance.selectReferenceIndex('399001')
  assert.equal(requests[0]?.signal?.aborted, true)
  requests[0]?.pending.resolve(result('161725', '000001', 'y'))
  requests[1]?.pending.resolve(result('161725', '399001', 'y'))
  await Promise.all([initial, switched])
  assert.equal(performance.data.value?.referenceIndexCode, '399001')

  const rangeRequest = performance.selectRange('ln')
  performance.close()
  assert.equal(requests[2]?.signal?.aborted, true)
  requests[2]?.pending.resolve(result('161725', '399001', 'ln'))
  await rangeRequest
  assert.equal(performance.data.value, undefined)
})

test('silences aborts, retains successful data on failure and retries', async () => {
  let attempt = 0
  const performance = useFundPerformance(async (fundCode, indexCode, range) => {
    attempt += 1
    if (attempt === 2) throw new DOMException('aborted', 'AbortError')
    if (attempt === 3) throw new Error('third-party details')
    return result(fundCode, indexCode, range)
  })

  await performance.initialize('161725', basicInfo('161725'))
  const original = performance.data.value
  await performance.selectRange('3y')
  assert.equal(performance.error.value, '')
  assert.equal(performance.data.value, original)
  await performance.retry()
  assert.equal(performance.error.value, '累计收益加载失败，请稍后重试')
  assert.equal(performance.data.value, original)
  await performance.retry()
  assert.equal(performance.error.value, '')
  assert.equal(performance.data.value?.range, '3y')
})

test('global refresh clears cached combinations and reloads only an active session', async () => {
  const calls: RequestArgs[] = []
  const performance = useFundPerformance(async (...args) => {
    calls.push(args)
    return result(args[0], args[1], args[2])
  })

  await performance.initialize('161725', basicInfo('161725'))
  await performance.selectRange('3y')
  await performance.selectRange('y')
  assert.equal(calls.length, 2)
  await performance.refresh()
  assert.equal(calls.length, 3)
  performance.close()
  await performance.refresh()
  assert.equal(calls.length, 3)
})

type RequestArgs = [
  fundCode: string,
  indexCode: string,
  range: FundPerformanceRange,
  signal?: AbortSignal,
]

interface PendingRequest {
  readonly fundCode: string
  readonly indexCode: string
  readonly range: FundPerformanceRange
  readonly signal?: AbortSignal
  readonly pending: Deferred<FundCumulativeReturns>
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly resolve: (value: T) => void
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

function result(
  fundCode: string,
  referenceIndexCode: string,
  range: FundPerformanceRange,
): FundCumulativeReturns {
  return {
    fundCode,
    maximumDrawdownPercent: 10,
    referenceIndexCode,
    range,
    points: [
      {
        date: '2026-07-29',
        fundTypeYieldPercent: 1,
        fundYieldPercent: 2,
        referenceIndexYieldPercent: 3,
      },
    ],
  }
}

function basicInfo(
  code: string,
  trackingIndexCode: string | null = null,
  trackingIndexName: string | null = null,
): FundBasicInfo {
  return {
    code,
    companyName: null,
    custodyFeePercent: null,
    dailyPurchaseLimitYuan: null,
    establishedDate: null,
    fundType: null,
    managementFeePercent: null,
    minimumPurchaseAmountYuan: null,
    morningstarRating: null,
    netAssetsDate: null,
    netAssetsYuan: null,
    purchaseConfirmationDays: null,
    purchaseFeePercent: null,
    purchaseStatus: null,
    redemptionConfirmationDays: null,
    redemptionFundsArrivalDays: null,
    redemptionStatus: null,
    riskLevel: null,
    salesServiceFeePercent: null,
    shanghaiRating: null,
    standardPurchaseFeePercent: null,
    trackingError: null,
    trackingIndexCode,
    trackingIndexName,
  }
}
