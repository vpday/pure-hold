import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

const sectionSource = await readFile(new URL('./FundListSection.vue', import.meta.url), 'utf8')
const desktopSource = await readFile(
  new URL('./components/FundDesktopTable.vue', import.meta.url),
  'utf8',
)

test('feeds the same session-owned rows to desktop and mobile views', () => {
  assert.equal(sectionSource.match(/:rows="model\.rows"/g)?.length, 2)
  assert.doesNotMatch(sectionSource, /baseRows|sortFundRows|sortByCategory/)
})

test('keeps the desktop table as a controlled sort intent adapter', () => {
  assert.match(desktopSource, /:data="rows"/)
  assert.match(desktopSource, /sorter: true/)
  assert.doesNotMatch(desktopSource, /tableRows|data-change|sortFundRows|moveMissingFundRowsLast/)
})
