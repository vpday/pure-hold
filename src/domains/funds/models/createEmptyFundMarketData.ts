import type { FundMarketData } from './fundMarketData.ts'

export function createEmptyFundMarketData(code: string, name: string): FundMarketData {
  return {
    code,
    dailyChangePercent: null,
    estimatedAt: null,
    estimatedChangePercent: null,
    estimatedNav: null,
    fetchedAt: null,
    name,
    nav: null,
    navDate: null,
    returns: {
      fiveYears: null,
      oneMonth: null,
      oneWeek: null,
      oneYear: null,
      sinceInception: null,
      sixMonths: null,
      threeMonths: null,
      threeYears: null,
      twoYears: null,
      yearToDate: null,
    },
    returnsDate: null,
    tags: [],
  }
}
