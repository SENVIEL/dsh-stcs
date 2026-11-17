import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'
import { platformGuardReason } from '../lib/v4/authorization.js'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('file-write tool aliases include the host write_file tool', () => {
  assert.match(source, /'write_file'/)
  assert.match(source, /'apply_patch'/)
})

test('a bare outside path mentioned in the prompt no longer counts as user permission', () => {
  const start = source.indexOf('function userAllowsOutside')
  const body = source.slice(start, source.indexOf('export function shellWriteLike', start))
  assert.doesNotMatch(body, /raw\.toLowerCase\(\)\.includes/)
  assert.match(body, /bare path appearing in the prompt is not permission/)
})

test('file guards carry the platform-side prefix', () => {
  const wrapped = (source.match(/platformGuardReason\('【文件落盘拦截】/g) || []).length
  assert.ok(wrapped >= 3, `expected all file-workdir denials wrapped, got ${wrapped}`)
  assert.ok(platformGuardReason('【文件落盘拦截】x').includes('平台管控'))
})
