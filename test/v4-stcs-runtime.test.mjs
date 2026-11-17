import test from 'node:test'
import assert from 'node:assert/strict'
import { StcsRuntime, memoryRuntimeTable } from '../lib/artex/runtime.js'

function makeState(phase = 'active') {
  return {
    revision: 3,
    goal: { id: 'goal-1', phase, createdAt: 1000, deadlineAt: 0 },
    settings: { workerLimit: 6 },
    directions: [
      { id: 'direction-1', state: 'open', priority: 10, question: 'one' },
      { id: 'direction-2', state: 'open', priority: 20, question: 'two' }
    ],
    tasks: []
  }
}

test('runtime mirrors a task, claims intents, and releases leases', async () => {
  const table = memoryRuntimeTable()
  const runtime = new StcsRuntime({ table, now: () => 1_000_000, maxWorkers: 2 })
  const state = makeState()
  await runtime.sync('s1', state)
  let view = await runtime.read('s1')
  assert.equal(view.phase, 'running')
  assert.equal(view.intents['direction-1'].state, 'open')

  view = await runtime.claim('s1', 'direction-1', 1_000_000)
  const worker = Object.values(view.workers).find((item) => item.intentId === 'direction-1')
  assert.ok(worker)
  assert.equal(view.intents['direction-1'].state, 'running')

  view = await runtime.bind('s1', worker.id, 'task-1', 'child-1', 1_000_000)
  assert.equal(view.workers[worker.id].state, 'running')

  state.tasks = [{ id: 'task-1', state: 'running', directionId: 'direction-1', childId: 'child-1' }]
  await runtime.sync('s1', state, 1_000_000)
  view = await runtime.read('s1')
  assert.equal(view.intents['direction-1'].state, 'running')

  state.tasks[0].state = 'done'
  state.directions[0].state = 'done'
  await runtime.sync('s1', state, 1_000_100)
  view = await runtime.read('s1')
  assert.equal(view.workers[worker.id].state, 'idle')
  assert.equal(view.intents['direction-1'].state, 'done')
})

test('runtime adopts tasks that were already running before restart', async () => {
  const runtime = new StcsRuntime({ table: memoryRuntimeTable(), now: () => 4_000_000, maxWorkers: 6 })
  const state = makeState()
  state.tasks = [{ id: 'task-9', state: 'running', directionId: 'direction-1', childId: 'child-9', startedAt: 3_999_000 }]
  await runtime.sync('s1', state, 4_000_000)
  const view = await runtime.read('s1')
  const worker = Object.values(view.workers).find((item) => item.taskId === 'task-9')
  assert.ok(worker)
  assert.equal(worker.state, 'running')
  assert.equal(worker.intentId, 'direction-1')
})

test('runtime pauses and resumes without deleting intent state', async () => {
  const runtime = new StcsRuntime({ table: memoryRuntimeTable(), now: () => 2_000_000 })
  const state = makeState('paused')
  await runtime.sync('s1', state)
  let view = await runtime.read('s1')
  assert.equal(view.phase, 'paused')
  assert.equal(view.intents['direction-1'].state, 'open')
  const claimed = await runtime.claim('s1', 'direction-1', 2_000_000)
  assert.equal(claimed.intents['direction-1'].state, 'open')

  state.goal.phase = 'active'
  await runtime.sync('s1', state)
  view = await runtime.read('s1')
  assert.equal(view.phase, 'running')
})

test('runtime planner rounds and deadline settle are recorded', async () => {
  const runtime = new StcsRuntime({ table: memoryRuntimeTable(), now: () => 3_000_000 })
  const state = makeState()
  state.goal.deadlineAt = 3_000_100
  await runtime.sync('s1', state)
  await runtime.plannerStarted('s1', 3_000_000)
  await runtime.plannerFinished('s1', { directions: [] }, 3_000_010)
  let view = await runtime.read('s1')
  assert.equal(view.planner.round, 1)
  assert.equal(view.planner.lastResult.directions.length, 0)

  await runtime.sync('s1', state, 3_000_200)
  view = await runtime.read('s1')
  assert.equal(view.phase, 'settling')
})

test('cold graph groups closed intents by shared assets and parents', async () => {
  const { buildColdDigest } = await import('../lib/artex/coldgraph.js')
  const digest = buildColdDigest({
    directions: [
      { id: 'd1', state: 'done', axis: ['identity'], assets: ['a1'] },
      { id: 'd2', state: 'blocked', axis: ['identity'], assets: ['a1'] },
      { id: 'd3', state: 'done', axis: ['input'], assets: ['a2'] }
    ],
    facts: [{ id: 'f1', directionId: 'd1' }],
    findings: [{ id: 'x1', directionId: 'd2' }],
    now: 1000
  })
  assert.equal(digest.totalClosed, 3)
  assert.equal(digest.groups.length, 2)
  const auth = digest.groups.find((group) => group.intents.includes('d1'))
  assert.deepEqual(auth.factIds, ['f1'])
  assert.deepEqual(auth.findingIds, ['x1'])
})
