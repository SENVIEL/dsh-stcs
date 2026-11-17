/**
 * v3 ViewModel.
 *
 * State is the only write model. This module is the only read model: no
 * lineage repair, no collapse, no state mutation. Findings are first-class in
 * state; the UI still needs a stable per-finding verification node, so the
 * ViewModel derives one presentation node per finding (never persisted).
 */
import { V3_VERSION } from './migrate-v3.js'
import { planV4 } from './v4/plan.js'
import { latestValidationFor } from './v4/validations.js'

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value)
}

function clone(value) {
  return structuredClone(value)
}

function number(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function findingVerifyTitle(finding) {
  return `验证：${text(finding?.title).replace(/\s+/g, ' ').trim().slice(0, 78)}`
}

export function toViewModel(state, options = {}) {
  if (!state || typeof state !== 'object') throw new Error('toViewModel: state required')
  if (number(state.version) < V3_VERSION) throw new Error(`toViewModel: expected v3 state, got v${state.version}`)
  const now = number(options.now, Date.now())
  const goal = state.goal ? { ...state.goal } : null
  const directions = Array.isArray(state.directions) ? state.directions : []
  const facts = Array.isArray(state.facts) ? state.facts : []
  const assets = Array.isArray(state.assets) ? state.assets : []
  const findings = Array.isArray(state.findings) ? state.findings : []
  const evidence = Array.isArray(state.evidence) ? state.evidence : []
  const validations = Array.isArray(state.validations) ? state.validations : []
  const queue = Array.isArray(state.queue) ? state.queue : []
  const digests = Array.isArray(state.digests) ? state.digests : []
  const coverage = Array.isArray(state.coverage) ? state.coverage : []
  const goals = Array.isArray(state.goals) ? state.goals : []
  const planner = state.planner && typeof state.planner === 'object' ? state.planner : null
  const candidates = planner && Array.isArray(planner.candidates)
    ? planner.candidates.filter((candidate) => candidate && candidate.state === 'proposed')
    : []
  const configuredLimit = Number(state.settings?.workerLimit)
  const workerLimit = Number.isFinite(configuredLimit) ? Math.min(Math.max(Math.round(configuredLimit), 1), 6) : 3
  const activeWorkers = queue.filter((task) => ['queued', 'running', 'claimed'].includes(task?.state)).length
  let effectiveMustGenerate = Boolean(planner && planner.mustGenerate)
  if (!effectiveMustGenerate && goals.some((item) => item && item.state !== 'met')) {
    try {
      effectiveMustGenerate = planV4(state).mustGenerate
    } catch { /* keep the stored flag */ }
  }
  const directionIds = new Set(directions.map((direction) => direction.id))
  const nodes = []
  const edges = Array.isArray(state.edges) ? state.edges.map((edge) => ({ ...edge })) : []
  const nodeIds = new Set()
  let seq = 0

  const addNode = (node) => {
    if (!node || nodeIds.has(node.id)) return
    nodeIds.add(node.id)
    seq += 1
    nodes.push({ ...node, seq, at: number(node.at, number(node.createdAt, now)) })
  }

  for (const direction of directions) {
    addNode({
      ...direction,
      kind: 'intent',
      intentKind: direction.kind || 'recon'
    })
  }
  for (const goalItem of goals) {
    if (!goalItem || goalItem.id === 'goal-1') continue
    addNode({
      id: goalItem.id,
      kind: 'goal',
      title: goalItem.title || goalItem.id,
      detail: goalItem.criteria || '',
      state: goalItem.state || 'open',
      proofs: Array.isArray(goalItem.proofs) ? goalItem.proofs : [],
      createdAt: goalItem.createdAt
    })
  }
  const taskById = new Map(queue.map((task) => [task.id, task]))
  for (const candidate of candidates) {
    const sourceTask = candidate.source ? taskById.get(String(candidate.source)) : undefined
    const candidateParents = Array.isArray(candidate.parents) && candidate.parents.length > 0
      ? candidate.parents
      : (sourceTask?.directionId ? [sourceTask.directionId] : [])
    addNode({
      id: candidate.id,
      kind: 'intent',
      intentKind: 'proposed',
      title: `候选：${candidate.question || candidate.id}`,
      detail: candidate.reason || candidate.doneWhen || '',
      state: 'open',
      proposed: true,
      stage: candidate.stage || 'explore',
      origin: candidate.origin || candidate.source || 'planner',
      source: candidate.source || '',
      parents: candidateParents,
      createdAt: candidate.createdAt
    })
    const source = candidateParents.length > 0 ? candidateParents[0] : (goal && goal.id ? goal.id : '');
    if (source) edges.push({ id: `view-candidate-${candidate.id}`, kind: 'derived_from', sourceId: source, targetId: candidate.id, createdAt: candidate.createdAt });
  }
  for (const goalItem of goals) {
    if (!goalItem || goalItem.id === 'goal-1') continue;
    const source = goalItem.parentId || (goal && goal.id ? goal.id : '');
    if (source) edges.push({ id: `view-goal-${goalItem.id}`, kind: 'derived_from', sourceId: source, targetId: goalItem.id, createdAt: goalItem.createdAt });
  }
  if (effectiveMustGenerate) {
    addNode({
      id: 'planner-state',
      kind: 'intent',
      intentKind: 'planner',
      title: 'planner：需要生成下一方向',
      detail: `candidates=${candidates.length}; mustGenerate=true`,
      state: 'open',
      planner: true,
      createdAt: planner.lastWakeAt || now
    });
    if (goal && goal.id) edges.push({ id: 'view-planner-state', kind: 'derived_from', sourceId: goal.id, targetId: 'planner-state', createdAt: planner.lastWakeAt || now });
  }
  for (const fact of facts) {
    addNode({ ...fact, kind: 'fact' })
  }
  for (const asset of assets) {
    addNode({ ...asset, kind: 'asset' })
  }
  for (const digest of digests) {
    addNode({ ...digest, kind: 'digest' })
  }

  const viewFindings = []
  for (const finding of findings) {
    if (finding.deleted === true) continue
    const sourceDirection = finding.directionId
      ? directions.find((direction) => direction.id === finding.directionId)
      : null
    const sourceId = sourceDirection
      ? sourceDirection.id
      : (goal && goal.id ? goal.id : '')
    const validation = latestValidationFor(validations, finding.id)
    const evidenceIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds : []
    const evidenceVerified = Boolean((validation && validation.verdict === 'reproduced') || evidenceIds.length > 0)
    const lineageSourceTitle = sourceDirection
      ? text(sourceDirection.title)
      : (goal ? `目标：${text(goal.target)}` : '')
    const structuredSteps = Array.isArray(finding.steps) ? finding.steps : []
    const rawSteps = structuredSteps.map((step) => text(step?.request ?? step))
    // v4 stores steps as request strings and keeps the human explanation in
    // finding.stepNotes. Older code assumed {request,note} objects and wiped
    // the real notes to empty strings — that is why details showed "步骤 N".
    const ownNotes = Array.isArray(finding.stepNotes) ? finding.stepNotes.map(text) : []
    const stepNotes = ownNotes.some(Boolean)
      ? ownNotes
      : structuredSteps.map((step) => text(step?.note))
    const viewFinding = {
      ...finding,
      kind: 'finding',
      directionId: finding.directionId || null,
      // UI compatibility: existing client expects string steps + validation object.
      steps: rawSteps,
      reproducibleSteps: rawSteps,
      stepNotes,
      structuredSteps,
      ...(validation ? {
        validation: {
          verdict: validation.verdict,
          validator: validation.validator,
          notes: validation.notes ?? validation.note ?? '',
          evidenceRefs: Array.isArray(validation.evidenceIds)
            ? validation.evidenceIds
            : (Array.isArray(validation.evidenceRefs) ? validation.evidenceRefs : []),
          at: validation.at
        }
      } : {}),
      // Finding is a first-class node. It attaches directly to its source
      // direction (or the goal), never to a synthetic presentation verify.
      intentId: sourceId,
      lineageIntentId: sourceId,
      lineageIntentTitle: lineageSourceTitle || text(finding.title),
      lineageSourceId: sourceId,
      lineageSourceTitle: lineageSourceTitle,
      autoLineage: false,
      lineageUnbound: !sourceDirection,
      evidenceVerified,
      evidenceIds
    }
    addNode(viewFinding)
    viewFindings.push(viewFinding)
    if (sourceId !== '') {
      edges.push({
        id: `view-proves-${finding.id}`,
        kind: 'proves',
        sourceId,
        targetId: finding.id,
        createdAt: number(finding.createdAt, now)
      })
    }
  }

  const viewFacts = nodes.filter((node) => node.kind === 'fact')
  const viewAssets = nodes.filter((node) => node.kind === 'asset')
  const viewIntents = nodes.filter((node) => node.kind === 'intent')
  const outFindings = nodes.filter((node) => node.kind === 'finding')
  const outQueue = queue.map((task) => ({
    ...task,
    intentId: task.directionId || task.intentId || '',
    directionId: task.directionId || null
  }))
  const counts = {
    ...(state.counts || {}),
    intents: viewIntents.length,
    directions: directions.length,
    facts: viewFacts.length,
    findings: outFindings.length,
    assets: viewAssets.length,
    queue: outQueue.length,
    evidence: evidence.length,
    validations: validations.length,
    goals: goals.length,
    candidates: candidates.length
  }
  return {
    goal,
    nodes,
    edges,
    intents: viewIntents,
    facts: viewFacts,
    findings: outFindings,
    assets: viewAssets,
    queue: outQueue,
    digests: nodes.filter((node) => node.kind === 'digest'),
    coverage: coverage.map((item) => ({ ...item })),
    goals: goals.map((item) => ({ ...item })),
    planner: planner ? { ...planner, mustGenerate: effectiveMustGenerate, candidates: candidates.map((item) => ({ ...item })) } : null,
    settings: { ...(state.settings || {}), workerLimit },
    concurrency: { limit: workerLimit, active: activeWorkers, available: Math.max(0, workerLimit - activeWorkers) },
    evidence: evidence.map((item) => ({
      id: item.id,
      path: item.path,
      sha256: item.sha256,
      summary: item.summary
    })),
    validations: validations.map((item) => ({ ...item })),
    counts,
    revision: number(state.revision),
    sessionId: state.sessionId,
    version: V3_VERSION
  }
}

/** Snapshot-compatible payload; one full ViewModel, no incremental folding. */
export function viewModelSnapshotEvent(state) {
  const model = toViewModel(state)
  return {
    type: 'plugin:pentest/state',
    data: {
      revision: model.revision,
      state: model
    }
  }
}

/**
 * Same apply semantics as the v2 projection: a newer snapshot replaces the
 * whole ViewModel. No second lineage pass.
 */
export function applyViewModelSnapshot(previous, event) {
  if (!event || event.type !== 'plugin:pentest/state') return previous
  const value = event.data?.state
  if (!value || typeof value !== 'object') return previous
  const nextRevision = number(event.data?.revision, number(value.revision))
  const previousRevision = number(previous?.revision)
  if (nextRevision < previousRevision) return previous
  return clone({ ...value, revision: nextRevision })
}
