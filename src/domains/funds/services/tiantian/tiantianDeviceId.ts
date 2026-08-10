import { browserStorageAdapter } from '@/shared/persistence/browserStorageAdapter.ts'

export const tiantianDeviceIdStorageKey = 'pure-hold:tiantian-device-id'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let currentDeviceId: string | undefined

export function initializeTiantianDeviceId(): string {
  if (currentDeviceId) {
    return currentDeviceId
  }

  const result = browserStorageAdapter.read(tiantianDeviceIdStorageKey)
  const storedDeviceId = result.status === 'found' ? result.value : undefined

  if (storedDeviceId && uuidPattern.test(storedDeviceId)) {
    currentDeviceId = storedDeviceId
    return storedDeviceId
  }

  currentDeviceId = crypto.randomUUID()
  browserStorageAdapter.write(tiantianDeviceIdStorageKey, currentDeviceId)
  return currentDeviceId
}

export function getTiantianDeviceId(): string {
  return initializeTiantianDeviceId()
}

export function resetTiantianDeviceIdForTests(): void {
  currentDeviceId = undefined
}
