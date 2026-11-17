import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPlan } from '../lib/planner.js'

function baseState(overrides = {}) {
  return {
    version: 3,
    revision: 7,
    goal: { id: 'goal-1', phase: 'active', proofs: [] },
    directions: [],
    facts: [],
    findings: [],
    assets: [],
    edges: [],
    queue: [],
    coverage: [],
    digests: [],
    validations: [],
    ...overrides
  }
}

test('planner prioritizes the highest-priority runnable task and reports validation debt', () => {
  const state = baseState({
    directions: [
      { id: 'd-low', title: 'low', state: 'open', priority: 1 },
      { id: 'd-high', title: 'high', state: 'open', priority: 9 }
    ],
    queue: [
      { id: 'task-low', directionId: 'd-low', title: 'low task', state: 'pending', priority: 1, createdAt: 1 },
      { id: 'task-high', directionId: 'd-high', title: 'high task', state: 'pending', priority: 9, createdAt: 2 }
    ],
    findings: [
      { id: 'finding-1', title: 'RCE', severity: 'critical', directionId: 'd-high', createdAt: 1 },
      { id: 'finding-2', title: 'info', severity: 'low', directionId: 'd-high', createdAt: 2 }
    ]
  })
  const plan = buildPlan(state, { now: 1000, limit: 10 })
  assert.equal(plan.counts.runnable, 2)
  assert.equal(plan.runnable[0].taskId, 'task-high')
  assert.equal(plan.pendingValidation.length, 1)
  assert.equal(plan.pendingValidation[0].findingId, 'finding-1')
  assert.equal(plan.actions[0].kind, 'dispatch_task')
  assert.equal(plan.actions[0].taskId, 'task-high')
  assert.equal(plan.canComplete, false)
})

test('planner respects dependencies and budget exhaustion', () => {
  const state = baseState({
    directions: [
      { id: 'd1', title: 'one', state: 'running', priority: 5 },
      { id: 'd2', title: 'two', state: 'open', priority: 4, dependsOn: ['d1'] }
    ],
    queue: [
      { id: 'task-1', directionId: 'd1', state: 'running', priority: 5, createdAt: 1 },
      { id: 'task-2', directionId: 'd2', state: 'pending', priority: 4, createdAt: 2 },
      { id: 'task-3', directionId: 'd2', state: 'pending', priority: 10, createdAt: 3, budget: { maxCalls: 1, calls: 1 } }
    ]
  })
  const plan = buildPlan(state, { now: 1000 })
  assert.equal(plan.counts.runnable, 0)
  assert.equal(plan.counts.activeTasks, 3)
  assert.ok(plan.actions.length >= 1)
  assert.ok(plan.actions.every((action) => action.kind === 'inspect_task'))
})

test('planner tells the model to queue a frontier direction without a task', () => {
  const state = baseState({
    directions: [{ id: 'd1', title: 'no task', state: 'open', priority: 5 }]
  })
  const plan = buildPlan(state)
  assert.equal(plan.counts.frontier, 1)
  assert.equal(plan.actions[0].kind, 'queue_direction')
  assert.equal(plan.actions[0].directionId, 'd1')
})

test('planner allows completion only when directions/queue are terminal and proof exists', () => {
  const settled = baseState({
    goal: { id: 'goal-1', phase: 'active', proofs: [{ evidenceId: 'finding-1', reason: 'confirmed' }] },
    directions: [{ id: 'd1', title: 'done', state: 'done', priority: 1 }],
    queue: [{ id: 'task-1', directionId: 'd1', state: 'done', priority: 1 }],
    findings: [{ id: 'finding-1', title: 'confirmed', severity: 'high', directionId: 'd1' }],
    validations: [{ findingId: 'finding-1', verdict: 'reproduced' }]
  })
  const plan = buildPlan(settled)
  assert.equal(plan.canComplete, true)
  assert.equal(plan.counts.frontier, 0)
  assert.equal(plan.counts.activeTasks, 0)
})

test('planner supports v2 intent names as a fallback', () => {
  const state = {
    version: 2,
    revision: 2,
    goal: { phase: 'active', proofs: [] },
    intents: [{ id: 'intent-1', title: 'recon', state: 'open', priority: 5 }],
    queue: [{ id: 'task-1', intentId: 'intent-1', state: 'pending', priority: 5 }]
  }
  const plan = buildPlan(state)
  assert.equal(plan.counts.frontier, 1)
  assert.equal(plan.runnable[0].taskId, 'task-1')
})
