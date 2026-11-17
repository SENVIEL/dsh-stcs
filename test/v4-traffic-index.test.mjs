import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeTraffic, addTrafficRecord, searchTraffic, trafficStats, createTrafficStore
} from '../lib/traffic.js'
import { buildWorkerPrompt } from '../lib/v4/dispatch.js'
import { readFileSync } from 'node:fs'

function seed() {
  let record = null
  const a = addTrafficRecord(record, {
    sessionId: 's1', method: 'POST', url: 'https://a.test/api/login', status: 200,
    body: '{"token":"SECRET-ABC","role":"admin"}', role: 'proof', taskId: 'task-1'
  }, 1)
  record = a.record
  const b = addTrafficRecord(record, {
    sessionId: 's1', url: 'https://a.test/admin/export', status: 403,
    body: 'Traceback ... internal 10.0.0.9 hidden endpoint /internal/debug',
    role: 'baseline', taskId: 'task-2'
  }, 2)
  return b.record
}

test('normalizeTraffic accepts structured fields and raw transcripts', () => {
  const structured = normalizeTraffic({ url: 'https://a.test/x', status: 200, body: 'hello', role: 'proof' })
  assert.equal(structured.host, 'a.test')
  assert.equal(structured.status, 200)
  assert.equal(structured.role, 'proof')
  const raw = normalizeTraffic({ raw: 'HTTP/1.1 500 Internal Server Error\r\nContent-Type: text/plain\r\n\r\nPANIC at 10.0.0.9' })
  assert.equal(raw.status, 500)
  assert.match(raw.body, /PANIC at 10\.0\.0\.9/)
  const req = normalizeTraffic({ raw: 'POST /api/submit HTTP/1.1\r\nHost: a.test\r\n\r\n{"x":1}' })
  assert.equal(req.method, 'POST')
  assert.equal(req.url, '/api/submit')
})

test('cross-worker body_contains finds secrets, stack traces, internal IPs, hidden endpoints', () => {
  const record = seed()
  assert.equal(searchTraffic(record, { body_contains: 'secret-abc' }).items[0].url, 'https://a.test/api/login')
  assert.equal(searchTraffic(record, { body_contains: 'traceback' }).items[0].url, 'https://a.test/admin/export')
  assert.equal(searchTraffic(record, { body_contains: '10.0.0.9' }).items[0].url, 'https://a.test/admin/export')
  assert.equal(searchTraffic(record, { body_contains: '/internal/debug' }).items[0].url, 'https://a.test/admin/export')
  // excludeTaskId makes a worker find evidence recorded by OTHER workers.
  assert.equal(searchTraffic(record, { body_contains: 'internal', excludeTaskId: 'task-2' }).total, 0)
  assert.equal(searchTraffic(record, { body_contains: 'token', excludeTaskId: 'task-2' }).total, 1)
})

test('filters, bounded snippets and dedupe', () => {
  const record = seed()
  assert.equal(searchTraffic(record, { host: 'a.test' }).total, 2)
  assert.equal(searchTraffic(record, { status: 403 }).total, 1)
  assert.equal(searchTraffic(record, { role: 'proof' }).total, 1)
  assert.equal(searchTraffic(record, { method: 'POST' }).total, 1)
  const hit = searchTraffic(record, { body_contains: 'secret' }).items[0]
  assert.ok(hit.snippet.length < 400)
  assert.equal('body' in hit, false, 'search never returns full bodies')
  const dup = addTrafficRecord(record, {
    sessionId: 's1', method: 'POST', url: 'https://a.test/api/login', status: 200,
    body: '{"token":"SECRET-ABC","role":"admin"}', role: 'proof', taskId: 'task-1'
  }, 3)
  assert.equal(dup.reused, true)
  assert.equal(trafficStats(record).records, 2)
})

test('createTrafficStore serializes writes and persists through get/put table', async () => {
  const rows = new Map()
  const table = {
    async get(id) { return rows.get(id) },
    async put(id, row) { rows.set(id, row) }
  }
  const store = createTrafficStore({ table, now: () => 100 })
  const a = await store.record('s1', { url: 'https://b.test/x', status: 200, body: 'AKIA-LEAK-KEY' })
  assert.equal(a.reused, false)
  const found = await store.search('s1', { body_contains: 'akia-leak' })
  assert.equal(found.total, 1)
  const stats = await store.stats('s1')
  assert.equal(stats.records, 1)
  assert.equal(stats.byHost['b.test'], 1)
})

test('worker prompt instructs traffic search before probing', () => {
  const prompt = buildWorkerPrompt({
    direction: { question: 'q', doneWhen: 'd', stage: 'surface' },
    target: 'https://t.test', workdir: 'w'
  })
  assert.match(prompt, /pentest_traffic_search/)
  assert.match(prompt, /不要重复 curl/)
  assert.match(prompt, /pentest_traffic_record/)
})

test('plugin registers traffic tools and wires the evidence indexer', () => {
  const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  for (const name of ['pentest_traffic_record', 'pentest_traffic_search', 'pentest_traffic_stats']) {
    assert.ok(source.includes(`name: '${name}'`), `${name} missing`)
  }
  assert.match(source, /name: 'pentest_traffic'/)
  assert.match(source, /onEvidence: trafficEvidenceIndexer\(sessionId\)/)
})
