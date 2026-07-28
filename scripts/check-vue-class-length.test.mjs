import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { findStaticClassViolations } from './check-vue-class-length.mjs'

test('reports long static template classes with their source location', () => {
  const source = `<template>
  <div
    class="one two
      three four five six"
  />
</template>
`

  assert.deepEqual(findStaticClassViolations(source), [
    {
      column: 5,
      length: 27,
      line: 3,
      tokens: 6,
      value: 'one two three four five six',
    },
  ])
})

test('ignores dynamic classes, comments and class text outside the template', () => {
  const source = `<script setup>
const example = 'class="one two three four five six"'
</script>
<template>
  <!-- class="one two three four five six" -->
  <div :class="'one two three four five six'" />
  <div class="one two three four five" />
</template>
<style>
.example[class="one two three four five six"] {}
</style>
`

  assert.deepEqual(findStaticClassViolations(source), [])
})

test('reports a static class that exceeds only the character limit', () => {
  const value = `utility-${'x'.repeat(72)}`
  const source = `<template><div class="${value}" /></template>`

  assert.deepEqual(findStaticClassViolations(source), [
    {
      column: 16,
      length: 80,
      line: 1,
      tokens: 1,
      value,
    },
  ])
})

test('command exits with an error for a violating Vue file', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'pure-hold-class-lint-'))
  const fixture = path.join(directory, 'fixture.vue')
  await writeFile(
    fixture,
    '<template><div class="one two three four five six" /></template>',
    'utf8',
  )

  try {
    const result = spawnSync(process.execPath, ['scripts/check-vue-class-length.mjs', fixture], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })

    assert.equal(result.status, 1)
    assert.match(result.stderr, /fixture\.vue:1:16 Static class has 6 tokens/)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
})
