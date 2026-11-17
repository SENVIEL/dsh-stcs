import test from 'node:test'
import assert from 'node:assert/strict'
import { createHandlers } from '../lib/handlers.js'
import { memoryStore } from '../lib/store.js'

function setup() {
  const mem = memoryStore(new Map(), { now: () => 1000 })
  const handlers = createHandlers({
    store: mem.store,
    now: () => 1000,
    legacyState: async () => undefined
  })
  return { mem, handlers }
}

test('handlers initialize a v3 goal and create exactly one task per direction', async () => {
  const { handlers, mem } = setup()
  const goal = await handlers.addGoal({
    sessionId: 's1', target: 'http://example.test', objective: 'test', workdir: 'C:/tmp/s1'
  })
  assert.equal(goal.initialized, true)
  assert.equal(goal.version, 3)

  const direction = await handlers.addIntent({
    sessionId: 's1', title: 'recon login', detail: 'map login', doneWhen: 'endpoints known', kind: 'recon', priority: 7
  })
  assert.ok(direction.id)
  assert.ok(direction.taskId)

  const state = await handlers.state({ sessionId: 's1' })
  assert.equal(state.counts.directions, 1)
  assert.equal(state.counts.queue, 1)
  assert.equal(state.queue[0].state, 'pending')
  assert.equal((await mem.store.read('s1')).revision >= 2, true)
})

test('handlers queue claim/complete/state are consistent', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 'test' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'verify one', detail: 'd', doneWhen: 'w' })
  const claimed = await handlers.queueClaim({ sessionId: 's1', workerId: 'w1', leaseMs: 1000 })
  assert.equal(claimed.task.id, direction.taskId)
  const completed = await handlers.queueComplete({
    sessionId: 's1', taskId: direction.taskId, workerId: 'w1', summary: 'done'
  })
  assert.equal(completed.task.state, 'done')
  const state = await handlers.state({ sessionId: 's1' })
  assert.equal(state.counts.frontier, 0)
  assert.equal(state.intents[0].state, 'done')
})

test('handlers add fact and asset and keep one canonical state', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 'test' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'recon', detail: 'd', doneWhen: 'w' })
  await handlers.addFact({
    sessionId: 's1', intentId: direction.id, kind: 'http', target: 'http://example.test', detail: 'GET / -> 200', confidence: 'high'
  })
  await handlers.addAsset({
    sessionId: 's1', assetType: 'endpoint', value: 'http://example.test/login', meta: 'login'
  })
  const state = await handlers.state({ sessionId: 's1' })
  assert.equal(state.counts.facts, 1)
  assert.equal(state.counts.assets, 1)
  assert.equal(state.intents.length, 1)
})

test('validateFinding accepts findingId alias', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 'test' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'verify login', detail: 'd', doneWhen: 'w', kind: 'verify' })
  const finding = await handlers.addFinding({
    sessionId: 's1',
    intentId: direction.id,
    title: 'login issue',
    severity: 'high',
    reproducibleSteps: ['GET /login HTTP/1.1\r\nHost: example.test\r\n\r\n'],
    stepNotes: ['read login'],
    stepResponses: ['HTTP/1.1 200 OK\r\n\r\nlogin']
  })
  const validation = await handlers.validateFinding({
    sessionId: 's1', findingId: finding.id, verdict: 'reproduced', validator: 'manual', notes: 'ok'
  })
  assert.equal(validation.validation.verdict, 'reproduced')
  assert.equal(validation.validation.validator, 'manual')
  const retest = await handlers.retestFinding({
    sessionId: 's1', findingId: finding.id, verdict: 'fixed', summary: 'fixed in test'
  })
  assert.equal(retest.retest.verdict, 'fixed')
})
