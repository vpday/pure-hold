import assert from 'node:assert/strict'
import test from 'node:test'
import { effectScope, nextTick, ref } from 'vue'

import type { IndexGroupDefinition } from '@/domains/indices/models/indexGroupDefinition'
import { useIndexSettingsSession } from './useIndexSettingsSession'

test('opens a cloned draft and owns selection and mobile navigation', () => {
  const store = createStore()
  const isDesktop = ref(false)
  const scope = effectScope()
  const session = scope.run(() => useIndexSettingsSession(store, isDesktop))!

  assert.equal(session.model.value.selectedGroupId, 'group-a')
  assert.equal(session.model.value.shell.isDirty, false)
  session.selectGroup('group-b')
  assert.equal(session.model.value.shell.mobileView, 'detail')

  assert.equal(session.addGroup(' 新分组 '), null)
  assert.equal(session.model.value.selectedGroup?.name, '新分组')
  assert.equal(session.addGroup('新分组'), '分组名称不能重复')
  assert.equal(session.renameGroup('missing', '名称'), '分组不存在')
  assert.equal(session.renameGroup(session.model.value.selectedGroupId!, ' 分组三 '), null)
  assert.equal(session.model.value.selectedGroup?.name, '分组三')

  store.groups = store.groups.map((group, index) =>
    index === 0 ? { ...group, name: '外部修改' } : group,
  )
  assert.equal(session.model.value.groups[0]?.name, '分组一')
  scope.stop()
})

test('maintains group invariants and applies index commands to the selected group', () => {
  const store = createStore()
  const scope = effectScope()
  const session = scope.run(() => useIndexSettingsSession(store, true))!

  session.selectGroup('group-a')
  session.addIndex('index-2')
  session.addIndex('index-2')
  assert.deepEqual(session.model.value.selectedGroup?.quoteCodes, ['index-1', 'index-2'])
  session.reorderIndices(1, 0)
  session.removeIndex('index-1')
  assert.deepEqual(session.model.value.selectedGroup?.quoteCodes, ['index-2'])

  session.reorderGroups(0, 1)
  assert.deepEqual(
    session.model.value.groups.map(({ id }) => id),
    ['group-b', 'group-a'],
  )
  assert.equal(session.removeGroup('group-a'), null)
  assert.equal(session.model.value.selectedGroupId, 'group-b')
  assert.equal(session.removeGroup('group-b'), '至少保留一个分组')
  assert.equal(session.model.value.shell.isDirty, true)

  session.reset()
  assert.equal(session.model.value.shell.isDirty, false)
  assert.deepEqual(
    session.model.value.groups.map(({ id }) => id),
    ['group-a', 'group-b'],
  )
  scope.stop()
})

test('commits through one store command and keeps a failed draft dirty', () => {
  const store = createStore()
  const scope = effectScope()
  const session = scope.run(() => useIndexSettingsSession(store, true))!

  assert.equal(session.commit(), null)
  assert.deepEqual(store.calls, [])

  assert.equal(session.renameGroup('group-a', '已保存'), null)
  assert.equal(session.commit(), null)
  assert.deepEqual(store.calls, ['commit'])
  assert.equal(store.groups[0]?.name, '已保存')
  assert.equal(session.model.value.shell.isDirty, false)

  store.failSave = true
  assert.equal(session.renameGroup('group-a', '未保存'), null)
  assert.equal(session.commit(), '保存设置失败，请检查浏览器存储空间后重试')
  assert.deepEqual(store.calls, ['commit', 'commit'])
  assert.equal(store.groups[0]?.name, '已保存')
  assert.equal(session.model.value.shell.isDirty, true)
  scope.stop()
})

test('returns to the group list when switching to mobile', async () => {
  const store = createStore()
  const isDesktop = ref(false)
  const scope = effectScope()
  const session = scope.run(() => useIndexSettingsSession(store, isDesktop))!

  session.selectGroup('group-b')
  assert.equal(session.model.value.shell.mobileView, 'detail')
  isDesktop.value = true
  await nextTick()
  isDesktop.value = false
  await nextTick()
  assert.equal(session.model.value.shell.mobileView, 'groups')
  scope.stop()
})

function createStore() {
  const calls: string[] = []
  return {
    calls,
    failSave: false,
    groups: cloneGroups([
      { id: 'group-a', name: '分组一', quoteCodes: ['index-1'] },
      { id: 'group-b', name: '分组二', quoteCodes: [] },
    ]),
    commitGroups(groups: readonly IndexGroupDefinition[]) {
      calls.push('commit')
      if (this.failSave) {
        return {
          error: new Error('storage failed'),
          ok: false as const,
          reason: 'persistence-failed' as const,
        }
      }
      const committedGroups = cloneGroups(groups)
      this.groups = committedGroups
      return { groups: committedGroups, ok: true as const }
    },
  }
}

function cloneGroups(groups: readonly IndexGroupDefinition[]): IndexGroupDefinition[] {
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    quoteCodes: [...group.quoteCodes],
  }))
}
