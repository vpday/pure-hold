import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const registrySource = await readFile(
  new URL('./fundPerformancePanelRendererRegistry.ts', import.meta.url),
  'utf8',
)
const hostSource = await readFile(
  new URL('../FundPerformancePanelHost.vue', import.meta.url),
  'utf8',
)

test('registers one synchronous renderer for every performance panel', () => {
  const registryBody = registrySource.match(
    /fundPerformancePanelRendererRegistry = \{(?<body>[\s\S]*?)\} satisfies/,
  )?.groups?.body
  assert.ok(registryBody)
  const ids = [...registryBody.matchAll(/^  (?:'([^']+)'|([a-z-]+)):/gm)].map(
    ([, quoted, plain]) => quoted ?? plain,
  )

  assert.deepEqual(ids.sort(), [
    'cumulative-excess-return',
    'cumulative-returns',
    'distribution',
    'drawdown-comparison',
    'net-value',
    'reinvested-net-value',
    'rolling-excess-return',
  ])
  assert.doesNotMatch(registrySource, /defineAsyncComponent|string component/)
})

test('keeps the host as a branch-free dynamic renderer adapter', () => {
  assert.match(hostSource, /<component/)
  assert.match(hostSource, /resolveFundPerformancePanelRenderer/)
  assert.doesNotMatch(hostSource, /v-if|v-else-if/)
})
