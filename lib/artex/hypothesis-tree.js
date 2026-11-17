/**
 * STCS attack-hypothesis tree.
 *
 * A node is a single testable question. Edges are `dependsOn`: the coordinator
 * may only dispatch a node after every parent is done AND has evidence.
 * The tree is pure data; all state changes are returned as new arrays.
 */
import { asArray, stableId, text } from './util.js';

export const HYPOTHESIS_STATUS = ['candidate', 'pending', 'runnable', 'running', 'done', 'blocked'];
export const TERMINAL_HYPOTHESIS_STATUS = new Set(['done', 'blocked']);

const AXIS_WEIGHT = {
  chain: 24,
  credential: 22,
  identity: 20,
  input: 19,
  logic: 18,
  config: 15,
  component: 14,
  surface: 12,
  infra: 9,
  evidence: 4,
  cleanup: 2,
  deliver: 1
};

function axisWeight(axis) {
  const list = asArray(axis);
  if (list.length === 0) return 5;
  return Math.max(...list.map((item) => AXIS_WEIGHT[item] ?? 5));
}

export function priorityScore(hypothesis) {
  const base = Number(hypothesis?.priorityBase) || 0;
  const severity = Number(hypothesis?.severityWeight) || 0;
  const depPenalty = asArray(hypothesis?.dependsOn).length * 2;
  return Math.round((axisWeight(hypothesis?.axis) + base + severity - depPenalty) * 100) / 100;
}

export function hypothesisKey(hypothesis) {
  const axis = asArray(hypothesis?.axis).slice().sort().join(',');
  const endpoint = text(hypothesis?.endpointId);
  // `http://host:4444` and `http://host:4444/` are the same target; a claim
  // that differs only by that slash must not become a second hypothesis.
  const claim = text(hypothesis?.claim).toLowerCase().replace(/\s+/g, ' ').replace(/\/+(?=\s|$)/g, '').trim();
  return `${axis}|${endpoint}|${claim}`;
}

export function emptyHypothesis(fields = {}, now = Date.now()) {
  const toList = (value) => Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]);
  const axis = toList(fields.axis).map((item) => text(item)).filter(Boolean);
  const claim = text(fields.claim).trim();
  const base = {
    id: text(fields.id) || stableId('hyp', hypothesisKey({ ...fields, claim, axis })),
    claim,
    axis,
    dependsOn: toList(fields.dependsOn).map((item) => text(item)).filter(Boolean),
    status: HYPOTHESIS_STATUS.includes(fields.status) ? fields.status : 'pending',
    priority: 0,
    priorityBase: Number(fields.priorityBase) || 0,
    severityWeight: Number(fields.severityWeight) || 0,
    directionId: text(fields.directionId),
    taskId: text(fields.taskId),
    evidenceRefs: toList(fields.evidenceRefs).map((item) => text(item)).filter(Boolean),
    endpointId: text(fields.endpointId),
    source: text(fields.source),
    reason: text(fields.reason),
    createdAt: Number(fields.createdAt) || now,
    updatedAt: Number(fields.updatedAt) || now,
    completedAt: Number(fields.completedAt) || 0
  };
  base.priority = priorityScore(base);
  return base;
}

export function normalizeHypothesis(hypothesis, now = Date.now()) {
  return emptyHypothesis(hypothesis, now);
}

export function dependenciesSatisfied(hypothesis, byId) {
  const deps = asArray(hypothesis?.dependsOn);
  if (deps.length === 0) return true;
  return deps.every((id) => {
    const parent = byId.get(id);
    if (!parent || parent.status !== 'done') return false;
    // A dependency without evidence is a guess, not a satisfied prerequisite.
    return asArray(parent.evidenceRefs).length > 0 || parent.reason === 'negative-result';
  });
}

function refreshStatuses(nodes, now) {
  const byId = new Map(nodes.map((item) => [item.id, item]));
  for (const node of nodes) {
    if (node.status === 'candidate' || node.status === 'running' || node.status === 'done' || node.status === 'blocked') continue;
    node.status = dependenciesSatisfied(node, byId) ? 'runnable' : 'pending';
    node.updatedAt = now;
    node.priority = priorityScore(node);
  }
  return nodes;
}

function prune(nodes, max) {
  if (nodes.length <= max) return nodes;
  const keep = [];
  const terminal = [];
  for (const node of nodes) {
    if (TERMINAL_HYPOTHESIS_STATUS.has(node.status) && !node.directionId) terminal.push(node);
    else keep.push(node);
  }
  const room = Math.max(0, max - keep.length);
  const keptTerminal = terminal
    .slice()
    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0))
    .slice(0, room);
  return [...keep, ...keptTerminal];
}

/**
 * Merge newly derived candidates into the existing tree without losing the
 * identity of nodes already promoted to a direction/task.
 */
export function mergeCandidateHypotheses(existing, candidates, now = Date.now(), max = 240) {
  const nodes = asArray(existing).map((item) => normalizeHypothesis(item, now));
  const byKey = new Map(nodes.map((item) => [hypothesisKey(item), item]));
  for (const raw of asArray(candidates)) {
    const candidate = emptyHypothesis(raw, now);
    if (!candidate.claim) continue;
    const key = hypothesisKey(candidate);
    const current = byKey.get(key);
    if (current) {
      current.claim = candidate.claim;
      current.axis = candidate.axis.length > 0 ? candidate.axis : current.axis;
      current.priorityBase = Math.max(Number(current.priorityBase) || 0, Number(candidate.priorityBase) || 0);
      current.severityWeight = Math.max(Number(current.severityWeight) || 0, Number(candidate.severityWeight) || 0);
      current.endpointId = candidate.endpointId || current.endpointId;
      current.source = candidate.source || current.source;
      current.reason = candidate.reason || current.reason;
      if (candidate.status === 'blocked') current.status = 'blocked';
      else if (current.status === 'candidate' && candidate.status === 'runnable') current.status = 'runnable';
      if (candidate.directionId) current.directionId = candidate.directionId;
      for (const id of candidate.dependsOn) if (!current.dependsOn.includes(id)) current.dependsOn.push(id);
      for (const ref of candidate.evidenceRefs) if (!current.evidenceRefs.includes(ref)) current.evidenceRefs.push(ref);
      current.updatedAt = now;
    } else {
      const created = candidate;
      byKey.set(key, created);
      nodes.push(created);
    }
  }
  return prune(refreshStatuses(nodes, now), Math.max(20, Number(max) || 240));
}

export function markRunning(existing, hypothesisId, directionId, now = Date.now()) {
  const nodes = asArray(existing).map((item) => normalizeHypothesis(item, now));
  const node = nodes.find((item) => item.id === hypothesisId);
  if (node) {
    node.status = 'running';
    node.directionId = text(directionId) || node.directionId;
    node.updatedAt = now;
  }
  return nodes;
}

export function markDirectionOutcome(existing, directionId, directionState, options = {}) {
  const now = Number(options.now) || Date.now();
  const nodes = asArray(existing).map((item) => normalizeHypothesis(item, now));
  const node = nodes.find((item) => item.directionId === text(directionId));
  if (!node) return nodes;
  const state = text(directionState);
  if (state === 'done' || state === 'exhausted' || state === 'empty') {
    node.status = 'done';
    node.completedAt = now;
    if (state !== 'done' || asArray(options.evidenceRefs).length === 0) node.reason = 'negative-result';
  } else if (state === 'blocked') {
    node.status = 'blocked';
    node.completedAt = now;
  }
  for (const ref of asArray(options.evidenceRefs)) if (ref && !node.evidenceRefs.includes(ref)) node.evidenceRefs.push(ref);
  for (const id of asArray(options.findingIds)) {
    const ref = `finding:${text(id)}`;
    if (id && !node.evidenceRefs.includes(ref)) node.evidenceRefs.push(ref);
  }
  node.updatedAt = now;
  return refreshStatuses(nodes, now);
}

export function runnableHypotheses(existing) {
  return asArray(existing)
    .map((item) => normalizeHypothesis(item))
    .filter((item) => item.status === 'runnable')
    .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || a.id.localeCompare(b.id));
}

export function treeSummary(existing) {
  const nodes = asArray(existing);
  const counts = { candidate: 0, pending: 0, runnable: 0, running: 0, done: 0, blocked: 0 };
  for (const node of nodes) counts[node.status] = (counts[node.status] || 0) + 1;
  return {
    total: nodes.length,
    ...counts,
    top: nodes
      .slice()
      .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0))
      .slice(0, 12)
      .map((node) => ({
        id: node.id,
        claim: node.claim,
        axis: node.axis,
        status: node.status,
        priority: node.priority,
        dependsOn: node.dependsOn,
        directionId: node.directionId
      }))
  };
}
