import test from 'node:test'
import assert from 'node:assert/strict'
import { createState, reduce } from '../lib/state.js'

function state() {
  return createState({ sessionId: 's1', target: 'http://example.test', objective: 'test', now: 1000 })
}

function apply(current, command) {
  return reduce(current, { ...command, now: command.now ?? 1000 })
}

test('state creates one goal and increments revision on every command', () => {
  let current = state()
  assert.equal(current.revision, 1)
  assert.equal(current.goal.id, 'goal-1')
  const out = apply(current, {
    type: 'intent', op: 'add', title: 'recon login', detail: 'map login', doneWhen: 'endpoints known', kind: 'recon'
  })
  assert.equal(out.state.revision, 2)
  assert.equal(out.state.intents.length, 1)
  assert.equal(out.result.id, 'intent-1')
})

test('state rejects duplicate open intent titles and unknown dependencies', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'same', detail: 'd', doneWhen: 'w' }).state
  assert.throws(() => apply(current, { type: 'intent', op: 'add', title: 'same', detail: 'd2', doneWhen: 'w2' }), /already exists/)
  assert.throws(() => apply(current, { type: 'intent', op: 'add', title: 'dep', detail: 'd', doneWhen: 'w', dependsOn: ['missing'] }), /unknown intent/)
})

test('queue claim/complete drives intent to done', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'task', detail: 'd', doneWhen: 'w' }).state
  const pushed = apply(current, { type: 'queue', op: 'push', intentId: 'intent-1' })
  current = pushed.state
  assert.equal(pushed.result.task.id, 'task-1')
  const claimed = apply(current, { type: 'queue', op: 'claim', workerId: 'w1', leaseMs: 1000 })
  current = claimed.state
  assert.equal(claimed.result.task.state, 'claimed')
  assert.equal(current.intents[0].state, 'running')
  const completed = apply(current, { type: 'queue', op: 'complete', taskId: 'task-1', workerId: 'w1', summary: 'done' })
  assert.equal(completed.result.task.state, 'done')
  assert.equal(completed.state.intents[0].state, 'done')
})

test('queue cannot be claimed by a worker that already owns another task', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'one', detail: 'd', doneWhen: 'w' }).state
  current = apply(current, { type: 'intent', op: 'add', title: 'two', detail: 'd', doneWhen: 'w' }).state
  current = apply(current, { type: 'queue', op: 'push', intentId: 'intent-1' }).state
  current = apply(current, { type: 'queue', op: 'push', intentId: 'intent-2' }).state
  current = apply(current, { type: 'queue', op: 'claim', workerId: 'w1' }).state
  const second = apply(current, { type: 'queue', op: 'claim', workerId: 'w1' })
  assert.equal(second.result.reused, true)
  assert.equal(second.result.task.workerId, 'w1')
})

test('queue failure retries then dead-letters at maxAttempts', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'retry', detail: 'd', doneWhen: 'w' }).state
  current = apply(current, { type: 'queue', op: 'push', intentId: 'intent-1', maxAttempts: 2 }).state
  current = apply(current, { type: 'queue', op: 'claim', workerId: 'w1' }).state
  const retry = apply(current, { type: 'queue', op: 'fail', taskId: 'task-1', workerId: 'w1', reason: 'temporary' })
  assert.equal(retry.result.task.state, 'pending')
  current = retry.state
  current = apply(current, { type: 'queue', op: 'claim', workerId: 'w1' }).state
  const dead = apply(current, { type: 'queue', op: 'fail', taskId: 'task-1', workerId: 'w1', reason: 'again' })
  assert.equal(dead.result.task.state, 'dead')
  assert.equal(dead.state.intents[0].state, 'blocked')
})

test('queue reconcile recovers an expired lease', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'lease', detail: 'd', doneWhen: 'w' }).state
  current = apply(current, { type: 'queue', op: 'push', intentId: 'intent-1' }).state
  current = apply(current, { type: 'queue', op: 'claim', workerId: 'w1', leaseMs: 10 }).state
  const reconciled = apply(current, { type: 'queue', op: 'reconcile', now: 2000 })
  assert.deepEqual(reconciled.result.changed, ['task-1'])
  assert.equal(reconciled.state.queue[0].state, 'pending')
  assert.equal(reconciled.state.queue[0].workerId, '')
})

test('asset values are deduplicated and parent edges are created once', () => {
  let current = state()
  const parent = apply(current, { type: 'asset', op: 'add', assetType: 'root-domain', value: 'example.test' })
  current = parent.state
  const child = apply(current, { type: 'asset', op: 'add', assetType: 'subdomain', value: 'api.example.test', parentId: parent.result.asset.id })
  current = child.state
  const duplicate = apply(current, { type: 'asset', op: 'add', assetType: 'subdomain', value: 'API.EXAMPLE.TEST' })
  assert.equal(duplicate.result.reused, true)
  assert.equal(duplicate.state.assets.length, 2)
  assert.equal(duplicate.state.edges.filter((edge) => edge.kind === 'parent').length, 1)
})

test('goal block is rejected while an intent is open', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'open', detail: 'd', doneWhen: 'w' }).state
  assert.throws(() => apply(current, { type: 'goal', op: 'block', reason: 'model says blocked', kind: 'external' }), /non-terminal intent/)
})

test('goal complete requires proof and no active queue', () => {
  let current = state()
  current = apply(current, { type: 'intent', op: 'add', title: 'done', detail: 'd', doneWhen: 'w' }).state
  current = apply(current, { type: 'intent', op: 'set', id: 'intent-1', state: 'done', reason: 'finished' }).state
  assert.throws(() => apply(current, { type: 'goal', op: 'complete' }), /no evidence proof/)
})
