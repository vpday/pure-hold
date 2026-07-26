export type GlobalRefreshObserver = () => Promise<void>

const observers = new Set<GlobalRefreshObserver>()

export function subscribeGlobalRefresh(observer: GlobalRefreshObserver): () => void {
  observers.add(observer)
  return () => {
    observers.delete(observer)
  }
}

export async function requestGlobalRefresh(): Promise<void> {
  const snapshot = [...observers]
  await Promise.allSettled(snapshot.map((observer) => Promise.resolve().then(observer)))
}
