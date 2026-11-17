/**
 * Phase 3 scope backfill: materialize goal.targets from legacy goal.target.
 * Never invents excluded targets; never rewrites a goal with structured targets.
 */
import { goalScope } from './scope.js'

function entryToString(entry) {
  const base = entry.wildcard ? `*.${entry.host}` : entry.host
  return entry.port === '' ? base : `${base}:${entry.port}`
}

export function backfillScope(state) {
  if (!state || Number(state.version) < 3) return { state, changed: false }
  const goal = state.goal
  if (!goal || goal.phase === 'completed') return { state, changed: false }
  const explicit = Array.isArray(goal.targets) ? goal.targets.filter((item) => typeof item === 'string' && item.trim() !== '') : []
  if (explicit.length > 0) return { state, changed: false }
  const scope = goalScope(goal)
  if (scope.targets.length === 0) return { state, changed: false }
  const targets = scope.targets.map(entryToString)
  return {
    state: {
      ...state,
      goal: {
        ...goal,
        targets,
        excludedTargets: Array.isArray(goal.excludedTargets) ? goal.excludedTargets : [],
        scopeUpdatedAt: Number(goal.scopeUpdatedAt) || Date.now()
      },
      revision: Number(state.revision || 0) + 1
    },
    changed: true
  }
}
