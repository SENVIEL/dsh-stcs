import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_TRACE_DETAIL,
  MAX_TRACE_EVENTS,
  addTraceEvent,
  createTraceStore,
  getTrace,
  searchTrace,
  traceStats
} from '../lib/trace.js'

function fakeTable() {
  const rows = new Map()
  return {
    rows,
    async get(key) { return rows.get(key) },
    async put(key, value) { rows.set(key, structuredClone(value)) }
  }
}

test('trace add creates deterministic event ids and deduplicates identical steps', () => {
  const first = addTraceEvent(undefined, {
    sessionId: 's1',
    taskId: 'task-1',
    workerId: 'w1',
    step: '1',
    tool: 'pwsh',
    summary: 'probe login',
    detail: 'GET /login -> 200'
  }, 1000)
  assert.equal(first.reused, false)
  assert.equal(first.event.id, 'trace-1')
  assert.equal(first.record.revision, 1)
  assert.equal(first.record.events.length, 1)

  const duplicate = addTraceEvent(first.record, {
    sessionId: 's1',
    taskId: 'task-1',
    workerId: 'w1',
    step: '1',
    tool: 'pwsh',
    summary: 'probe login',
    detail: 'GET /login -> 200'
  }, 2000)
  assert.equal(duplicate.reused, true)
  assert.equal(duplicate.event.id, 'trace-1')
  assert.equal(duplicate.record.revision, 1)

  const second = addTraceEvent(first.record, {
    sessionId: 's1',
    taskId: 'task-1',
    workerId: 'w1',
    step: '2',
    tool: 'http',
    summary: 'different',
    detail: 'POST /login -> 302'
  }, 3000)
  assert.equal(second.reused, false)
  assert.equal(second.event.id, 'trace-2')
  assert.equal(second.record.revision, 2)
})

test('trace detail and summary are bounded', () => {
  const out = addTraceEvent(undefined, {
    sessionId: 's1',
    summary: 'x'.repeat(2000),
    detail: 'y'.repeat(MAX_TRACE_DETAIL + 100)
  }, 1)
  assert.equal(out.event.summary.length, 400)
  assert.equal(out.event.detail.length, MAX_TRACE_DETAIL)
})

test('trace ring buffer keeps the newest MAX_TRACE_EVENTS events', () => {
  let record = undefined
  for (let i = 0; i < MAX_TRACE_EVENTS + 5; i += 1) {
    record = addTraceEvent(record, {
      sessionId: 's1',
      taskId: 'task-1',
      step: String(i),
      summary: `step ${i}`,
      detail: `detail ${i}`
    }, i).record
  }
  assert.equal(record.events.length, MAX_TRACE_EVENTS)
  assert.equal(record.counter, MAX_TRACE_EVENTS + 5)
  assert.equal(record.events[0].step, '5')
  assert.equal(record.events.at(-1).step, String(MAX_TRACE_EVENTS + 4))
})

test('trace search filters by query, task and exclusion and returns bounded snippets', () => {
  let record = undefined
  for (const [taskId, summary, detail] of [
    ['task-1', 'login endpoint discovered', 'GET /login'],
    ['task-2', 'login bypass attempt', 'POST /login with X-Forwarded-For'],
    ['task-2', 'upload probe', 'POST /upload']
  ]) {
    record = addTraceEvent(record, { sessionId: 's1', taskId, summary, detail }, 1).record
  }
  const hits = searchTrace(record, { query: 'login', limit: 10 })
  assert.equal(hits.total, 2)
  assert.equal(hits.returned, 2)
  assert.match(hits.items[0].snippet, /login/)
  const onlyTask2 = searchTrace(record, { query: 'login', taskId: 'task-2' })
  assert.equal(onlyTask2.total, 1)
  const excluded = searchTrace(record, { query: 'login', excludeTaskId: 'task-2' })
  assert.equal(excluded.total, 1)
  assert.equal(excluded.items[0].taskId, 'task-1')
  const limited = searchTrace(record, { limit: 1 })
  assert.equal(limited.returned, 1)
  assert.equal(limited.hasMore, true)
})

test('trace get selects task and step ids', () => {
  let record = undefined
  for (const step of ['1', '2', '3']) {
    record = addTraceEvent(record, { sessionId: 's1', taskId: 'task-1', step, summary: `s${step}` }, 1).record
  }
  const out = getTrace(record, { taskId: 'task-1', stepIds: ['1', '3'] })
  assert.equal(out.total, 2)
  assert.deepEqual(out.items.map((item) => item.step), ['1', '3'])
  const byId = getTrace(record, { stepIds: ['trace-2'] })
  assert.equal(byId.total, 1)
  assert.equal(byId.items[0].step, '2')
  const byEvent = getTrace(record, { eventId: 'trace-3' })
  assert.equal(byEvent.total, 1)
  assert.equal(byEvent.items[0].step, '3')
})

test('trace stats group by task and tool', () => {
  let record = undefined
  record = addTraceEvent(record, { sessionId: 's1', taskId: 'task-1', tool: 'pwsh', summary: 'a' }, 1).record
  record = addTraceEvent(record, { sessionId: 's1', taskId: 'task-1', tool: 'http', summary: 'b' }, 2).record
  record = addTraceEvent(record, { sessionId: 's1', taskId: 'task-2', tool: 'http', summary: 'c' }, 3).record
  const stats = traceStats(record)
  assert.equal(stats.events, 3)
  assert.deepEqual(stats.byTask, { 'task-1': 2, 'task-2': 1 })
  assert.deepEqual(stats.byTool, { pwsh: 1, http: 2 })
})

test('trace store serializes concurrent appends without losing updates', async () => {
  const table = fakeTable()
  const store = createTraceStore({ table, now: () => 1000 })
  const results = await Promise.all(Array.from({ length: 20 }, (_, i) => store.add('s1', {
    taskId: 'task-1',
    step: String(i),
    summary: `step ${i}`
  })))
  await store.drain()
  assert.equal(results.length, 20)
  const row = table.rows.get('s1')
  assert.equal(row.events.length, 20)
  assert.equal(row.revision, 20)
  const ids = new Set(row.events.map((event) => event.id))
  assert.equal(ids.size, 20)
})
