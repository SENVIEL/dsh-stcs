/**
 * Phase 2 queue backfill: turn open/running v3 directions without an active
 * task into concrete pending queue tasks. This is an explicit migration step,
 * never an implicit read mutation.
 */
const ACTIVE_TASKS = new Set(['pending', 'claimed', 'running'])
const TERMINAL_INTENTS = new Set(['done', 'exhausted', 'blocked', 'stopped'])

function nonNegativeInt(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : fallback
}

export function backfillTasks(state, { now = Date.now() } = {}) {
  if (!state || Number(state.version) < 3) return { state, created: [] }
  const goal = state.goal
  if (!goal || goal.phase !== 'active') return { state, created: [] }
  const directions = Array.isArray(state.directions) ? state.directions : []
  const queue = Array.isArray(state.queue) ? state.queue : []
  const counters = { ...(state.counters || {}) }
  const nextId = () => {
    counters.task = (Number(counters.task) || 0) + 1
    return `task-${counters.task}`
  }
  const created = []
  for (const direction of directions) {
    if (!direction || TERMINAL_INTENTS.has(direction.state)) continue
    const directionId = direction.id
    if (queue.some((task) => task && (task.directionId || task.intentId) === directionId && ACTIVE_TASKS.has(task.state))) continue
    const task = {
      id: nextId(),
      directionId,
      intentId: directionId,
      title: String(direction.title || direction.detail || directionId),
      state: 'pending',
      priority: Number.isFinite(direction.priority) ? direction.priority : 0,
      workerId: '',
      leaseUntil: 0,
      attempts: 0,
      maxAttempts: 3,
      payload: {},
      budget: {
        maxCalls: 24,
        maxMs: 15 * 60 * 1000,
        maxEvidence: 20,
        calls: 0,
        timeMs: 0,
        evidence: 0,
        exhausted: false
      },
      result: null,
      createdAt: now,
      updatedAt: now
    }
    queue.push(task)
    created.push(task)
  }
  const next = {
    ...state,
    directions: directions.map((direction) => ({ ...direction })),
    queue,
    counters,
    revision: Number(state.revision || 0) + 1
  }
  return { state: next, created }
}
