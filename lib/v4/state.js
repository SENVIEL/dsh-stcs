/**
 * v4 canonical state。
 *
 * 与 v3 的区别：
 * - direction 是"问题 + doneWhen"，不是"验证某事实"；
 * - finding 只是答案的一种，必须挂 evidence；
 * - validation 独立成表，confirmed 由 verdict 推导；
 * - 证据只存引用（path + sha256），不把大响应灌进状态。
 */
import { deriveAssetsFromState } from './assets.js';

export const V4_VERSION = 4;

export const DIRECTIONS_STATES = ['open', 'running', 'done', 'exhausted', 'blocked', 'empty'];
export const DIRECTION_STAGES = ['explore', 'probe', 'exploit', 'confirm', 'deliver'];
export const TERMINAL_STATES = new Set(['done', 'exhausted', 'blocked', 'empty']);
export const SEVERITIES = ['critical', 'high', 'medium', 'low'];
export const EVIDENCE_KINDS = ['request', 'response', 'file', 'log', 'screenshot'];
export const EVIDENCE_ROLES = ['baseline', 'proof', 'verification', 'supporting', 'counter'];
export const VALIDATION_VERDICTS = ['reproduced', 'not_reproduced', 'inconclusive'];
export const COVERAGE_RESULTS = ['no_issue_found', 'issue_found', 'not_tested', 'blocked'];
export const TASK_STATES = ['queued', 'running', 'done', 'failed', 'cancelled', 'unknown'];

export function createV4State({
  sessionId,
  target = '',
  objective = '',
  authorization = '',
  workdir = '',
  targets = [],
  excludedTargets = [],
  now = Date.now()
} = {}) {
  if (!sessionId) throw new Error('v4 state requires sessionId');
  const state = {
    version: V4_VERSION,
    revision: 1,
    sessionId,
    goal: {
      id: 'goal-1',
      target,
      objective,
      authorization,
      workdir,
      targets,
      excludedTargets,
      phase: 'active',
      proofs: [],
      createdAt: now,
      updatedAt: now
    },
    settings: {
      workerLimit: 6,
      // Background scheduling is opt-in. Opening or reading a session must
      // never spawn workers; only an explicit resume/autoplan turns it on.
      autoDispatch: false,
      // Auditing is separate from worker dispatch and stays on by default.
      autoAudit: true
    },
    roles: {},
    report: null,
    directions: [],
    facts: [],
    findings: [],
    goals: [],
    planner: {
      round: 0,
      lastWakeAt: 0,
      lastWakeReason: '',
      mustGenerate: false,
      candidates: []
    },
    assets: [],
    evidence: [],
    validations: [],
    coverage: [],
    queue: [],
    tasks: [],
    edges: [],
    digests: [],
    counters: {
      goal: 1, direction: 0, fact: 0, finding: 0, asset: 0,
      evidence: 0, validation: 0, coverage: 0, edge: 0, task: 0, candidate: 0
    },
    jobs: {}
  };
  state.goals.push(rootGoal(state, now));
  // Seed the canonical inventory immediately so the engagement is never
  // "goal present, assets 0". Workers/Lead can add discovered endpoints later.
  for (const item of deriveAssetsFromState(state)) {
    state.counters.asset += 1;
    state.assets.push({
      id: `asset-${state.counters.asset}`,
      type: item.type,
      value: item.value,
      meta: item.meta || 'source:goal',
      createdAt: now
    });
  }
  return state;
}

function rootGoal(state, now) {
  const goal = state.goal || {};
  const target = String(goal.target || '');
  const objective = String(goal.objective || '');
  return {
    id: 'goal-1',
    title: target ? `对 ${target} 的授权渗透测试` : (objective.slice(0, 80) || '授权渗透测试'),
    criteria: objective || '目标达成且有可复现证据',
    state: 'open',
    parentId: null,
    proofs: [],
    createdAt: now,
    updatedAt: now
  };
}

export function hasOpenWork(state) {
  const directions = Array.isArray(state?.directions) ? state.directions : [];
  const candidates = Array.isArray(state?.planner?.candidates) ? state.planner.candidates : [];
  return directions.some((item) => ['open', 'running'].includes(item?.state))
    || candidates.some((item) => item?.state === 'proposed');
}

/**
 * A completed root goal is not a license to stop while there is still open
 * work. Reopen it in place (and keep old proofs as invalidated history) so the
 * planner/sidecar can continue the same engagement instead of silently idling.
 */
export function reopenRootGoalForWork(state, reason = 'open work remains') {
  const root = (state?.goals || []).find((goal) => goal?.id === 'goal-1');
  if (!root || root.state !== 'met') return false;
  root.state = 'open';
  for (const proof of Array.isArray(root.proofs) ? root.proofs : []) {
    proof.invalidated = true;
    proof.invalidReason = reason;
  }
  root.updatedAt = Date.now();
  if (state.goal) {
    state.goal.phase = 'active';
    state.goal.updatedAt = Date.now();
  }
  return true;
}

export function ensureV4Collections(state) {
  if (!state || Number(state.version) !== V4_VERSION) return state;
  if (!Array.isArray(state.goals)) state.goals = [];
  if (state.goals.length === 0) state.goals.push(rootGoal(state, Date.now()));
  const root = state.goals.find((goal) => goal && goal.id === 'goal-1');
  if (root && typeof root.title === 'string' && root.title.length > 120) {
    const target = String(state.goal?.target || '');
    root.title = target ? `对 ${target} 的授权渗透测试` : root.title.slice(0, 80);
  }
  if (!state.planner || typeof state.planner !== 'object') {
    state.planner = { round: 0, lastWakeAt: 0, lastWakeReason: '', mustGenerate: false, candidates: [] };
  }
  if (!Array.isArray(state.planner.candidates)) state.planner.candidates = [];
  if (hasOpenWork(state)) reopenRootGoalForWork(state, 'open work remains after goal proof');
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  const limit = Number(state.settings.workerLimit);
  state.settings.workerLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.round(limit), 1), 6) : 6;
  if (!state.roles || typeof state.roles !== 'object' || Array.isArray(state.roles)) state.roles = {};
  if (!state.report || typeof state.report !== 'object' || Array.isArray(state.report)) state.report = null;
  return state;
}

export function isTerminalDirection(state) {
  return TERMINAL_STATES.has(state);
}
