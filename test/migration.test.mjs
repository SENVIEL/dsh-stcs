import test from 'node:test'
import assert from 'node:assert/strict'
import { createState, reduce } from '../lib/state.js'
import { migrateToV3 } from '../lib/migrate-v3.js'

function apply(state, command) {
  return reduce(state, { ...command, now: command.now ?? 1000 }).state
}

test('v3 migration preserves goal, direction, fact, asset and finding evidence', () => {
  let state = createState({ sessionId: 's1', target: 'https://example.test', objective: 'audit', now: 1000 })
  state = apply(state, {
    type: 'intent', op: 'add', title: 'recon', detail: 'map', doneWhen: 'done', kind: 'recon'
  })
  state = apply(state, {
    type: 'fact', op: 'add', intentId: 'intent-1', kind: 'http', target: 'https://example.test', detail: 'GET / -> 200'
  })
  state = apply(state, {
    type: 'asset', op: 'add', assetType: 'endpoint', value: 'https://example.test/login', meta: 'login'
  })
  state = apply(state, {
    type: 'finding', op: 'add', intentId: 'intent-1', title: 'Exposed login', severity: 'high',
    reproducibleSteps: ['GET /login HTTP/1.1\r\nHost: example.test\r\n\r\n'],
    stepNotes: ['read login page'],
    stepResponses: ['HTTP/1.1 200 OK\r\n\r\nlogin']
  })
  const out = migrateToV3(state, { now: 2000 })
  assert.equal(out.state.version, 3)
  assert.equal(out.state.goal.target, 'https://example.test')
  assert.equal(out.state.directions.length, 1)
  assert.equal(out.state.facts.length, 1)
  assert.equal(out.state.assets.length, 1)
  assert.equal(out.state.findings.length, 1)
  assert.equal(out.state.evidence.length, 1)
  assert.equal(out.state.findings[0].evidenceIds[0], out.state.evidence[0].id)
  assert.equal(out.state.findings[0].directionId, 'intent-1')
  assert.equal(out.state.evidence[0].request, 'GET /login HTTP/1.1\r\nHost: example.test\r\n\r\n')
  assert.equal(out.state.evidence[0].response, 'HTTP/1.1 200 OK\r\n\r\nlogin')
  assert.equal(out.state.evidence[0].sha256.length, 64)
})
