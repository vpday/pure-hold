export interface VisibilityDocumentTestDouble {
  dispatch(): void
  restore(): void
  setHidden(hidden: boolean): void
}

export function installVisibilityDocument(initialHidden = false): VisibilityDocumentTestDouble {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  let hidden = initialHidden
  let listener: EventListener | undefined

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      get hidden(): boolean {
        return hidden
      },
      addEventListener(type: string, nextListener: EventListener): void {
        if (type === 'visibilitychange') listener = nextListener
      },
      removeEventListener(type: string, nextListener: EventListener): void {
        if (type === 'visibilitychange' && listener === nextListener) listener = undefined
      },
    },
  })

  let restored = false
  return {
    dispatch(): void {
      listener?.(new Event('visibilitychange'))
    },
    restore(): void {
      if (restored) return
      restored = true
      if (descriptor) Object.defineProperty(globalThis, 'document', descriptor)
      else Reflect.deleteProperty(globalThis, 'document')
    },
    setHidden(value: boolean): void {
      hidden = value
    },
  }
}

export interface IntervalTestDouble {
  readonly callbacks: readonly (() => void)[]
  readonly clearCount: number
  restore(): void
}

export function installIntervalTestDouble(): IntervalTestDouble {
  const originalSetInterval = globalThis.setInterval
  const originalClearInterval = globalThis.clearInterval
  const callbacks: (() => void)[] = []
  let clearCount = 0

  globalThis.setInterval = ((callback: Parameters<typeof setInterval>[0]) => {
    if (typeof callback !== 'function') throw new TypeError('Expected a function interval callback')
    callbacks.push(callback as unknown as () => void)
    return callbacks.length as unknown as ReturnType<typeof setInterval>
  }) as typeof setInterval
  globalThis.clearInterval = ((id: Parameters<typeof clearInterval>[0]) => {
    clearCount += 1
    void id
  }) as typeof clearInterval

  let restored = false
  return {
    get callbacks(): readonly (() => void)[] {
      return callbacks
    },
    get clearCount(): number {
      return clearCount
    },
    restore(): void {
      if (restored) return
      restored = true
      globalThis.setInterval = originalSetInterval
      globalThis.clearInterval = originalClearInterval
    },
  }
}
