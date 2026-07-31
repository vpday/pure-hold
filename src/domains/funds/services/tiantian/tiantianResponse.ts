export interface TiantianResponse {
  readonly data: unknown
  readonly errorCode: 0
  readonly expansion?: unknown
  readonly firstError?: unknown
  readonly hasWrongToken?: unknown
  readonly jf?: unknown
  readonly success: true
  readonly totalCount?: unknown
}

export function isSuccessfulTiantianResponse(value: unknown): value is TiantianResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.hasOwn(value, 'data') &&
    'success' in value &&
    value.success === true &&
    'errorCode' in value &&
    value.errorCode === 0
  )
}
