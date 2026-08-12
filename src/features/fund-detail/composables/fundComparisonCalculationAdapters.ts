import type { FundHistoryRange } from '@/domains/funds/models/fundHistoryRange.ts'
import { defaultFundDrawdownRange } from '../config/fundDrawdownRangeOptions.ts'
import { defaultFundHistoryRange } from '../config/fundHistoryRangeOptions.ts'
import { defaultFundRollingExcessRange } from '../config/fundRollingExcessRangeOptions.ts'
import {
  calculateFundCumulativeExcessReturn,
  type FundCumulativeExcessReturnResult,
} from '../models/fundCumulativeExcessReturn.ts'
import {
  calculateFundDrawdownComparison,
  type FundDrawdownComparisonResult,
  type FundDrawdownRange,
} from '../models/fundDrawdownComparison.ts'
import {
  calculateFundRollingExcessReturn,
  type FundRollingExcessRange,
  type FundRollingExcessReturnResult,
} from '../models/fundRollingExcessReturn.ts'
import type { FundComparisonCalculationAdapter } from './useFundComparisonSession.ts'

export const cumulativeExcessReturnCalculation = {
  calculate: ({ benchmark, fund }, range) =>
    calculateFundCumulativeExcessReturn(fund, benchmark, range),
  defaultRange: defaultFundHistoryRange,
  initialLoadError: '累计超额加载失败，请稍后重试',
} satisfies FundComparisonCalculationAdapter<FundHistoryRange, FundCumulativeExcessReturnResult>

export const rollingExcessReturnCalculation = {
  calculate: ({ benchmark, fund }, range) =>
    calculateFundRollingExcessReturn(fund, benchmark, range),
  defaultRange: defaultFundRollingExcessRange,
  initialLoadError: '滚动超额加载失败，请稍后重试',
} satisfies FundComparisonCalculationAdapter<FundRollingExcessRange, FundRollingExcessReturnResult>

export const drawdownComparisonCalculation = {
  calculate: ({ benchmark, fund }, range) =>
    calculateFundDrawdownComparison(fund, benchmark, range),
  defaultRange: defaultFundDrawdownRange,
  initialLoadError: '回撤对比加载失败，请稍后重试',
} satisfies FundComparisonCalculationAdapter<FundDrawdownRange, FundDrawdownComparisonResult>
