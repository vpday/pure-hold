import assert from 'node:assert/strict'
import test from 'node:test'

import type { FundBasicInfo } from '../../../domains/funds/models/fundBasicInfo.ts'
import { useFundDetail } from './useFundDetail.ts'

test('loads once, caches successful results and forces retry', async () => {
  const calls: string[] = []
  const detail = useFundDetail(async (code) => {
    calls.push(code)
    return createBasicInfo(code)
  })

  await detail.open('161725')
  assert.equal(detail.basicInfo.value?.code, '161725')
  await detail.open('161725')
  assert.deepEqual(calls, ['161725'])
  await detail.retry()
  assert.deepEqual(calls, ['161725', '161725'])
})

test('global refresh clears the whole cache and reloads only when open', async () => {
  const calls: string[] = []
  const detail = useFundDetail(async (code) => {
    calls.push(code)
    return createBasicInfo(code)
  })

  await detail.open('161725')
  detail.close()
  await detail.open('000001')
  detail.close()
  await detail.refresh()
  await detail.open('161725')
  assert.deepEqual(calls, ['161725', '000001', '161725'])
  await detail.refresh()
  assert.deepEqual(calls, ['161725', '000001', '161725', '161725'])
})

test('closing and rapid switching abort old requests and ignore late responses', async () => {
  const requests: PendingRequest[] = []
  const detail = useFundDetail((code, signal) => {
    const pending = deferred<FundBasicInfo>()
    requests.push({ code, pending, signal })
    return pending.promise
  })

  const firstOpen = detail.open('161725')
  assert.equal(requests[0]?.signal?.aborted, false)
  const secondOpen = detail.open('000001')
  assert.equal(requests[0]?.signal?.aborted, true)
  requests[0]?.pending.resolve(createBasicInfo('161725'))
  requests[1]?.pending.resolve(createBasicInfo('000001'))
  await Promise.all([firstOpen, secondOpen])
  assert.equal(detail.basicInfo.value?.code, '000001')

  const thirdOpen = detail.open('000002')
  detail.close()
  assert.equal(requests[2]?.signal?.aborted, true)
  requests[2]?.pending.resolve(createBasicInfo('000002'))
  await thirdOpen
  assert.equal(detail.basicInfo.value, undefined)
})

test('silences AbortError and exposes a stable retryable failure', async () => {
  let attempt = 0
  const detail = useFundDetail(async (code) => {
    attempt += 1
    if (attempt === 1) throw new DOMException('aborted', 'AbortError')
    if (attempt === 2) throw new Error('third-party details')
    return createBasicInfo(code)
  })

  await detail.open('161725')
  assert.equal(detail.error.value, '')
  await detail.retry()
  assert.equal(detail.error.value, '基金基础信息加载失败，请稍后重试')
  await detail.retry()
  assert.equal(detail.error.value, '')
  assert.equal(detail.basicInfo.value?.code, '161725')
})

interface PendingRequest {
  readonly code: string
  readonly pending: Deferred<FundBasicInfo>
  readonly signal?: AbortSignal
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

function createBasicInfo(code: string): FundBasicInfo {
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
    netAssetsYuan: null,
    netAssetsDate: null,
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
    trackingIndexCode: null,
    trackingIndexName: null,
  }
}
