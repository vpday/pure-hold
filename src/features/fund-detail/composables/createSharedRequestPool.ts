export interface SharedRequestPool<TKey, TValue> {
  abortPending(): void
  dispose(): void
  hasPending(key: TKey): boolean
  request(
    key: TKey,
    subscriberSignal: AbortSignal | undefined,
    start: (signal: AbortSignal) => Promise<TValue>,
  ): Promise<TValue>
}

interface PendingRequest<TValue> {
  readonly controller: AbortController
  readonly subscribers: Set<Subscriber<TValue>>
}

interface Subscriber<TValue> {
  readonly reject: (error: unknown) => void
  readonly resolve: (value: TValue) => void
  cleanup(): void
}

export function createSharedRequestPool<TKey, TValue>(): SharedRequestPool<TKey, TValue> {
  const pendingByKey = new Map<TKey, PendingRequest<TValue>>()
  let disposed = false

  function request(
    key: TKey,
    subscriberSignal: AbortSignal | undefined,
    start: (signal: AbortSignal) => Promise<TValue>,
  ): Promise<TValue> {
    if (disposed) return Promise.reject(new Error('shared request pool is disposed'))
    if (subscriberSignal?.aborted) return Promise.reject(createAbortError())

    const existing = pendingByKey.get(key)
    if (existing) return subscribe(key, existing, subscriberSignal)

    const pending: PendingRequest<TValue> = {
      controller: new AbortController(),
      subscribers: new Set(),
    }
    pendingByKey.set(key, pending)
    const subscriber = subscribe(key, pending, subscriberSignal)

    let operation: Promise<TValue>
    try {
      operation = start(pending.controller.signal)
    } catch (error) {
      settle(key, pending, { error, status: 'rejected' })
      return subscriber
    }
    void operation.then(
      (value) => settle(key, pending, { status: 'fulfilled', value }),
      (error: unknown) => settle(key, pending, { error, status: 'rejected' }),
    )
    return subscriber
  }

  function subscribe(
    key: TKey,
    pending: PendingRequest<TValue>,
    signal: AbortSignal | undefined,
  ): Promise<TValue> {
    return new Promise<TValue>((resolve, reject) => {
      const cancel = () => {
        subscriber.cleanup()
        reject(createAbortError())
        if (pending.subscribers.size === 0 && pendingByKey.get(key) === pending) {
          pendingByKey.delete(key)
          pending.controller.abort()
        }
      }
      const subscriber: Subscriber<TValue> = {
        cleanup() {
          signal?.removeEventListener('abort', cancel)
          pending.subscribers.delete(subscriber)
        },
        reject,
        resolve,
      }
      pending.subscribers.add(subscriber)
      signal?.addEventListener('abort', cancel, { once: true })
    })
  }

  function abortPending(): void {
    for (const [key, pending] of pendingByKey) abort(key, pending)
  }

  function settle(key: TKey, pending: PendingRequest<TValue>, result: SettledResult<TValue>): void {
    if (pendingByKey.get(key) !== pending) return
    pendingByKey.delete(key)
    for (const subscriber of pending.subscribers) {
      subscriber.cleanup()
      if (result.status === 'fulfilled') subscriber.resolve(result.value)
      else subscriber.reject(result.error)
    }
  }

  function abort(key: TKey, pending: PendingRequest<TValue>): void {
    if (pendingByKey.get(key) !== pending) return
    pendingByKey.delete(key)
    pending.controller.abort()
    for (const subscriber of pending.subscribers) {
      subscriber.cleanup()
      subscriber.reject(createAbortError())
    }
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    abortPending()
  }

  return {
    abortPending,
    dispose,
    hasPending: (key) => pendingByKey.has(key),
    request,
  }
}

type SettledResult<TValue> =
  | { readonly status: 'fulfilled'; readonly value: TValue }
  | { readonly error: unknown; readonly status: 'rejected' }

export function createAbortError(): DOMException {
  return new DOMException('The operation was aborted', 'AbortError')
}
