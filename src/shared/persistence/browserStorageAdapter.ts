export type StorageReadResult =
  | { readonly status: 'found'; readonly value: string }
  | { readonly status: 'missing' }
  | { readonly status: 'failed'; readonly error: unknown }

export type StorageWriteResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly error: unknown }

export interface BrowserStorageAdapter {
  read(key: string): StorageReadResult
  write(key: string, value: string): StorageWriteResult
  requestPersistence(): void
}

export function createBrowserStorageAdapter(
  getStorage: () => Storage | undefined,
  requestPersistence?: () => Promise<boolean>,
): BrowserStorageAdapter {
  return {
    read(key) {
      try {
        const storage = getStorage()
        if (!storage) {
          return { status: 'failed', error: new Error('localStorage is unavailable') }
        }

        const value = storage.getItem(key)
        return value === null ? { status: 'missing' } : { status: 'found', value }
      } catch (error) {
        return { status: 'failed', error }
      }
    },
    write(key, value) {
      try {
        const storage = getStorage()
        if (!storage) {
          return { ok: false, error: new Error('localStorage is unavailable') }
        }

        storage.setItem(key, value)
        return { ok: true }
      } catch (error) {
        return { ok: false, error }
      }
    },
    requestPersistence() {
      if (!requestPersistence) {
        return
      }

      try {
        void requestPersistence().catch(() => {})
      } catch {
        // Persistence permission is best effort and must not block application startup.
      }
    },
  }
}

export const browserStorageAdapter = createBrowserStorageAdapter(
  () => globalThis.localStorage,
  async () => {
    if (typeof navigator === 'undefined' || typeof navigator.storage?.persist !== 'function') {
      return false
    }

    return navigator.storage.persist()
  },
)
