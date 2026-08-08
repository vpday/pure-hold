export const tiantianDeviceIdStorageKey = 'pure-hold:tiantian-device-id'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let currentDeviceId: string | undefined

export function initializeTiantianDeviceId(): string {
  if (currentDeviceId) {
    return currentDeviceId
  }

  let storedDeviceId: string | null = null
  try {
    if (typeof localStorage !== 'undefined') {
      storedDeviceId = localStorage.getItem(tiantianDeviceIdStorageKey)
    }
  } catch {
    storedDeviceId = null
  }

  if (storedDeviceId && uuidPattern.test(storedDeviceId)) {
    currentDeviceId = storedDeviceId
    return storedDeviceId
  }

  currentDeviceId = crypto.randomUUID()
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(tiantianDeviceIdStorageKey, currentDeviceId)
    }
  } catch {
    // Keep the generated id in memory for the remainder of this page session.
  }
  return currentDeviceId
}

export function getTiantianDeviceId(): string {
  return initializeTiantianDeviceId()
}

export function resetTiantianDeviceIdForTests(): void {
  currentDeviceId = undefined
}
