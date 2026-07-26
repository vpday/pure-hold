import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { fundStateStorageKey } from '../../../domains/funds/services/persistence/fundStateSchemaVersion.ts'
import { useFundsStore } from '../../../domains/funds/stores/useFundsStore.ts'
import { useFundGroupDraft } from './useFundGroupDraft.ts'

test('fund group draft adds, renames, removes, reorders and commits an empty list', () => {
  withStorage(() => {
    setActivePinia(createPinia())
    const store = useFundsStore()
    const draft = useFundGroupDraft()

    assert.equal(draft.addGroup(' 成长 '), null)
    assert.equal(draft.groups.value[0]?.name, '成长')
    assert.equal(draft.groups.value[0]?.fundCodes.length, 0)
    assert.equal(draft.addGroup('成长'), '分组名称不能重复')
    assert.match(draft.addGroup('甲'.repeat(21)) ?? '', /20/)
    assert.equal(draft.addGroup('价值'), null)
    const firstId = draft.groups.value[0]!.id
    const secondId = draft.groups.value[1]!.id
    assert.equal(draft.renameGroup(firstId, '稳健'), null)
    draft.reorderGroups(0, 1)
    assert.deepEqual(
      draft.groups.value.map((group) => group.id),
      [secondId, firstId],
    )
    assert.equal(draft.removeGroup(secondId), null)
    assert.deepEqual(draft.commit(), {})
    assert.deepEqual(
      store.groups.map((group) => group.name),
      ['稳健'],
    )

    draft.reset()
    assert.equal(draft.removeGroup(firstId), null)
    assert.deepEqual(draft.commit(), {})
    assert.deepEqual(store.groups, [])
    store.$dispose()
  })
})

function withStorage(callback: () => void): void {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const storage = new MemoryStorage()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage })
  try {
    callback()
    assert.notEqual(storage.getItem(fundStateStorageKey), null)
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
}

class MemoryStorage implements Storage {
  readonly values = new Map<string, string>()
  get length(): number {
    return this.values.size
  }
  clear(): void {
    this.values.clear()
  }
  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }
  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }
  removeItem(key: string): void {
    this.values.delete(key)
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
