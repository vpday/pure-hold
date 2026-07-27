const endpoint = 'https://fundts.eastmoney.com/search/s/fundinfobynohigh'

export function createEastmoneyFundSearchRequestUrl(query: string, pageIndex: number): URL {
  if (!Number.isInteger(pageIndex) || pageIndex < 1) {
    throw new RangeError('Fund search page index must start at 1')
  }

  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    deviceid: crypto.randomUUID(),
    key: query.trim(),
    orderType: '1',
    pageindex: String(pageIndex),
    pagesize: '20',
    plat: 'Web',
    product: 'EFund',
    version: '6.5.5',
  }).toString()
  return url
}
