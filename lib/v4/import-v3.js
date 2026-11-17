/**
 * v3 -> v4 导入器（只读源，不修改 v3）。
 *
 * 原则：先保证不丢数据，再谈语义。所有 v3 节点都有对应 v4 节点；
 * 历史 direction 即使标题是"验证: …"也保留为 legacy 方向（不删除）。
 */
import { createV4State } from './state.js';
import { inferAxes } from './axes.js';

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function stripVerifyPrefix(value) {
  return text(value).replace(/^(验证|verify)\s*[:：]\s*/i, '').trim();
}

function mapStage(kind) {
  if (kind === 'verify') return 'confirm';
  if (kind === 'exploit') return 'exploit';
  if (kind === 'report') return 'deliver';
  return 'explore';
}

function mapState(value) {
  const state = text(value);
  if (state === 'stopped') return 'blocked';
  return ['open', 'running', 'done', 'exhausted', 'blocked', 'empty'].includes(state) ? state : 'open';
}

function mapConfidence(value) {
  const raw = text(value).toLowerCase();
  return raw === 'observed' || raw === 'high' ? 'observed' : 'inferred';
}

function evidenceIdSet(source) {
  return new Set((Array.isArray(source.evidence) ? source.evidence : []).map((item) => item.id));
}

function keepEvidence(ids, known) {
  return (Array.isArray(ids) ? ids : []).filter((id) => typeof id === 'string' && known.has(id));
}

export function importV3ToV4(source, { now = Date.now() } = {}) {
  if (!source || typeof source !== 'object') throw new Error('importV3ToV4 requires a v3 state');
  const knownEvidence = evidenceIdSet(source);
  const state = createV4State({
    sessionId: text(source.sessionId),
    target: text(source.goal?.target),
    objective: text(source.goal?.objective),
    authorization: text(source.goal?.authorization),
    workdir: text(source.goal?.workdir),
    targets: Array.isArray(source.goal?.targets) ? source.goal.targets : [],
    excludedTargets: Array.isArray(source.goal?.excludedTargets) ? source.goal.excludedTargets : [],
    now
  });
  state.goal.id = text(source.goal?.id) || 'goal-1';
  state.goal.phase = text(source.goal?.phase) || 'active';
  state.goal.proofs = Array.isArray(source.goal?.proofs) ? structuredClone(source.goal.proofs) : [];

  const directionIds = new Set();
  for (const direction of (Array.isArray(source.directions) ? source.directions : [])) {
    const title = text(direction.title);
    const detail = text(direction.detail);
    const axes = inferAxes(`${title} ${detail}`);
    if (direction.kind === 'exploit' && !axes.includes('chain')) axes.push('chain');
    const mappedState = mapState(direction.state);
    const conclusionAnswer = text(direction.conclusion?.answer)
      || (mappedState === 'done' ? text(direction.stateReason) || '（v3 迁移：该方向已完成，原状态未记录结论）' : '');
    state.directions.push({
      id: text(direction.id),
      axis: axes.slice(0, 3),
      question: stripVerifyPrefix(title) || title,
      doneWhen: text(direction.doneWhen) || '有结论（fact / finding / 阴性证据）',
      stage: mapStage(direction.kind),
      state: mappedState,
      assets: Array.isArray(direction.assets) ? direction.assets.map(text).filter(Boolean) : [],
      parents: Array.isArray(direction.parents) ? direction.parents.map(text).filter(Boolean) : [],
      priority: Number.isFinite(direction.priority) ? direction.priority : 5,
      conclusion: conclusionAnswer
        ? {
            answer: conclusionAnswer,
            evidenceIds: keepEvidence(direction.conclusion?.evidenceIds, knownEvidence),
            at: Number(direction.updatedAt) || now
          }
        : null,
      legacy: true,
      legacyKind: text(direction.kind),
      createdAt: Number(direction.createdAt) || now,
      updatedAt: Number(direction.updatedAt) || Number(direction.createdAt) || now
    });
    directionIds.add(direction.id);
  }

  for (const fact of (Array.isArray(source.facts) ? source.facts : [])) {
    const directionId = text(fact.directionId || fact.intentId);
    state.facts.push({
      id: text(fact.id),
      directionId: directionIds.has(directionId) ? directionId : null,
      answer: text(fact.detail ?? fact.answer),
      confidence: mapConfidence(fact.confidence),
      evidenceIds: keepEvidence(fact.evidenceIds ?? fact.evidenceRefs, knownEvidence),
      legacy: true,
      createdAt: Number(fact.createdAt) || now
    });
  }

  for (const asset of (Array.isArray(source.assets) ? source.assets : [])) {
    state.assets.push({
      id: text(asset.id),
      type: text(asset.type),
      value: text(asset.value),
      meta: asset.meta && typeof asset.meta === 'object' ? structuredClone(asset.meta) : {},
      createdAt: Number(asset.createdAt) || now
    });
  }

  for (const evidence of (Array.isArray(source.evidence) ? source.evidence : [])) {
    state.evidence.push({
      id: text(evidence.id),
      kind: text(evidence.kind) || 'request',
      role: text(evidence.role) || 'supporting',
      sha256: text(evidence.sha256),
      path: text(evidence.path),
      summary: text(evidence.summary || evidence.request).slice(0, 300),
      legacy: true,
      createdAt: Number(evidence.createdAt) || now
    });
  }

  const validationByFinding = new Map();
  for (const validation of (Array.isArray(source.validations) ? source.validations : [])) {
    const item = {
      id: text(validation.id),
      findingId: text(validation.findingId),
      verdict: ['reproduced', 'not_reproduced', 'inconclusive'].includes(validation.verdict)
        ? validation.verdict : 'inconclusive',
      validator: text(validation.validator || 'legacy'),
      evidenceIds: keepEvidence(validation.evidenceIds ?? validation.evidenceRefs, knownEvidence),
      notes: text(validation.notes),
      legacy: true,
      at: Number(validation.at) || now
    };
    state.validations.push(item);
    validationByFinding.set(item.findingId, item.id);
  }

  for (const finding of (Array.isArray(source.findings) ? source.findings : [])) {
    const directionId = text(finding.directionId || finding.intentId);
    state.findings.push({
      id: text(finding.id),
      directionId: directionIds.has(directionId) ? directionId : null,
      claim: text(finding.title),
      severity: ['critical', 'high', 'medium', 'low', 'info'].includes(finding.severity) ? finding.severity : 'medium',
      impactProven: text(finding.impactProven) || 'none',
      evidenceIds: keepEvidence(finding.evidenceIds ?? finding.evidenceRefs, knownEvidence),
      validationId: validationByFinding.get(finding.id) || text(finding.validationId) || null,
      legacy: true,
      legacyOrphan: !directionIds.has(directionId),
      createdAt: Number(finding.createdAt) || now,
      updatedAt: Number(finding.updatedAt) || Number(finding.createdAt) || now
    });
  }

  for (const coverage of (Array.isArray(source.coverage) ? source.coverage : [])) {
    const axes = inferAxes(`${coverage.surface || ''} ${coverage.evidence || ''}`);
    const result = ['no_issue_found', 'issue_found', 'not_tested', 'blocked'].includes(coverage.outcome)
      ? coverage.outcome : 'not_tested';
    state.coverage.push({
      id: text(coverage.id) || `coverage-${state.coverage.length + 1}`,
      axis: axes[0],
      assetId: text(coverage.assetId) || null,
      result,
      note: text(coverage.evidence || coverage.surface).slice(0, 500),
      evidenceIds: [],
      legacy: true,
      createdAt: Number(coverage.createdAt) || now,
      updatedAt: Number(coverage.updatedAt) || now
    });
  }

  state.counters = {
    goal: 1,
    direction: state.directions.length,
    fact: state.facts.length,
    finding: state.findings.length,
    asset: state.assets.length,
    evidence: state.evidence.length,
    validation: state.validations.length,
    coverage: state.coverage.length,
    edge: Array.isArray(source.edges) ? source.edges.length : 0,
    task: 0
  };

  return {
    state,
    stats: {
      directions: state.directions.length,
      facts: state.facts.length,
      findings: state.findings.length,
      assets: state.assets.length,
      evidence: state.evidence.length,
      validations: state.validations.length,
      coverage: state.coverage.length,
      legacyDirections: state.directions.filter((d) => d.legacy).length,
      orphanFindings: state.findings.filter((f) => f.legacyOrphan).length,
      axes: state.directions.reduce((acc, d) => {
        for (const axis of d.axis) acc[axis] = (acc[axis] || 0) + 1;
        return acc;
      }, {})
    }
  };
}
