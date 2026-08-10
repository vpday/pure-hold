export class MemoryStorage implements Storage {
  readonly values: Map<string, string>
  readError: unknown
  writeError: unknown

  constructor(entries: Iterable<readonly [string, string]> = []) {
    this.values = new Map(entries)
  }

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    if (this.readError !== undefined) {
      throw this.readError
    }

    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return this.keys()[index] ?? null
  }

  keys(): string[] {
    return [...this.values.keys()]
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    if (this.writeError !== undefined) {
      throw this.writeError
    }

    this.values.set(key, value)
  }
}

export function installLocalStorage(storage: Storage | undefined): () => void {
  return installLocalStorageDescriptor(storage ? { configurable: true, value: storage } : undefined)
}

export function installLocalStorageGetter(get: () => Storage | undefined): () => void {
  return installLocalStorageDescriptor({ configurable: true, get })
}

function installLocalStorageDescriptor(replacement: PropertyDescriptor | undefined): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  if (replacement) {
    Object.defineProperty(globalThis, 'localStorage', replacement)
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage')
  }

  let restored = false
  return () => {
    if (restored) {
      return
    }
    restored = true

    if (descriptor) {
      Object.defineProperty(globalThis, 'localStorage', descriptor)
    } else {
      Reflect.deleteProperty(globalThis, 'localStorage')
    }
  }
}
