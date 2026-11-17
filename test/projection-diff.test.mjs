import test from 'node:test'
import assert from 'node:assert/strict'
import { diffProjection, applyProjectionPatch } from '../lib/projection-diff.js'

test('projection deltas preserve nested state and append arrays', () => {
  const previous = { a: 1, nested: { x: 1, y: 2 }, list: [{ id: 'a' }], goal: { phase: 'active' } }
  const next = { a: 1, nested: { x: 1, y: 3 }, list: [{ id: 'a' }, { id: 'b' }], goal: { phase: 'done' } }
  const patch = diffProjection(previous, next)
  assert.ok(patch)
  assert.deepEqual(applyProjectionPatch(previous, patch), next)
})

test('projection deltas do not emit a patch for identical state', () => {
  const state = { a: [1, 2], b: { c: true } }
  assert.equal(diffProjection(state, structuredClone(state)), null)
})
