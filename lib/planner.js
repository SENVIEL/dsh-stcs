/**
 * Deterministic planner view.
 *
 * ARTEX separates planning from execution: the planner reads the graph and
 * emits only actionable work, while workers execute one intent. DSH still has
 * a model in the loop, so this module provides the same *decision surface*
 * without mutating state: a compact, stable list of what is runnable, what is
 * stuck, and what must not be marked done yet.
 *
 * The output is intentionally small. It is a planner hint, not a replacement
 * for `pentest_state`.
 */

const ACTIVE_TASK = new Set(['pending', 'claimed', 'running'])
const TERMINAL_DIRECTION = new Set(['done', 'exhausted', 'blocked', 'stopped'])
const HIGH_SEVERITY = new Set(['critical', 'high'])

function text(value) {
  return value === undefined || value === null ? '' : String(value)
}

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function directionOf(state) {
  return Array.isArray(state?.directions) ? state.directions : (Array.isArray(state?.intents) ? state.intents : [])
}

function directionIdOf(task) {
  return text(task?.directionId || task?.intentId)
}

function directionById(state) {
  return new Map(directionOf(state).map((direction) => [direction.id, direction]))
}

function taskBudgetExhausted(task, now) {
  const budget = task?.budget
  if (!budget || typeof budget !== 'object') return false
  if (budget.exhausted === true) return true
  const maxCalls = number(budget.maxCalls)
  const maxMs = number(budget.maxMs)
  const maxEvidence = number(budget.maxEvidence)
  return (maxCalls > 0 && number(budget.calls) >= maxCalls) ||
    (maxMs > 0 && number(budget.timeMs) >= maxMs) ||
    (maxEvidence > 0 && number(budget.evidence) >= maxEvidence)
}

function dependenciesDone(direction, directions) {
  const deps = Array.isArray(direction?.dependsOn) ? direction.dependsOn : []
  return deps.every((id) => directions.get(id)?.state === 'done')
}

function findingNeedsValidation(finding, state) {
  if (finding?.deleted === true) return false
  if (!HIGH_SEVERITY.has(text(finding?.severity))) return false
  const validations = Array.isArray(state?.validations) ? state.validations : []
  const validation = validations.find((item) => item.findingId === finding.id)
  if (validation?.verdict === 'reproduced') return false
  if (finding?.validation?.verdict === 'reproduced') return false
  return true
}

function priorityOf(item) {
  const value = number(item?.priority, 0)
  return value
}

/**
 * Build the deterministic planner surface.
 *
 * @param {object} state v2 or v3 state
 * @param {{now?: number, limit?: number}} options
 */
export function buildPlan(state, options = {}) {
  if (!state || typeof state !== 'object') throw new Error('buildPlan: state required')
  const now = number(options.now, Date.now())
  const limit = Math.max(1, Math.min(20, Math.round(number(options.limit, 8))))
  const directions = directionOf(state)
  const directionsById = directionById(state)
  const queue = Array.isArray(state.queue) ? state.queue : []
  const findings = Array.isArray(state.findings) ? state.findings : []

  const activeTasks = queue.filter((task) => ACTIVE_TASK.has(task?.state))
  const runnable = queue
    .filter((task) => task?.state === 'pending')
    .filter((task) => !taskBudgetExhausted(task, now))
    .filter((task) => {
      const direction = directionsById.get(directionIdOf(task))
      return direction && !TERMINAL_DIRECTION.has(direction.state) && dependenciesDone(direction, directionsById)
    })
    .sort((a, b) => priorityOf(b) - priorityOf(a) || number(a.createdAt) - number(b.createdAt))

  const frontier = directions
    .filter((direction) => direction?.state === 'open' || direction?.state === 'running')
    .sort((a, b) => priorityOf(b) - priorityOf(a))

  const blocked = directions
    .filter((direction) => direction?.state === 'blocked' || direction?.state === 'exhausted')
    .sort((a, b) => number(b.updatedAt) - number(a.updatedAt))

  const pendingValidation = findings
    .filter((finding) => findingNeedsValidation(finding, state))
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || number(b.createdAt) - number(a.createdAt))

  const next = []
  const push = (action) => {
    if (next.length < limit) next.push(action)
  }

  for (const task of runnable.slice(0, 3)) {
    push({
      kind: 'dispatch_task',
      taskId: task.id,
      directionId: directionIdOf(task),
      priority: priorityOf(task),
      reason: task.title || 'pending queue task'
    })
  }

  if (runnable.length === 0) {
    for (const direction of frontier.slice(0, 3)) {
      const existing = queue.find((task) => directionIdOf(task) === direction.id && ACTIVE_TASK.has(task?.state))
      push({
        kind: existing ? 'inspect_task' : 'queue_direction',
        taskId: existing?.id || null,
        directionId: direction.id,
        priority: priorityOf(direction),
        reason: existing ? 'direction has no runnable task; reconcile its owner/lease' : 'frontier direction has no queue task'
      })
    }
  }

  for (const finding of pendingValidation.slice(0, 3)) {
    push({
      kind: 'validate_finding',
      findingId: finding.id,
      severity: finding.severity,
      reason: 'high/critical finding has no reproduced validation'
    })
  }

  const goalPhase = text(state.goal?.phase || 'active')
  const canComplete = goalPhase === 'active' &&
    frontier.length === 0 &&
    activeTasks.length === 0 &&
    (Array.isArray(state.goal?.proofs) ? state.goal.proofs.length > 0 : false)

  return {
    revision: number(state.revision),
    goalPhase,
    paused: state.goal?.paused === true,
    counts: {
      directions: directions.length,
      frontier: frontier.length,
      runnable: runnable.length,
      activeTasks: activeTasks.length,
      pendingValidation: pendingValidation.length
    },
    runnable: runnable.slice(0, limit).map((task) => ({
      taskId: task.id,
      directionId: directionIdOf(task),
      title: task.title || '',
      priority: priorityOf(task),
      attempts: number(task.attempts),
      maxAttempts: number(task.maxAttempts)
    })),
    frontier: frontier.slice(0, limit).map((direction) => ({
      directionId: direction.id,
      title: direction.title || '',
      state: direction.state,
      priority: priorityOf(direction),
      kind: direction.kind || 'recon'
    })),
    blocked: blocked.slice(0, limit).map((direction) => ({
      directionId: direction.id,
      title: direction.title || '',
      state: direction.state,
      reason: direction.stateReason || direction.error || ''
    })),
    pendingValidation: pendingValidation.slice(0, limit).map((finding) => ({
      findingId: finding.id,
      title: finding.title || '',
      severity: finding.severity || ''
    })),
    actions: next,
    canComplete,
    plannerInstruction: next.length > 0
      ? 'Execute the first action that matches your current role; do not create duplicate directions.'
      : (canComplete
          ? 'All directions and tasks are settled; prove remaining acceptance criteria before completing the goal.'
          : 'No runnable task. Inspect blocked directions and add a genuinely new direction only from a new fact.')
  }
}

function severityRank(value) {
  switch (text(value)) {
    case 'critical': return 4
    case 'high': return 3
    case 'medium': return 2
    case 'low': return 1
    default: return 0
  }
}
