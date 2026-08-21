import type { FundMarketData } from '../models/fundMarketData.ts'

export function createTestFundMarketData(code: string, name = `基金 ${code}`): FundMarketData {
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
