import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const appSource = await readFile(new URL('../../App.vue', import.meta.url), 'utf8')

test('runs one startup projection rebuild after the initial stores are assembled', () => {
  const coordinatorIndex = appSource.indexOf(
    'const portfolioCoordinator = createPortfolioCoordinator',
  )
  const rebuildIndex = appSource.indexOf(
    'const startupRebuild = portfolioCoordinator.rebuildHoldingProjections',
  )
  const rebuildCalls = appSource.match(/portfolioCoordinator\.rebuildHoldingProjections\(/g) ?? []
  const refreshFunction = appSource.slice(
    appSource.indexOf('async function refreshAllData'),
    appSource.indexOf('</script>'),
  )

  assert.ok(coordinatorIndex >= 0)
  assert.ok(rebuildIndex > coordinatorIndex)
  assert.equal(rebuildCalls.length, 1)
  assert.doesNotMatch(refreshFunction, /rebuildHoldingProjections/)
  assert.match(appSource, /console\.warn\('启动账本持仓重建未完成。', startupRebuild\)/)
})
