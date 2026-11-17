import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createHandlers } from '../lib/handlers.js'
import { memoryStore } from '../lib/store.js'
import { shouldEmitSnapshot } from '../lib/snapshot-gate.js'

const PACKET = 'GET /a HTTP/1.1\r\nHost: example.test\r\n\r\n'
const PACKET2 = 'GET /b HTTP/1.1\r\nHost: example.test\r\n\r\n'
const PACKET3 = 'POST /c HTTP/1.1\r\nHost: example.test\r\nContent-Length: 0\r\n\r\n'

function setup() {
  const mem = memoryStore(new Map(), { now: () => 1000 })
  const handlers = createHandlers({
    store: mem.store,
    now: () => 1000,
    legacyState: async () => undefined
  })
  return { mem, handlers }
}

function dshSetup() {
  const rows = new Map()
  const appended = []
  const table = {
    async get(sessionId) { return rows.get(sessionId) },
    async put(sessionId, row) { rows.set(sessionId, row) }
  }
  const sessions = {
    get() {
      return {
        append(type, record) { appended.push({ type, record }) }
      }
    }
  }
  const store = createDshStateStore({ table, sessions, now: () => 1000 })
  const handlers = createHandlers({ store, now: () => 1000, legacyState: async () => undefined })
  return { store, handlers, appended }
}

test('a real verify direction survives a later v3 write', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't', authorization: 'a' })
  const direction = await handlers.addIntent({
    sessionId: 's1', title: '验证: 真实验证方向', detail: 'd', doneWhen: 'w', kind: 'verify', priority: 5
  })
  assert.ok(direction.id)
  assert.ok(direction.taskId)
  // Any unrelated write used to delete this direction and remap its task.
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't2', authorization: 'a' })
  const state = await handlers.state({ sessionId: 's1' })
  assert.equal(state.counts.directions, 1)
  assert.equal(state.queue[0].directionId, direction.id)
  assert.equal(state.queue[0].state, 'pending')
})

test('validation evidenceRefs survive a later v3 write', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't', workdir: 'C:/tmp/s1' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'probe', detail: 'd', doneWhen: 'w' })
  const finding = await handlers.addFinding({
    sessionId: 's1', title: 'f1', severity: 'high', intentId: direction.id,
    reproducibleSteps: [PACKET], description: 'desc'
  })
  await handlers.validateFinding({
    sessionId: 's1', id: finding.id, verdict: 'reproduced',
    evidenceRefs: ['ev-1', 'ev-2'], validator: 'independent'
  })
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't3', workdir: 'C:/tmp/s1' })
  const state = await handlers.state({ sessionId: 's1' })
  assert.equal(state.validations.length, 1)
  assert.deepEqual(state.validations[0].evidenceRefs, ['ev-1', 'ev-2'])
})

test('replacing steps resets per-step notes, responses and expected', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'probe', detail: 'd', doneWhen: 'w' })
  const finding = await handlers.addFinding({
    sessionId: 's1', title: 'f1', severity: 'medium', intentId: direction.id,
    reproducibleSteps: [PACKET, PACKET2],
    stepNotes: ['note-a', 'note-b'],
    stepResponses: ['resp-a', 'resp-b'],
    stepExpected: ['exp-a', 'exp-b'],
    description: 'desc'
  })
  await handlers.updateFinding({ sessionId: 's1', id: finding.id, reproducibleSteps: [PACKET3] })
  const state = await handlers.state({ sessionId: 's1' })
  const updated = state.findings.find((item) => item.id === finding.id)
  assert.equal(updated.steps.length, 1)
  assert.equal(updated.steps[0].note, '')
  assert.equal(updated.steps[0].response, '')
  assert.equal(updated.steps[0].expected, '')
})

test('mismatched stepNotes length is rejected instead of silently attached', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'probe', detail: 'd', doneWhen: 'w' })
  const finding = await handlers.addFinding({
    sessionId: 's1', title: 'f1', severity: 'medium', intentId: direction.id,
    reproducibleSteps: [PACKET], description: 'desc'
  })
  await assert.rejects(
    () => handlers.updateFinding({ sessionId: 's1', id: finding.id, reproducibleSteps: [PACKET2], stepNotes: ['a', 'b'] }),
    /same length/
  )
})

test('brief state view stays small and keeps the full view unchanged', async () => {
  const { handlers } = setup()
  await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't' })
  const direction = await handlers.addIntent({ sessionId: 's1', title: 'recon', detail: 'd', doneWhen: 'w' })
  await handlers.addFact({
    sessionId: 's1', intentId: direction.id, kind: 'http', target: 'http://example.test',
    detail: 'x'.repeat(4000), confidence: 'observed'
  })
  const brief = await handlers.state({ sessionId: 's1', view: 'brief' })
  assert.equal(brief.brief, true)
  assert.equal(brief.facts, undefined)
  assert.ok(JSON.stringify(brief).length < 4000)
  const full = await handlers.state({ sessionId: 's1' })
  assert.equal(full.brief, undefined)
  assert.ok(Array.isArray(full.facts))
})

test('snapshot gate dedupes same revision and honours force', () => {
  assert.equal(shouldEmitSnapshot({ revision: 11, last: 11 }), false)
  assert.equal(shouldEmitSnapshot({ revision: 11, last: 11, force: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 11, last: 11, goalChanged: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 5, last: 4 }), true)
  // revision 55 is only 10 past the last snapshot; the OOM throttle now
  // requires 50/100/150 revisions depending on evidence volume. Safety
  // changes (goal/finding) still bypass the interval.
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 45 }), false)
  assert.equal(shouldEmitSnapshot({ revision: 95, last: 45 }), true)
  assert.equal(shouldEmitSnapshot({ revision: 55, last: 45, goalChanged: true }), true)
  assert.equal(shouldEmitSnapshot({ revision: 51, last: 45 }), false)
})

test('explicit reproject asks the store to force a snapshot', async () => {
  const calls = []
  const store = {
    async reproject(sessionId, options) {
      calls.push({ sessionId, options })
      return { revision: 3, directions: [], findings: [], assets: [] }
    }
  }
  const handlers = createHandlers({ store, now: () => 1000, legacyState: async () => undefined })
  await handlers.reproject({ sessionId: 's1' })
  await handlers.reproject({ sessionId: 's1' })
  assert.deepEqual(calls, [
    { sessionId: 's1', options: { force: true } },
    { sessionId: 's1', options: { force: true } }
  ])
})

test('report is written to the engagement workdir', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-report-'))
  try {
    const { handlers } = setup()
    await handlers.addGoal({ sessionId: 's1', target: 'http://example.test', objective: 't', workdir })
    const direction = await handlers.addIntent({ sessionId: 's1', title: 'probe', detail: 'd', doneWhen: 'w' })
    await handlers.addFinding({
      sessionId: 's1', title: 'f1', severity: 'medium', intentId: direction.id,
      reproducibleSteps: [PACKET], description: 'desc'
    })
    const result = await handlers.report({ sessionId: 's1' })
    assert.ok(result.reportPath)
    const text = fs.readFileSync(result.reportPath, 'utf8')
    assert.match(text, /example\.test/)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})
