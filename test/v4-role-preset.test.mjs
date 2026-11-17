import assert from 'node:assert/strict'
import test from 'node:test'

import { RoleRunner } from '../lib/v4/roles.js'

test('RoleRunner retries without an unavailable role preset', async () => {
  const calls = []
  const session = {
    sessionId: 's1',
    async read() {
      return { goal: { target: 'https://t.test', workdir: '.' }, revision: 1 }
    },
    async run() { return {} }
  }
  const subagents = {
    startActivation: async (spec) => {
      calls.push(spec)
      if (spec.request.agentPreset) throw new Error(`Unknown agent preset: ${spec.request.agentPreset}`)
      return { childId: 'child-1', result: Promise.resolve({ stopReason: 'completed', structured: { findingId: 'f1', verdict: 'inconclusive', evidence: [], notes: 'default preset worked' } }) }
    }
  }
  const runner = new RoleRunner({ session, subagents, agent: { id: 'a1' }, cwd: '.' })
  const result = await runner.run('validator', { findingId: 'f1' }, { timeoutMs: 1000 })
  assert.equal(result.structured.verdict, 'inconclusive')
  assert.equal(calls.length, 2, 'one preset rejection followed by a default-preset retry')
  assert.ok(calls[0].request.agentPreset)
  assert.equal(calls[1].request.agentPreset, undefined)
  assert.equal(calls[1].delivery, 'caller')
})
