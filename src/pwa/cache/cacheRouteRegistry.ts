export interface CacheRoute {
  readonly id: string
  matches(request: Request): boolean
  handle(request: Request): Promise<Response>
}

export type CacheRouteResolution =
  | { readonly handled: false }
  | { readonly handled: true; readonly route: CacheRoute }

export interface CacheRouteRegistry {
  resolve(request: Request): CacheRouteResolution
}

interface CacheRouteLogger {
  error(...data: unknown[]): void
}

export function createCacheRouteRegistry(
  routes: readonly CacheRoute[],
  logger: CacheRouteLogger = console,
): CacheRouteRegistry {
  function resolve(request: Request): CacheRouteResolution {
    const matches: CacheRoute[] = []
    for (const route of routes) {
      try {
        if (route.matches(request)) matches.push(route)
      } catch (error) {
        logger.error('Cache route matcher failed.', {
          error,
          method: request.method,
          routeId: route.id,
          url: request.url,
        })
        return { handled: false }
      }
    }

    if (matches.length === 1) {
      return { handled: true, route: matches[0]! }
    }
    if (matches.length > 1) {
      logger.error('Cache request matched multiple routes.', {
        method: request.method,
        routeIds: matches.map(({ id }) => id),
        url: request.url,
      })
    }
    return { handled: false }
  }

  return { resolve }
}
