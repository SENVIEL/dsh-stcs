/**
 * Persistent worker trace store.
 *
 * ARTEX keeps an activity/trace stream per task so later workers can search
 * earlier processes instead of redoing work. DSH stores the canonical graph in
 * `pentest_v2`, but trace volume must not inflate the graph snapshot or the
 * session projection. This module therefore owns a separate storage domain
 * (`pentest_trace`) and keeps one bounded, append-only row per session.
 *
 * Design constraints:
 * - pure add/search helpers are testable without DSH;
 * - all writes are serialized per session;
 * - detail is bounded, hashed and deduplicated;
 * - search never returns unbounded payloads;
 * - no session event type is added (DSH would reject an unknown event type).
 */
import crypto from 'node:crypto'

export const TRACE_VERSION = 1
export const MAX_TRACE_EVENTS = 400
export const MAX_TRACE_DETAIL = 8192
export const MAX_TRACE_SUMMARY = 400
export const MAX_TRACE_QUERY = 256

function text(value, max = Number.MAX_SAFE_INTEGER) {
  const out = value === undefined || value === null ? '' : String(value)
  return out.length > max ? out.slice(0, max) : out
}

function hash(value) {
  return crypto.createHash('sha256').update(text(value)).digest('hex')
}

function clone(value) {
  return value === undefined ? value : structuredClone(value)
}

function emptyRecord(sessionId, now = Date.now()) {
  return {
    version: TRACE_VERSION,
    sessionId,
    revision: 0,
    counter: 0,
    updatedAt: now,
    events: []
  }
}

function normalizeRecord(row, sessionId) {
  if (!row || typeof row !== 'object') return emptyRecord(sessionId)
  const events = Array.isArray(row.events) ? row.events.filter((event) => event && typeof event === 'object') : []
  return {
    version: TRACE_VERSION,
    sessionId: text(row.sessionId || sessionId),
    revision: Math.max(0, Number(row.revision) || 0),
    counter: Math.max(events.length, Number(row.counter) || 0),
    updatedAt: Number(row.updatedAt) || 0,
    events: events.slice(-MAX_TRACE_EVENTS)
  }
}

function eventKey(event) {
  return [
    text(event.taskId),
    text(event.workerId),
    text(event.step),
    text(event.tool),
    text(event.phase)
  ].join('\u0000')
}

/**
 * Append one trace event to a record. Returns the same record object shape;
 * callers persist the returned `record`.
 */
export function addTraceEvent(record, input = {}, now = Date.now()) {
  const current = normalizeRecord(record, text(input.sessionId))
  const sessionId = text(input.sessionId || current.sessionId)
  if (!sessionId) fail('trace/session', 'trace sessionId required')
  const taskId = text(input.taskId, 160)
  const workerId = text(input.workerId, 160)
  const step = text(input.step, 80)
  const tool = text(input.tool, 120)
  const phase = text(input.phase || 'step', 40)
  const summary = text(input.summary, MAX_TRACE_SUMMARY).trim()
  const detail = text(input.detail, MAX_TRACE_DETAIL)
  if (summary === '' && detail === '') fail('trace/empty', 'trace requires summary or detail')
  const evidenceRefs = Array.isArray(input.evidenceRefs)
    ? input.evidenceRefs.filter((value) => typeof value === 'string' && value !== '').slice(0, 32)
    : []
  const digest = hash([taskId, workerId, step, tool, phase, summary, detail].join('\u0000'))
  const key = eventKey({ taskId, workerId, step, tool, phase }) + '\u0000' + digest
  const existing = current.events.find((event) => event.key === key)
  if (existing) {
    return { record: current, event: existing, reused: true }
  }
  const counter = current.counter + 1
  const event = {
    id: `trace-${counter}`,
    taskId,
    workerId,
    step,
    tool,
    phase,
    summary,
    detail,
    evidenceRefs,
    digest,
    key,
    createdAt: now
  }
  const events = current.events.concat(event)
  if (events.length > MAX_TRACE_EVENTS) events.splice(0, events.length - MAX_TRACE_EVENTS)
  return {
    record: {
      ...current,
      revision: current.revision + 1,
      counter,
      updatedAt: now,
      events
    },
    event,
    reused: false
  }
}

export function searchTrace(record, options = {}) {
  const current = normalizeRecord(record, text(options.sessionId))
  const query = text(options.query, MAX_TRACE_QUERY).trim().toLowerCase()
  const taskId = text(options.taskId, 160)
  const excludeTaskId = text(options.excludeTaskId, 160)
  const limit = clampInt(options.limit, 20, 1, 100)
  let items = current.events
  if (taskId) items = items.filter((event) => event.taskId === taskId)
  if (excludeTaskId) items = items.filter((event) => event.taskId !== excludeTaskId)
  if (query) {
    items = items.filter((event) => [event.taskId, event.workerId, event.tool, event.phase, event.summary, event.detail]
      .some((value) => text(value).toLowerCase().includes(query)))
  }
  const total = items.length
  const selected = items.slice(-limit).map((event) => ({
    ...clone(event),
    snippet: text(event.summary || event.detail, 320)
  }))
  return { total, returned: selected.length, hasMore: total > selected.length, items: selected }
}

export function getTrace(record, options = {}) {
  const current = normalizeRecord(record, text(options.sessionId))
  const taskId = text(options.taskId, 160)
  const stepIds = Array.isArray(options.stepIds)
    ? new Set(options.stepIds.map((value) => text(value, 80)).filter(Boolean))
    : null
  const eventId = text(options.eventId, 80)
  let items = current.events
  if (taskId) items = items.filter((event) => event.taskId === taskId)
  if (eventId) items = items.filter((event) => event.id === eventId)
  if (stepIds) items = items.filter((event) => stepIds.has(event.step) || stepIds.has(event.id))
  const limit = clampInt(options.limit, 100, 1, 200)
  return {
    total: items.length,
    returned: Math.min(items.length, limit),
    hasMore: items.length > limit,
    items: items.slice(-limit).map((event) => clone(event))
  }
}

export function traceStats(record) {
  const current = normalizeRecord(record, '')
  const byTask = new Map()
  const byTool = new Map()
  for (const event of current.events) {
    byTask.set(event.taskId || '(none)', (byTask.get(event.taskId || '(none)') || 0) + 1)
    byTool.set(event.tool || '(none)', (byTool.get(event.tool || '(none)') || 0) + 1)
  }
  return {
    revision: current.revision,
    events: current.events.length,
    updatedAt: current.updatedAt,
    byTask: Object.fromEntries(byTask),
    byTool: Object.fromEntries(byTool)
  }
}

export function createTraceStore({ table, now = () => Date.now() }) {
  if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
    throw new Error('trace store requires get/put table')
  }
  const chains = new Map()
  const load = async (sessionId) => normalizeRecord(await table.get(sessionId), sessionId)
  const save = async (sessionId, record) => {
    await table.put(sessionId, record)
  }
  const enqueue = (sessionId, operation) => {
    const previous = chains.get(sessionId) ?? Promise.resolve()
    const current = previous.then(operation, operation)
    chains.set(sessionId, current.then(() => {}, () => {}))
    return current
  }
  return {
    async add(sessionId, input) {
      const id = requireSession(sessionId)
      return enqueue(id, async () => {
        const current = await load(id)
        const out = addTraceEvent(current, { ...input, sessionId: id }, now())
        await save(id, out.record)
        return { event: out.event, reused: out.reused, revision: out.record.revision }
      })
    },
    async search(sessionId, options = {}) {
      const id = requireSession(sessionId)
      return searchTrace(await load(id), { ...options, sessionId: id })
    },
    async get(sessionId, options = {}) {
      const id = requireSession(sessionId)
      return getTrace(await load(id), { ...options, sessionId: id })
    },
    async stats(sessionId) {
      const id = requireSession(sessionId)
      return traceStats(await load(id))
    },
    async drain() {
      await Promise.all([...chains.values()])
    }
  }
}

function requireSession(sessionId) {
  const id = text(sessionId)
  if (!id) fail('trace/session', 'trace sessionId required')
  return id
}

function clampInt(value, fallback, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, Math.round(n)))
}

function fail(code, message) {
  const error = new Error(message)
  error.code = code
  throw error
}
