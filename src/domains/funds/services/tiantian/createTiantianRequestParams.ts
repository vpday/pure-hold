import { getTiantianDeviceId } from './tiantianDeviceId.ts'

export function createTiantianRequestParams(
  endpointParams: Readonly<Record<string, string>>,
): URLSearchParams {
  const params = new URLSearchParams(endpointParams)
  params.set('deviceid', getTiantianDeviceId())
  params.set('plat', 'Web')
  params.set('product', 'EFund')
  params.set('version', '6.5.5')
  return params
}
