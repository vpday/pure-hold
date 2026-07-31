export function createTiantianRequestParams(
  endpointParams: Readonly<Record<string, string>>,
): URLSearchParams {
  const params = new URLSearchParams(endpointParams)
  params.set('deviceid', crypto.randomUUID())
  params.set('plat', 'Web')
  params.set('product', 'EFund')
  params.set('version', '6.5.5')
  return params
}
