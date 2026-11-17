/**
 * STCS coordinator: the ONLY task-generation entry point.
 *
 * `deriveFromBoard` is pure. Given the same canonical v4 state and the same
 * coordinator board it returns the same hypotheses / runnable set / priority
 * queue. `replayDecisions` reconstructs the board from the recorded decisions,
 * which is what makes the coordinator replayable instead of prompt-driven.
 */
import crypto from 'node:crypto';
import { AXES, AXIS_LABELS, coverageIsComplete } from '../v4/axes.js';
import { redLineReason } from '../v4/policy.js';
import { summarizeTiers } from './verdict.js';
import {
  dependenciesSatisfied,
  mergeCandidateHypotheses,
  normalizeHypothesis,
  priorityScore,
  runnableHypotheses,
  treeSummary
} from './hypothesis-tree.js';
import { normalizeTargetMap, summarizeTargetMap, syncTargetMap } from './target-map.js';
import { asArray, clamp, text } from './util.js';

const ATTACK_AXES = new Set(['surface', 'identity', 'config', 'component', 'input', 'logic', 'chain', 'credential', 'infra']);
const AUTH_TEXT_RE = /(登录|登陆|认证|会话|令牌|token|jwt|bearer|cookie|session|oauth|sso|单点|扫码|验证码|密码)/i;
const UPLOAD_TEXT_RE = /(上传|文件|导入|写入|覆盖|删除|修改|upload|file|write|import|edit|delete|update)/i;
const INFRA_TEXT_RE = /(内网|端口|服务|redis|mysql|mssql|ssh|ftp|容器|metadata|169\.254|10\.\d+\.|172\.(?:1[6-9]|2\d|3[01])\.|192\.168\.)/i;

function axisForEndpoint(endpoint) {
  const blob = `${text(endpoint?.path)} ${text(endpoint?.url)}`;
  if (/(login|sign-?in|auth|token|session|oauth|sso|user|account|admin|role|permission)/i.test(blob)) {
    return ['identity', 'logic'];
  }
  if (/(upload|file|import|export|search|query|graphql|api|json|xml)/i.test(blob)) return ['input', 'surface'];
  if (/(order|pay|cart|coupon|invite|reset|verify|bind|profile)/i.test(blob)) return ['logic'];
  if (/(debug|config|env|backup|actuator|swagger|openapi|\.git|\.svn)/i.test(blob)) return ['config'];
  return ['surface'];
}

function endpointWeight(endpoint) {
  const blob = `${text(endpoint?.path)}`;
  if (/admin|manage|root|system|internal/i.test(blob)) return 8;
  if (/user|account|order|pay|upload|file/i.test(blob)) return 5;
  return 0;
}

function endpointCandidate(endpoint, axis) {
  const method = text(endpoint?.method || 'GET').toUpperCase();
  const path = text(endpoint?.path || '/');
  const templates = {
    identity: `${method} ${path} 的认证、会话或越权边界是否可绕过？`,
    input: `${method} ${path} 的输入处理是否存在注入、上传或越界问题？`,
    logic: `${method} ${path} 是否存在可重放、跳过或篡改的业务状态缺陷？`,
    config: `${method} ${path} 是否暴露默认配置、调试信息或敏感文件？`,
    surface: `${method} ${path} 是否暴露未授权数据、隐藏参数或额外方法？`
  };
  const claim = templates[axis] || templates.surface;
  return {
    claim,
    axis: [axis],
    endpointId: endpoint?.id || '',
    source: `endpoint:${endpoint?.id || path}`,
    priorityBase: (endpoint?.tested === true ? 0 : 10) + endpointWeight(endpoint),
    reason: `targetMap endpoint ${method} ${path} is ${endpoint?.tested === true ? 'tested' : 'untested'}`
  };
}

function originOfEndpoint(endpoint) {
  const value = text(endpoint);
  const match = value.match(/^https?:\/\/[^/\s]+/i);
  if (match) return match[0].replace(/\/+$/, '').toLowerCase();
  return value.replace(/\/+$/, '').toLowerCase();
}

function authCandidate(flow) {
  const endpoint = text(flow?.endpoint) || '认证入口';
  const kind = text(flow?.kind) || 'login';
  return {
    claim: `验证 ${endpoint} 的 ${kind} 认证流是否存在弱凭据、固定会话或令牌泄露？`,
    axis: ['identity', 'credential'],
    endpointId: text(flow?.endpointId),
    source: `auth-flow:${flow?.id || kind}`,
    priorityBase: 14,
    severityWeight: 6,
    evidenceRefs: asArray(flow?.evidenceRefs),
    reason: `auth flow ${kind} on ${endpoint}`
  };
}

function factCandidates(state, targetMap) {
  const out = [];
  const endpoints = targetMap.endpoints;
  const firstUntested = endpoints.find((item) => item.tested !== true) || endpoints[0];
  for (const fact of asArray(state?.facts)) {
    if (!fact || fact.deleted === true) continue;
    const blob = `${text(fact.answer)} ${text(fact.detail)}`;
    if (!blob.trim()) continue;
    const matched = endpoints.find((item) => blob.includes(item.path)) || firstUntested;
    if (AUTH_TEXT_RE.test(blob) && matched) {
      const base = endpointCandidate(matched, 'identity');
      out.push({
        ...base,
        claim: `验证 ${matched.method} ${matched.path} 的认证/会话边界（依据事实：${text(fact.answer).slice(0, 80)}）`,
        source: `fact:${fact.id}`,
        priorityBase: 16,
        evidenceRefs: asArray(fact.evidenceIds),
        reason: 'auth-related fact'
      });
    }
    if (UPLOAD_TEXT_RE.test(blob) && matched) {
      const base = endpointCandidate(matched, 'input');
      out.push({
        ...base,
        claim: `验证 ${matched.method} ${matched.path} 的写入/上传处理（依据事实：${text(fact.answer).slice(0, 80)}）`,
        source: `fact:${fact.id}`,
        priorityBase: 15,
        evidenceRefs: asArray(fact.evidenceIds),
        reason: 'write/upload-related fact'
      });
    }
    if (INFRA_TEXT_RE.test(blob)) {
      out.push({
        claim: `验证事实「${text(fact.answer).slice(0, 90)}」对应的内网/服务暴露面与可达性`,
        axis: ['infra'],
        source: `fact:${fact.id}`,
        priorityBase: 12,
        evidenceRefs: asArray(fact.evidenceIds),
        reason: 'infra-related fact'
      });
    }
  }
  return out;
}

function findingCandidates(state, tree) {
  const out = [];
  const byDirection = new Map(asArray(tree).filter((item) => item.directionId).map((item) => [item.directionId, item]));
  for (const finding of asArray(state?.findings)) {
    if (!finding || finding.deleted === true || finding.severity === 'info') continue;
    if (!['read', 'write'].includes(text(finding.impactProven))) continue;
    if (text(finding.impactProven) === 'write') continue;
    const parent = byDirection.get(text(finding.directionId));
    out.push({
      claim: `已确认「${text(finding.claim).slice(0, 90)}」的读取影响，验证能否升级为写入、执行或扩大影响范围`,
      axis: ['chain'],
      dependsOn: parent ? [parent.id] : [],
      source: `finding:${finding.id}`,
      priorityBase: 18,
      severityWeight: finding.severity === 'critical' ? 14 : finding.severity === 'high' ? 10 : 4,
      evidenceRefs: asArray(finding.evidenceIds),
      reason: 'confirmed read impact can be escalated'
    });
  }
  return out;
}

function appCandidates(targetMap, limit = 4) {
  const out = [];
  const groups = new Map();
  for (const app of asArray(targetMap?.apps)) {
    const value = text(app.value);
    if (!value) continue;
    let origin = value;
    try {
      origin = new URL(/^https?:\/\//i.test(value) ? value : `http://${value}`).origin;
    } catch {
      origin = value.replace(/\/+$/, '');
    }
    if (!groups.has(origin)) groups.set(origin, []);
    groups.get(origin).push(value);
  }
  for (const [origin, values] of groups) {
    const unique = [...new Set(values.map((value) => value.replace(/\/+$/, '')))];
    // Authentication, configuration and infrastructure surfaces are properties
    // of the ORIGIN: `https://host` and `https://host/login` must not produce
    // two copies of the same question. Surface enumeration stays per path.
    out.push(
      {
        claim: `${origin} 的登录/会话入口（含根路径与登录页）是否存在弱凭据、固定会话或认证绕过？`,
        axis: ['identity', 'credential'],
        source: `app:${origin}:auth`,
        priorityBase: 7,
        severityWeight: 4,
        reason: 'initial app authentication surface'
      },
      {
        claim: `${origin} 是否暴露默认配置、调试端点、备份文件或错误回显？`,
        axis: ['config'],
        source: `app:${origin}:config`,
        priorityBase: 6,
        reason: 'initial app configuration surface'
      },
      {
        claim: `${origin} 的端口、服务指纹和响应头是否暴露可利用的基础设施信息？`,
        axis: ['infra'],
        source: `app:${origin}:infra`,
        priorityBase: 5,
        reason: 'initial app infrastructure surface'
      }
    );
    for (const value of unique) {
      out.push({
        claim: `${value} 的首页、JS bundle、robots/sitemap 里还有哪些未枚举的具体入口和参数？`,
        axis: ['surface'],
        source: `app:${value}`,
        priorityBase: 8,
        reason: 'initial app surface enumeration'
      });
    }
    if (out.length >= limit) break;
  }
  return out.slice(0, Math.max(0, Number(limit) || 0));
}

function coverageCandidates(state, targetMap) {
  const covered = new Set(asArray(state?.coverage).filter(coverageIsComplete).map((item) => item.axis));
  const gaps = AXES.filter((axis) => ATTACK_AXES.has(axis) && !covered.has(axis));
  if (gaps.length === 0) return [];
  const endpoint = targetMap.endpoints.find((item) => item.tested !== true) || targetMap.endpoints[0];
  return gaps.slice(0, 2).map((axis) => {
    if (endpoint) {
      return {
        ...endpointCandidate(endpoint, axis === 'credential' ? 'identity' : axis),
        claim: `${AXIS_LABELS[axis] || axis}：${endpoint.method} ${endpoint.path} 还有哪些未覆盖的具体攻击面？`,
        axis: [axis],
        source: `coverage-gap:${axis}`,
        priorityBase: 8,
        reason: `coverage gap ${axis}`
      };
    }
    return {
      claim: `${text(state?.goal?.target || '目标')} 的 ${AXIS_LABELS[axis] || axis} 轴还有哪些未枚举的具体入口或参数？`,
      axis: [axis],
      source: `coverage-gap:${axis}`,
      priorityBase: 6,
      reason: `coverage gap ${axis}; no endpoint in target map yet`
    };
  });
}

export function normalizeBoard(board) {
  const source = board && typeof board === 'object' && !Array.isArray(board) ? board : {};
  return {
    version: 1,
    revision: Number(source.revision) || 1,
    sessionId: text(source.sessionId),
    round: Number(source.round) || 0,
    targetMap: normalizeTargetMap(source.targetMap),
    hypothesisTree: asArray(source.hypothesisTree).map((item) => normalizeHypothesis(item)),
    priorityQueue: asArray(source.priorityQueue),
    decisions: asArray(source.decisions),
    debrief: source.debrief && typeof source.debrief === 'object' ? source.debrief : null,
    nativeGoalSeen: source.nativeGoalSeen === true,
    lastWakeAt: Number(source.lastWakeAt) || 0,
    lastDispatchAt: Number(source.lastDispatchAt) || 0,
    lastPlannerAt: Number(source.lastPlannerAt) || 0,
    lastPlannerSignature: text(source.lastPlannerSignature),
    plannerRound: Number(source.plannerRound) || 0,
    plannerEmptyRounds: Number(source.plannerEmptyRounds) || 0,
    plannerError: text(source.plannerError),
    plannerAttempts: Number(source.plannerAttempts) || 0,
    plannerDegraded: source.plannerDegraded === true,
    plannerStalled: source.plannerStalled === true,
    plannerTodos: asArray(source.plannerTodos),
    plannerLastDurationMs: Number(source.plannerLastDurationMs) || 0,
    plannerModel: text(source.plannerModel)
  };
}

export function emptyBoard(sessionId = '') {
  return normalizeBoard({ sessionId, revision: 1, round: 0 });
}

export function buildDebrief({ state, board, now = Date.now(), round = 0 }) {
  const tiers = summarizeTiers(state);
  const map = summarizeTargetMap(board?.targetMap);
  const covered = new Set(asArray(state?.coverage).filter(coverageIsComplete).map((item) => item.axis));
  const coverageGaps = AXES.filter((axis) => ATTACK_AXES.has(axis) && !covered.has(axis));
  const activeWorkers = asArray(state?.tasks).filter((task) => ['queued', 'running'].includes(task?.state)).length;
  const facts = asArray(state?.facts).filter((item) => item && item.deleted !== true).length;
  const findings = asArray(state?.findings).filter((item) => item && item.deleted !== true && item.severity !== 'info').length;
  return {
    round: Number(round) || 0,
    at: Number(now) || Date.now(),
    stateRevision: Number(state?.revision) || 0,
    phase: text(state?.goal?.phase),
    target: text(state?.goal?.target),
    facts,
    findings,
    confirmed: tiers.confirmed_deterministic + tiers.confirmed_reproduced,
    preview: tiers.preview,
    pendingAudit: tiers.pendingAudit,
    assets: asArray(state?.assets).length,
    endpoints: map.endpoints,
    untestedEndpoints: map.untestedEndpoints,
    coverageGaps,
    activeWorkers,
    planner: {
      round: Number(board?.plannerRound) || 0,
      attempts: Number(board?.plannerAttempts) || 0,
      degraded: board?.plannerDegraded === true,
      lastDurationMs: Number(board?.plannerLastDurationMs) || 0
    },
    note: `round ${round}: ${map.endpoints} endpoints, ${facts} facts, ${findings} findings, ${activeWorkers} workers`
  };
}

/**
 * The single task-generation entry point.
 *
 * @returns {{
 *   targetMap: object, hypothesisTree: object[], priorityQueue: object[],
 *   runnable: object[], created: object[], debrief: object
 * }}
 */
export function deriveFromBoard({ state, board, now = Date.now(), maxHypotheses = 240, candidateOnly = false, generateCandidates = true } = {}) {
  const base = normalizeBoard(board);
  const targetMap = syncTargetMap(base.targetMap, state, now);
  const candidates = [];

  if (generateCandidates) {
  // One auth-flow hypothesis per origin+kind; `/` and `/login` used to produce
  // separate token/login/cookie variants that filled every worker slot.
  const seenAuthFlows = new Set();
  for (const flow of targetMap.authFlows) {
    const key = `${originOfEndpoint(flow.endpoint)}|${text(flow.kind)}`;
    if (seenAuthFlows.has(key)) continue;
    seenAuthFlows.add(key);
    candidates.push(authCandidate(flow));
  }
  for (const endpoint of targetMap.endpoints) {
    for (const axis of axisForEndpoint(endpoint)) candidates.push(endpointCandidate(endpoint, axis));
  }
  const appSlots = Math.max(0, 6 - targetMap.endpoints.length);
  if (appSlots > 0) candidates.push(...appCandidates(targetMap, appSlots));
  candidates.push(...factCandidates(state, targetMap));
  candidates.push(...findingCandidates(state, base.hypothesisTree));
  for (const gap of coverageCandidates(state, targetMap)) {
    const represented = candidates.some((item) => asArray(item.axis).some((axis) => asArray(gap.axis).includes(axis)));
    if (!represented) candidates.push(gap);
  }
  if (candidates.length === 0) candidates.push(...coverageCandidates(state, targetMap));
  }

  // Red-line hypotheses are retained as blocked evidence, never dispatched.
  for (const candidate of candidates) {
    const reason = redLineReason(`${text(candidate.claim)} ${text(candidate.reason)}`);
    if (reason) {
      candidate.status = 'blocked';
      candidate.reason = `red-line: ${reason}`;
    } else if (candidateOnly) {
      candidate.status = 'candidate';
    }
  }

  const hypothesisTree = mergeCandidateHypotheses(base.hypothesisTree, candidates, now, maxHypotheses);
  const runnable = runnableHypotheses(hypothesisTree);
  const priorityQueue = hypothesisTree
    .filter((item) => !['done', 'blocked'].includes(item.status))
    .slice()
    .sort((a, b) => (Number(b.priority) || 0) - (Number(a.priority) || 0) || a.id.localeCompare(b.id))
    .slice(0, 40)
    .map((item) => ({
      hypothesisId: item.id,
      claim: item.claim,
      axis: item.axis,
      status: item.status,
      priority: item.priority,
      dependsOn: item.dependsOn
    }));

  const treeIds = new Set(hypothesisTree.map((item) => item.id));
  const created = hypothesisTree.filter((item) => !base.hypothesisTree.some((old) => old.id === item.id));
  const debrief = buildDebrief({ state, board: { ...base, targetMap }, now, round: base.round });

  return {
    targetMap,
    hypothesisTree,
    priorityQueue,
    runnable: runnable.filter((item) => treeIds.has(item.id)),
    created,
    candidates: hypothesisTree.filter((item) => item.status === 'candidate'),
    debrief
  };
}

/** Record the exact inputs that produced a decision. Keeps decisions replayable. */
export function makeDecision({
  action,
  hypothesisId = '',
  directionId = '',
  taskId = '',
  reason = '',
  hypothesis = null,
  status = '',
  evidenceRefs = [],
  stateRevision = 0,
  boardRevision = 0,
  inputs = {},
  now = Date.now(),
  round = 0,
  seq = 0
} = {}) {
  return {
    seq: Number(seq) || 0,
    at: Number(now) || Date.now(),
    round: Number(round) || 0,
    action: text(action),
    hypothesisId: text(hypothesisId),
    directionId: text(directionId),
    taskId: text(taskId),
    status: text(status),
    evidenceRefs: asArray(evidenceRefs).map((item) => text(item)).filter(Boolean),
    reason: text(reason),
    stateRevision: Number(stateRevision) || 0,
    boardRevision: Number(boardRevision) || 0,
    inputs: inputs && typeof inputs === 'object' ? inputs : {},
    hypothesis: hypothesis ? normalizeHypothesis(hypothesis, now) : null
  };
}

/**
 * Replay recorded decisions onto a board. This is intentionally a small,
 * explicit state machine so a test can compare the replayed runnable set with
 * the live one after a restart.
 */
export function replayDecisions(initialBoard, decisions, now = Date.now()) {
  let board = normalizeBoard(initialBoard);
  let tree = asArray(board.hypothesisTree).map((item) => normalizeHypothesis(item, now));
  for (const decision of asArray(decisions)) {
    if (!decision || typeof decision !== 'object') continue;
    if (decision.action === 'create_hypothesis' && decision.hypothesis) {
      tree = mergeCandidateHypotheses(tree, [decision.hypothesis], now, 10000);
    }
    if (decision.action === 'promote_direction' && decision.hypothesisId) {
      const node = tree.find((item) => item.id === decision.hypothesisId);
      if (node) {
        node.status = 'running';
        node.directionId = text(decision.directionId);
        node.updatedAt = now;
      }
    }
    if (decision.action === 'dispatch' && decision.hypothesisId) {
      const node = tree.find((item) => item.id === decision.hypothesisId);
      if (node) {
        node.taskId = text(decision.taskId);
        node.updatedAt = now;
      }
    }
    if (decision.action === 'complete_hypothesis' && decision.hypothesisId) {
      const node = tree.find((item) => item.id === decision.hypothesisId);
      if (node) {
        node.status = decision.status === 'blocked' ? 'blocked' : 'done';
        node.reason = text(decision.reason);
        node.completedAt = now;
        for (const ref of asArray(decision.evidenceRefs)) if (ref && !node.evidenceRefs.includes(ref)) node.evidenceRefs.push(ref);
        node.updatedAt = now;
      }
    }
  }
  const byId = new Map(tree.map((item) => [item.id, item]));
  for (const node of tree) {
    if (['done', 'blocked', 'running'].includes(node.status)) continue;
    node.status = dependenciesSatisfied(node, byId) ? 'runnable' : 'pending';
    node.priority = priorityScore(node);
  }
  board = { ...board, hypothesisTree: tree };
  return board;
}

export function decisionDigest(decisions) {
  return crypto.createHash('sha256').update(JSON.stringify(asArray(decisions))).digest('hex');
}

export function boardSummary(board) {
  const normalized = normalizeBoard(board);
  return {
    revision: normalized.revision,
    round: normalized.round,
    targetMap: summarizeTargetMap(normalized.targetMap),
    tree: treeSummary(normalized.hypothesisTree),
    priorityQueue: normalized.priorityQueue.slice(0, 12),
    decisions: normalized.decisions.length,
    debrief: normalized.debrief,
    lastWakeAt: normalized.lastWakeAt,
    lastDispatchAt: normalized.lastDispatchAt,
    planner: {
      round: normalized.plannerRound,
      emptyRounds: normalized.plannerEmptyRounds,
      lastAt: normalized.lastPlannerAt,
      lastSignature: normalized.lastPlannerSignature,
      error: normalized.plannerError,
      attempts: normalized.plannerAttempts,
      degraded: normalized.plannerDegraded,
      lastDurationMs: normalized.plannerLastDurationMs,
      model: normalized.plannerModel
    }
  };
}

export function nextDecisionSeq(decisions) {
  return asArray(decisions).reduce((max, item) => Math.max(max, Number(item?.seq) || 0), 0) + 1;
}

function decisionKey(decision) {
  return [
    Number(decision?.seq) || 0,
    Number(decision?.at) || 0,
    text(decision?.action),
    text(decision?.hypothesisId),
    text(decision?.directionId),
    text(decision?.taskId)
  ].join('|');
}

const STATUS_RANK = { pending: 0, runnable: 1, running: 2, done: 3, blocked: 3 };

/**
 * Merge two board snapshots without losing a worker commit that landed while a
 * tick was dispatching. CoordinatorStore serializes writes, but a caller can
 * still hold an older read; this merge is the read-modify-write reconciliation.
 */
export function mergeBoards(current, incoming) {
  const a = normalizeBoard(current);
  const b = normalizeBoard(incoming);
  const decisionMap = new Map();
  for (const item of [...a.decisions, ...b.decisions]) {
    if (!item) continue;
    const key = decisionKey(item);
    const previous = decisionMap.get(key);
    if (!previous || (Number(item.at) || 0) >= (Number(previous.at) || 0)) decisionMap.set(key, item);
  }
  const decisions = [...decisionMap.values()]
    .sort((left, right) => (Number(left.seq) || 0) - (Number(right.seq) || 0) || (Number(left.at) || 0) - (Number(right.at) || 0));

  const treeMap = new Map();
  for (const node of [...a.hypothesisTree, ...b.hypothesisTree]) {
    if (!node?.id) continue;
    const previous = treeMap.get(node.id);
    if (!previous) {
      treeMap.set(node.id, node);
      continue;
    }
    const newer = (Number(node.updatedAt) || 0) >= (Number(previous.updatedAt) || 0) ? node : previous;
    const older = newer === node ? previous : node;
    const merged = { ...older, ...newer };
    merged.createdAt = Math.min(Number(older.createdAt) || 0, Number(newer.createdAt) || 0) || newer.createdAt;
    merged.evidenceRefs = [...new Set([...(older.evidenceRefs || []), ...(newer.evidenceRefs || [])])];
    if ((STATUS_RANK[newer.status] || 0) < (STATUS_RANK[older.status] || 0)) merged.status = older.status;
    if (!merged.directionId) merged.directionId = older.directionId || newer.directionId;
    if (!merged.taskId) merged.taskId = older.taskId || newer.taskId;
    treeMap.set(node.id, merged);
  }

  const targetMap = (Number(b.targetMap?.updatedAt) || 0) >= (Number(a.targetMap?.updatedAt) || 0)
    ? b.targetMap : a.targetMap;
  const debrief = (Number(b.debrief?.at) || 0) >= (Number(a.debrief?.at) || 0) ? b.debrief : a.debrief;
  return normalizeBoard({
    ...a,
    ...b,
    round: Math.max(a.round, b.round),
    revision: Math.max(a.revision, b.revision),
    nativeGoalSeen: a.nativeGoalSeen === true || b.nativeGoalSeen === true,
    targetMap,
    hypothesisTree: [...treeMap.values()],
    priorityQueue: b.priorityQueue.length >= a.priorityQueue.length ? b.priorityQueue : a.priorityQueue,
    decisions,
    debrief,
    lastWakeAt: Math.max(a.lastWakeAt, b.lastWakeAt),
    lastDispatchAt: Math.max(a.lastDispatchAt, b.lastDispatchAt)
  });
}

export function bumpRound(board, now = Date.now()) {
  const normalized = normalizeBoard(board);
  return {
    ...normalized,
    round: normalized.round + 1,
    revision: normalized.revision + 1,
    lastWakeAt: Number(now) || Date.now()
  };
}

export function clampWorkerLimit(value) {
  return clamp(value, 1, 6);
}
