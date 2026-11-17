import test from 'node:test'
import assert from 'node:assert/strict'
import { createStcsToolGuard } from '../lib/artex/guard.js'
import { CoordinatorRunner } from '../lib/artex/coordinator-runner.js'
import { openSharedDomain } from '../lib/domain-open.js'

// The committed preset is recorded in the `agentPreset` session projection.
// The session header keeps the creation-time value ("standard"), so reading
// only the header made the guard and the Coordinator treat every STCS session
// as a standard one.
test('guard and coordinator read the committed preset, not the creation-time header', () => {
  const agent = {
    id: 'session-stcs',
    session: { id: 'session-stcs', header: { agentPreset: 'standard' } }
  }
  const guard = createStcsToolGuard({ getPreset: () => 'artex' })
  assert.match(guard({ name: 'pentest_add_goal', agent, arguments: {} }), /v3/)
  assert.match(guard({ name: 'pentest_flow_dispatch', agent, arguments: {} }), /只读/)
  assert.equal(guard({ name: 'pentest_flow_start', agent, arguments: {} }), undefined)
  assert.equal(guard({ name: 'pentest_flow_status', agent, arguments: {} }), undefined)

  const standard = createStcsToolGuard({ getPreset: () => 'standard' })
  assert.equal(standard({ name: 'pentest_add_goal', agent, arguments: {} }), undefined)

  const runner = new CoordinatorRunner({
    store: {},
    getSession: () => undefined,
    agents: { list: () => [agent] },
    subagents: { startActivation: () => undefined },
    presetOf: () => 'artex'
  })
  assert.deepEqual(runner.listRootAgents().map((item) => item.id), ['session-stcs'])

  const plain = new CoordinatorRunner({
    store: {},
    getSession: () => undefined,
    agents: { list: () => [agent] },
    subagents: { startActivation: () => undefined }
  })
  assert.deepEqual(plain.listRootAgents(), [])
})

test('a losing domain opener waits for the winner and shares its handle', async () => {
  let shared
  let opens = 0
  const ctx = {
    storageDomain: {
      get: () => shared,
      async open() {
        opens += 1
        const error = new Error("domain 'pentest_v4' is already open")
        error.code = 'already-open'
        setTimeout(() => { shared = { shared: true } }, 10)
        throw error
      }
    }
  }
  const domain = await openSharedDomain(ctx, { name: 'pentest_v4' }, { attempts: 20, delayMs: 25 })
  assert.deepEqual(domain, { shared: true })
  assert.equal(opens, 1, 'the loser waits instead of hammering open()')

  await assert.rejects(
    openSharedDomain({
      storageDomain: {
        get: () => undefined,
        async open() { throw new Error('backend exploded') }
      }
    }, { name: 'pentest_v4' }, { attempts: 3, delayMs: 1 }),
    /backend exploded/
  )
})
