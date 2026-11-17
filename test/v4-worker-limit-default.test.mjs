import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { planV4 } from '../lib/v4/plan.js'
import { createV4State } from '../lib/v4/state.js'
import { AXES } from '../lib/v4/axes.js'

const plugin = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('default worker limit is 6 everywhere', () => {
  assert.equal(createV4State({ sessionId: 's1', target: 'https://t.test', objective: 'o' }).settings.workerLimit, 6)
  const plan = readFileSync(new URL('../lib/v4/plan.js', import.meta.url), 'utf8')
  const dispatch = readFileSync(new URL('../lib/v4/dispatch.js', import.meta.url), 'utf8')
  assert.match(plan, /DEFAULT_WORKER_LIMIT = 6/)
  assert.match(dispatch, /maxWorkers = 6/)
  assert.ok(plugin.includes('workerLimit) || 6'))
  assert.ok(plugin.includes('configuredWorkers : 6'))
  assert.ok(plugin.includes('默认并发是 6 个 worker'))
  assert.ok(plugin.includes('默认 maxWorkers=6'))
})

test('unfinished goal produces up to 6 distinct fallback directions', () => {
  const state = {
    version: 4,
    goal: { id: 'g1', target: 'https://t.test', phase: 'active' },
    goals: [{ id: 'g1', state: 'open' }],
    directions: [], tasks: [], facts: [], findings: [], assets: [],
    coverage: AXES.map((axis) => ({ axis, axes: [axis], result: 'no_issue_found', evidenceIds: ['e1'] })),
    planner: { candidates: [] },
    settings: { workerLimit: 6 }
  }
  const p = planV4(state)
  assert.equal(p.concurrency.limit, 6)
  assert.equal(p.fallbacks.length, 6)
  assert.equal(new Set(p.fallbacks.map((f) => f.question)).size, 6)
})

test('autoAdvance creates one fallback per free slot, not just one', () => {
  const start = plugin.indexOf('const wanted = Math.max(0, Math.min(freeWorkers, 6))')
  assert.ok(start > 0)
  const body = plugin.slice(start, start + 900)
  assert.match(body, /for \(const spec of specs\)/)
  assert.match(body, /autoPlan\.fallbacks/)
  assert.match(body, /addDirection\(/)
  assert.match(plugin, /count=1 逐个派工/)
})
