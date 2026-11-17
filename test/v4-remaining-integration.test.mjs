import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'
import { reduceV4 } from '../lib/v4/reduce.js'
import { createV4State } from '../lib/v4/state.js'
import { aggregateRetests } from '../lib/v4/retest.js'

const plugin = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
const dispatch = readFileSync(new URL('../lib/v4/dispatch.js', import.meta.url), 'utf8')

test('all four remaining features are wired into shared files', () => {
  // P0-5: api-recon artifacts accepted by pentest_flow_asset
  const asset = plugin.slice(plugin.indexOf("name: 'pentest_flow_asset'"), plugin.indexOf("name: 'pentest_flow_status'"))
  assert.match(asset, /apiMerged/)
  assert.match(asset, /buildApiRecon/)
  assert.match(asset, /reconDirections/)
  // P0-6: dispatcher builds checkpoint on fail + reducer stores it
  assert.match(dispatch, /buildCheckpoint\(/)
  assert.match(dispatch, /readResumeCandidates/)
  const reduce = readFileSync(new URL('../lib/v4/reduce.js', import.meta.url), 'utf8')
  assert.match(reduce, /task\.checkpoint =/)
  assert.match(plugin, /resumeCandidates: selectResumeCandidates/)
  // P1-9: additive derived coverage fields
  assert.match(plugin, /derivedCoverage: deriveCoverage\(state\)/)
  assert.match(plugin, /untestedDirections: untestedDirections\(state/)
  // P2-10: retest gate on validate + delivery
  assert.match(plugin, /evaluateRetest\(\{/)
  assert.match(plugin, /effectiveVerdict = 'inconclusive'/)
  assert.match(plugin, /retestGate = aggregateRetests/)
  assert.match(reduce, /metadata\.retest/)
})

test('worker fail reducer persists a bounded checkpoint and keeps direction open', () => {
  const state = createV4State({ sessionId: 's-cp', target: 'https://t.test', objective: 'o', now: 1 })
  state.directions = [{ id: 'direction-1', question: 'q', doneWhen: 'd', state: 'running', conclusion: null }]
  state.tasks = [{ id: 'task-1', directionId: 'direction-1', state: 'running', childId: 'c1' }]
  state.evidence = [{ id: 'evidence-1', sha256: 'a'.repeat(64), role: 'proof', path: 'e/1', summary: 'observed', createdAt: 2 }]
  const next = reduceV4(state, {
    type: 'worker', op: 'fail', taskId: 'task-1', error: 'timeout', now: 3
  })
  assert.equal(next.tasks[0].state, 'failed')
  assert.equal(next.directions[0].state, 'open')
  assert.ok(next.tasks[0].checkpoint)
  assert.equal(next.tasks[0].checkpoint.taskId, 'task-1')
  assert.ok(next.tasks[0].checkpoint.continueFrom)
  assert.equal(next.tasks[0].checkpoint.error, 'timeout')
})

test('retest aggregate gate is used by delivery', () => {
  const gate = aggregateRetests([{ findingId: 'f1', verdict: 'inconclusive', reason: 'one failure' }])
  assert.equal(gate.deliverable, false)
  assert.ok(gate.blockers.length > 0)
})
