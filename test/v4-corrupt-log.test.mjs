import assert from 'node:assert/strict'
import test from 'node:test'

import { V4Session } from '../lib/v4/session.js'
import { createV4State } from '../lib/v4/state.js'

test('control commands commit state even when UI snapshot append fails', async () => {
  const sessionId = 's-corrupt-log'
  const rows = new Map()
  rows.set(sessionId, createV4State({ sessionId, target: 'https://t.test', objective: 'o', now: 1 }))
  const store = V4Session.createStore({
    load: async (id) => rows.get(id),
    save: async (id, state) => { rows.set(id, structuredClone(state)) },
    append: async () => {},
    now: () => 1000
  })
  // Simulate the host rejecting every event append because the session log
  // has a seq gap. The canonical state table save still succeeds.
  store.append = async () => { throw new Error('corrupt session log: seq gap') }
  const session = new V4Session({ store, sessionId })

  const paused = await session.runTolerant({ type: 'goal', op: 'pause' })
  assert.equal(paused.goal.phase, 'paused')
  assert.equal((await session.read()).goal.phase, 'paused')

  const resumed = await session.runTolerant({ type: 'goal', op: 'resume' })
  assert.equal(resumed.goal.phase, 'active')

  // All v4 writes now tolerate a corrupt event log by default: the canonical
  // state table is saved first and is the source of truth. Explicit strict
  // mode still fails loudly.
  const committed = await session.run({ type: 'goal', op: 'pause' })
  assert.equal(committed.goal.phase, 'paused')
  await assert.rejects(
    () => session.run({ type: 'goal', op: 'resume' }, { tolerateAppendFailure: false }),
    /seq gap/
  )
})
