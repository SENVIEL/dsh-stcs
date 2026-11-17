/**
 * DSH pentest v2 — legacy migration.
 *
 * 只读旧表快照，生成一个 v2 state。不写旧表、不依赖 projection。
 * 目标：f05 这类旧会话迁移后 intent/task 数量、状态与本机 DB 完全一致。
 */

import { createState } from './state.js';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function copy(value) {
  return value === undefined ? undefined : structuredClone(value);
}

/** 旧 goal 行没有 phase 时按 active 处理；已证明/已阻塞保留。 */
function normalizeGoal(raw, now) {
  const phase = ['active', 'proven', 'blocked', 'completed'].includes(String(raw?.phase || '')) ? String(raw.phase) : 'active';
  return {
    id: String(raw?.id || 'goal-1'),
    target: String(raw?.target || ''),
    objective: String(raw?.objective || ''),
    authorization: String(raw?.authorization || ''),
    workdir: String(raw?.workdir || ''),
    phase,
    proofs: asArray(raw?.proofs).map((proof) => ({ ...proof })),
    blockedReason: raw?.blockedReason ? { ...raw.blockedReason } : undefined,
    createdAt: Number(raw?.createdAt || now),
    updatedAt: Number(raw?.updatedAt || now)
  };
}

export function migrateLegacy({ sessionId, goal, intents, facts, assets, findings, edges, digests, queue, coverage, now = Date.now() }) {
  if (!sessionId) throw new Error('migrateLegacy: sessionId required');
  const base = createState({ sessionId, target: goal?.target, objective: goal?.objective, authorization: goal?.authorization, workdir: goal?.workdir, now });
  base.goal = normalizeGoal(goal, now);

  base.intents = asArray(intents).map((intent) => ({
    ...copy(intent),
    id: String(intent.id),
    title: String(intent.title || ''),
    detail: String(intent.detail || ''),
    doneWhen: String(intent.doneWhen || ''),
    state: String(intent.state || 'open'),
    stateReason: String(intent.stateReason || ''),
    priority: Number.isFinite(intent.priority) ? intent.priority : 5,
    dependsOn: asArray(intent.dependsOn).filter((id) => typeof id === 'string' && id !== ''),
    createdAt: Number(intent.createdAt || now),
    updatedAt: Number(intent.updatedAt || intent.createdAt || now)
  }));

  base.facts = asArray(facts).map((fact) => ({
    ...copy(fact),
    id: String(fact.id),
    intentId: String(fact.intentId || ''),
    kind: String(fact.kind || 'info'),
    target: String(fact.target || ''),
    detail: String(fact.detail || ''),
    evidenceRefs: asArray(fact.evidenceRefs).filter((item) => typeof item === 'string' && item !== ''),
    createdAt: Number(fact.createdAt || now)
  }));

  base.assets = asArray(assets).map((asset) => ({
    ...copy(asset),
    id: String(asset.id),
    type: String(asset.type || 'endpoint'),
    value: String(asset.value || ''),
    meta: String(asset.meta || ''),
    inScope: asset.inScope !== false,
    createdAt: Number(asset.createdAt || now)
  }));

  base.findings = asArray(findings).map((finding) => ({
    ...copy(finding),
    id: String(finding.id),
    intentId: String(finding.intentId || ''),
    title: String(finding.title || ''),
    severity: String(finding.severity || 'medium'),
    createdAt: Number(finding.createdAt || now),
    updatedAt: Number(finding.updatedAt || finding.createdAt || now)
  }));

  base.edges = asArray(edges).map((edge) => ({
    ...copy(edge),
    id: String(edge.id),
    kind: String(edge.kind || ''),
    sourceId: String(edge.sourceId || ''),
    targetId: String(edge.targetId || '')
  }));

  base.digests = asArray(digests).map((digest) => ({ ...copy(digest), id: String(digest.id) }));
  base.coverage = asArray(coverage).map((row) => ({ ...copy(row) }));

  base.queue = asArray(queue).map((task) => ({
    ...copy(task),
    id: String(task.id),
    intentId: String(task.intentId || ''),
    title: String(task.title || ''),
    state: String(task.state || 'pending'),
    workerId: String(task.workerId || ''),
    attempts: Number(task.attempts || 0),
    maxAttempts: Number(task.maxAttempts || 3),
    priority: Number.isFinite(task.priority) ? task.priority : 5,
    leaseUntil: Number(task.leaseUntil || 0),
    payload: task.payload && typeof task.payload === 'object' ? copy(task.payload) : {},
    result: task.result ? copy(task.result) : null,
    createdAt: Number(task.createdAt || now),
    updatedAt: Number(task.updatedAt || task.createdAt || now)
  }));

  // 迁移不“修复”业务状态；只保证计数与 id 连续，避免新 id 撞旧 id。
  const maxNumber = (rows, prefix) => asArray(rows).reduce((max, row) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(String(row.id || ''));
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  base.counters = {
    goal: maxNumber([base.goal], 'goal') || 1,
    intent: maxNumber(base.intents, 'intent'),
    fact: maxNumber(base.facts, 'fact'),
    finding: maxNumber(base.findings, 'finding'),
    asset: maxNumber(base.assets, 'asset'),
    edge: maxNumber(base.edges, 'edge'),
    digest: maxNumber(base.digests, 'digest'),
    task: maxNumber(base.queue, 'task')
  };
  base.revision = 1;
  return base;
}
