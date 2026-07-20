import type { IndexDefinition } from '../../models/indexDefinition'

const eastmoneyQuoteUrl = 'https://push2.eastmoney.com/api/qt/ulist.np/get'

export function createEastmoneyQuoteRequestUrl(definitions: readonly IndexDefinition[]): URL {
  const requestUrl = new URL(eastmoneyQuoteUrl)
  requestUrl.search = new URLSearchParams({
    secids: definitions.map((definition) => definition.quoteCode).join(','),
    fields: 'f2,f3,f4,f12,f13,f14,f124',
    deviceid: crypto.randomUUID(),
    fltt: '2',
    invt: '2',
    plat: 'Web',
    product: 'EFund',
    version: '6.5.5',
    appVersion: '6.5.5',
  }).toString()
  return requestUrl
}
