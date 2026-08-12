import assert from 'node:assert/strict'
import test from 'node:test'

import { createCacheRouteRegistry, type CacheRoute } from './cacheRouteRegistry.ts'

test('cache route registry leaves unmatched requests unhandled', () => {
  const registry = createCacheRouteRegistry([createRoute('route-a', false)])

  assert.deepEqual(registry.resolve(new Request('https://example.com/unmatched')), {
    handled: false,
  })
})

test('cache route registry resolves exactly one matching complete route', async () => {
  const calls: string[] = []
  const route = createRoute('route-a', true, calls)
  const registry = createCacheRouteRegistry([route, createRoute('route-b', false, calls)])
  const request = new Request('https://example.com/matched')

  const result = registry.resolve(request)

  assert.equal(result.handled, true)
  if (!result.handled) return
  assert.equal(result.route, route)
  assert.equal(await (await result.route.handle(request)).text(), 'route-a')
  assert.deepEqual(calls, ['route-a'])
})

test('cache route registry reports overlap and does not choose or invoke a route', () => {
  const calls: string[] = []
  const logs: unknown[][] = []
  const registry = createCacheRouteRegistry(
    [createRoute('route-a', true, calls), createRoute('route-b', true, calls)],
    { error: (...data) => logs.push(data) },
  )
  const request = new Request('https://example.com/overlap', { method: 'POST' })

  assert.deepEqual(registry.resolve(request), { handled: false })
  assert.deepEqual(calls, [])
  assert.equal(logs.length, 1)
  assert.equal(logs[0]?.[0], 'Cache request matched multiple routes.')
  assert.deepEqual(logs[0]?.[1], {
    method: 'POST',
    routeIds: ['route-a', 'route-b'],
    url: request.url,
  })
})

test('cache route registry reports matcher failures and leaves the request unhandled', () => {
  const error = new Error('broken matcher')
  const logs: unknown[][] = []
  const brokenRoute: CacheRoute = {
    handle: async () => new Response('broken'),
    id: 'broken-route',
    matches: () => {
      throw error
    },
  }
  const request = new Request('https://example.com/failure')
  const registry = createCacheRouteRegistry([brokenRoute, createRoute('route-a', true)], {
    error: (...data) => logs.push(data),
  })

  assert.deepEqual(registry.resolve(request), { handled: false })
  assert.equal(logs.length, 1)
  assert.equal(logs[0]?.[0], 'Cache route matcher failed.')
  assert.deepEqual(logs[0]?.[1], {
    error,
    method: 'GET',
    routeId: 'broken-route',
    url: request.url,
  })
})

function createRoute(id: string, matches: boolean, calls: string[] = []): CacheRoute {
  return {
    handle: async () => {
      calls.push(id)
      return new Response(id)
    },
    id,
    matches: () => matches,
  }
}
