/**
 * v4 reducer：纯函数，输入 state + command，输出新 state。
 *
 * 命令族：goal / direction / fact / asset / evidence / finding / validation / coverage
 * 每次命令 revision + 1；任何校验失败抛错且不产生新 state。
 */
import { AXES, inferAxes, normalizeAxes } from './axes.js';
import { ASSET_TYPES, normalizeAssetType } from './assets.js';
import {
  V4_VERSION, DIRECTIONS_STATES, DIRECTION_STAGES, TERMINAL_STATES,
  SEVERITIES, EVIDENCE_KINDS, EVIDENCE_ROLES, VALIDATION_VERDICTS, COVERAGE_RESULTS,
  ensureV4Collections, hasOpenWork, reopenRootGoalForWork
} from './state.js';
import { evidenceVersion } from './evidence-version.js';
import { buildCheckpoint } from './checkpoint.js';

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

const VERIFICATION_LEVELS = ['source_only', 'local_harness', 'live_readonly', 'live_state_change', 'confirmed'];

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function shortTitle(value, max = 88) {
  const first = text(value).split(/[\n。！？!?]/)[0].replace(/\s+/g, ' ').trim();
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

function normalize(value) {
  return text(value).replace(/\s+/g, ' ').trim();
}

const UNRESOLVED_PROOF_RE = /(未验证|未测试|不能作为|待验证|不构成结论|not[_\s-]?tested|unverified|inconclusive)/i;

/** 去掉标点/空白/常见前缀后比较，用于识别"事实复述成方向"。 */
function comparable(value) {
  return normalize(value)
    .replace(/^(验证|verify)\s*[:：]\s*/i, '')
    .replace(/[\s，。；：、,.;:!?！？"'“”‘’()（）[\]【】<>《》]/g, '')
    .toLowerCase();
}

function nextId(state, kind) {
  state.counters[kind] = (Number(state.counters[kind]) || 0) + 1;
  return `${kind}-${state.counters[kind]}`;
}

function findById(list, id, code, label) {
  const item = (list || []).find((entry) => entry.id === id);
  if (!item) fail(code, `unknown ${label} ${id}`);
  return item;
}

function assertTransition(from, to) {
  if (!DIRECTIONS_STATES.includes(to)) fail('direction/state', `unknown direction state ${to}`);
  if (TERMINAL_STATES.has(from)) fail('direction/terminal', `direction is already ${from}`);
  if (from === 'open' && ['running', 'done', 'exhausted', 'blocked', 'empty'].includes(to)) return;
  if (from === 'running' && ['done', 'exhausted', 'blocked'].includes(to)) return;
  if (from === 'running' && to === 'open') return;
  if (from === 'blocked' && to === 'open') return;
  fail('direction/transition', `illegal transition ${from} -> ${to}`);
}

function normalizeConfidence(value) {
  const raw = normalize(value).toLowerCase();
  if (raw === 'observed' || raw === 'high') return 'observed';
  if (raw === 'inferred' || raw === 'medium' || raw === 'low' || raw === '') return 'inferred';
  fail('fact/confidence', `unknown confidence ${value}`);
}

function assertEvidenceIds(state, ids, code) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  for (const id of list) findById(state.evidence, id, code, 'evidence');
  return list;
}

function applyGoal(state, cmd) {
  const goal = state.goal;
  if (cmd.op === 'set') {
    for (const key of ['target', 'objective', 'authorization', 'workdir']) {
      if (cmd[key] !== undefined) goal[key] = text(cmd[key]);
    }
    for (const key of ['targets', 'excludedTargets']) {
      if (Array.isArray(cmd[key])) goal[key] = cmd[key].map(text).filter(Boolean);
    }
    goal.updatedAt = cmd.now;
    return;
  }
  if (cmd.op === 'add') {
    const title = normalize(cmd.title ?? cmd.question);
    if (!title) fail('goal/title', 'goal title required');
    const parentId = normalize(cmd.parentId) || null;
    if (parentId) findById(state.goals, parentId, 'goal/parent', 'goal');
    const item = {
      id: nextId(state, 'goal'),
      title,
      criteria: normalize(cmd.criteria) || title,
      state: 'open',
      parentId,
      proofs: [],
      createdAt: cmd.now,
      updatedAt: cmd.now
    };
    state.goals.push(item);
    return;
  }
  if (cmd.op === 'prove') {
    const target = findById(state.goals, cmd.goalId, 'goal/not-found', 'goal');
    const selector = normalize(cmd.evidenceId);
    const finding = (state.findings || []).find((item) => item.id === selector && item.deleted !== true);
    const fact = finding ? undefined : (state.facts || []).find((item) => item.id === selector);
    if (!finding && !fact) fail('goal/evidence', 'goal proof must reference an existing fact or finding');
    // goal.proofs.evidenceId is an evidence id, never a fact/finding id.
    // Keep the fact/finding identity in its own field so the proof remains
    // auditable without overloading evidence semantics.
    const proofEvidenceIds = Array.isArray(finding ? finding.evidenceIds : fact.evidenceIds)
      ? (finding ? finding.evidenceIds : fact.evidenceIds).filter(Boolean)
      : [];
    if (proofEvidenceIds.length === 0) {
      fail('goal/evidence', 'goal proof requires an evidence-backed fact or finding');
    }
    const objectiveProof = Boolean(finding
      && ['critical', 'high'].includes(finding.severity)
      && finding.impactProven === 'rce');
    if (target.id === 'goal-1' && hasOpenWork(state) && !objectiveProof) {
      fail('goal/open-work', 'root goal cannot be proven while directions or proposed candidates remain open');
    }
    if (target.id === 'goal-1' && objectiveProof) {
      // A validated root RCE is the objective. Do not keep the proof hostage
      // to low-value exploratory directions; close them as blocked with the
      // proof finding recorded so the report can explain why work stopped.
      for (const direction of state.directions || []) {
        if (!['open', 'running'].includes(direction.state)) continue;
        direction.state = 'blocked';
        direction.conclusion = {
          ...(direction.conclusion || {}),
          answer: `目标已由 finding ${finding.id} 的 RCE 证明；剩余方向停止，避免继续消耗 worker。`
        };
        direction.updatedAt = cmd.now;
      }
      for (const candidate of state.planner?.candidates || []) {
        if (candidate.state !== 'proposed') continue;
        candidate.state = 'blocked';
        candidate.updatedAt = cmd.now;
      }
    }
    if (target.id === 'goal-1' && fact) {
      const proofText = `${fact.answer || ''} ${cmd.reason || ''}`;
      if (fact.confidence !== 'observed' || UNRESOLVED_PROOF_RE.test(proofText)) {
        fail('goal/unverified', 'root goal proof fact must be observed and must not be an unresolved conclusion');
      }
    }
    if (target.state === 'met') fail('goal/met', 'goal is already met');
    target.state = 'met';
    target.proofs.push({
      evidenceId: proofEvidenceIds[0],
      ...(finding ? { findingId: finding.id } : { factId: fact.id }),
      reason: normalize(cmd.reason),
      at: cmd.now
    });
    target.updatedAt = cmd.now;
    if (target.id === 'goal-1') goal.proofs = target.proofs;
    if (state.goals.every((item) => item.state === 'met')) goal.phase = 'done';
    goal.updatedAt = cmd.now;
    refreshPlannerWake(state, `goal-proved:${target.id}`, cmd.now);
    return;
  }
  if (cmd.op === 'pause') { goal.phase = 'paused'; goal.updatedAt = cmd.now; return; }
  if (cmd.op === 'resume') { goal.phase = 'active'; goal.updatedAt = cmd.now; return; }
  if (cmd.op === 'block') { goal.phase = 'blocked'; goal.updatedAt = cmd.now; return; }
  fail('goal/op', `unknown goal op ${cmd.op}`);
}

function applyDirection(state, cmd) {
  if (cmd.op === 'add') {
    let axes = normalizeAxes(cmd.axis ?? cmd.axes);
    if (axes.length === 0) axes = inferAxes(cmd.question ?? cmd.title);
    if (axes.length === 0) fail('direction/axis', `axis required, one of: ${AXES.join(', ')}`);
    const question = normalize(cmd.question ?? cmd.title);
    if (!question) fail('direction/question', 'question required');
    if (/^(验证|verify)\s*[:：]/i.test(question)) {
      fail('direction/question', 'question must be an open question, not "验证: <a known fact>"');
    }
    const doneWhen = normalize(cmd.doneWhen);
    if (!doneWhen) fail('direction/doneWhen', 'doneWhen required: what observable result closes this direction');
    const key = comparable(question);
    if (state.directions.some((d) => !TERMINAL_STATES.has(d.state) && comparable(d.question) === key)) {
      fail('direction/duplicate', `an open direction already asks: ${question}`);
    }
    // 已存在的事实不能换个壳当方向。
    if (state.facts.some((f) => comparable(f.answer) === key)) {
      fail('direction/echoes-fact', 'this question is already answered by a fact; explore a new question instead');
    }
    const stage = DIRECTION_STAGES.includes(cmd.stage) ? cmd.stage : 'explore';
    const direction = {
      id: nextId(state, 'direction'),
      axis: axes,
      question,
      doneWhen,
      stage,
      state: 'open',
      origin: ['planner', 'lead', 'fallback', 'derive'].includes(cmd.origin) ? cmd.origin : 'lead',
      assets: Array.isArray(cmd.assets) ? cmd.assets.map(text).filter(Boolean) : [],
      parents: Array.isArray(cmd.parents) ? cmd.parents.map(text).filter(Boolean) : [],
      priority: Number.isFinite(cmd.priority) ? cmd.priority : 5,
      directive: text(cmd.directive),
      conclusion: null,
      createdAt: cmd.now,
      updatedAt: cmd.now
    };
    state.directions.push(direction);
    reopenRootGoalForWork(state, 'new direction added');
    refreshPlannerWake(state, `direction-added:${direction.id}`, cmd.now);
    return;
  }
  if (cmd.op === 'update') {
    const direction = findById(state.directions, cmd.id, 'direction/not-found', 'direction');
    if (cmd.state !== undefined && cmd.state !== direction.state) {
      assertTransition(direction.state, cmd.state);
      direction.state = cmd.state;
      if (cmd.state === 'done') {
        const answer = normalize(cmd.conclusion?.answer ?? direction.conclusion?.answer);
        if (!answer) fail('direction/conclusion', 'closing a direction as done requires conclusion.answer');
        const evidenceIds = Array.isArray(cmd.conclusion?.evidenceIds) ? cmd.conclusion.evidenceIds.filter(Boolean) : [];
        const hasFact = (state.facts || []).some((fact) => fact.directionId === direction.id);
        if (!hasFact && evidenceIds.length === 0) {
          fail('direction/evidence', 'closing a direction as done requires a fact or evidence from that direction');
        }
      }
    }
    if (cmd.conclusion !== undefined) {
      const answer = normalize(cmd.conclusion?.answer);
      if (!answer) fail('direction/conclusion', 'conclusion.answer required');
      direction.conclusion = {
        answer,
        evidenceIds: assertEvidenceIds(state, cmd.conclusion?.evidenceIds, 'direction/evidence'),
        at: cmd.now
      };
    }
    if (cmd.stage !== undefined) {
      if (!DIRECTION_STAGES.includes(cmd.stage)) fail('direction/stage', `unknown stage ${cmd.stage}`);
      direction.stage = cmd.stage;
    }
    if (cmd.priority !== undefined && Number.isFinite(cmd.priority)) direction.priority = cmd.priority;
    if (cmd.directive !== undefined) direction.directive = text(cmd.directive);
    if (cmd.deleted === true) direction.deleted = true;
    direction.updatedAt = cmd.now;
    recordCoverage(state, direction, cmd.now);
    refreshPlannerWake(state, `direction:${direction.id}`, cmd.now);
    return;
  }
  fail('direction/op', `unknown direction op ${cmd.op}`);
}

function applyFact(state, cmd) {
  if (cmd.op !== 'add') fail('fact/op', `unknown fact op ${cmd.op}`);
  const direction = findById(state.directions, cmd.directionId, 'fact/direction', 'direction');
  const answer = normalize(cmd.answer ?? cmd.detail);
  if (!answer) fail('fact/answer', 'answer required');
  if (comparable(answer) === comparable(direction.question)) {
    fail('fact/echoes-question', 'answer only restates the direction question; record an observable result');
  }
  const fact = {
    id: nextId(state, 'fact'),
    directionId: direction.id,
    answer: text(cmd.answer ?? cmd.detail),
    confidence: normalizeConfidence(cmd.confidence),
    evidenceIds: assertEvidenceIds(state, cmd.evidenceIds, 'fact/evidence'),
    createdAt: cmd.now
  };
  state.facts.push(fact);
  return fact;
}

function applyAsset(state, cmd) {
  if (cmd.op !== 'add') fail('asset/op', `unknown asset op ${cmd.op}`);
  const items = Array.isArray(cmd.assets) ? cmd.assets : [cmd];
  const created = [];
  for (const item of items) {
    const type = normalizeAssetType(item.type ?? item.assetType);
    const value = normalize(item.value);
    if (!type || !value) fail('asset/field', 'asset type and value required');
    if (!ASSET_TYPES.includes(type)) fail('asset/type', `unknown asset type ${item.type ?? item.assetType}`);
    const existing = state.assets.find((a) => a.type === type && a.value === value);
    if (existing) { created.push(existing); continue; }
    const asset = {
      id: nextId(state, 'asset'),
      type,
      value,
      meta: typeof item.meta === 'string'
        ? item.meta
        : item.meta && typeof item.meta === 'object' ? structuredClone(item.meta) : {},
      createdAt: cmd.now
    };
    state.assets.push(asset);
    created.push(asset);
  }
  return created;
}

function applyEvidence(state, cmd) {
  if (cmd.op === 'add') {
    const items = Array.isArray(cmd.evidence) ? cmd.evidence : [cmd];
    const created = [];
    for (const item of items) {
      const kind = normalize(item.kind);
      const role = normalize(item.role || 'supporting');
      if (!EVIDENCE_KINDS.includes(kind)) fail('evidence/kind', `unknown evidence kind ${kind}`);
      if (!EVIDENCE_ROLES.includes(role)) fail('evidence/role', `unknown evidence role ${role}`);
      const evidence = {
        id: nextId(state, 'evidence'),
        kind,
        role,
        sha256: normalize(item.sha256),
        path: normalize(item.path),
        summary: normalize(item.summary),
        createdAt: cmd.now
      };
      state.evidence.push(evidence);
      created.push(evidence);
    }
    return created;
  }
  if (cmd.op === 'bind') {
    const ids = assertEvidenceIds(state, cmd.evidenceIds, 'evidence/bind');
    const target = cmd.targetType === 'fact'
      ? findById(state.facts, cmd.targetId, 'evidence/target', 'fact')
      : findById(state.findings, cmd.targetId, 'evidence/target', 'finding');
    target.evidenceIds = Array.from(new Set([...(target.evidenceIds || []), ...ids]));
    return target;
  }
  fail('evidence/op', `unknown evidence op ${cmd.op}`);
}

function markReportPendingReporter(state) {
  if (!state.report) return;
  state.report.evidenceStale = true;
  state.report.pendingReporter = true;
}

function applyFinding(state, cmd) {
  // One-way migration: the user's ONLY red line is "no testing interfaces
  // that delete/tamper with existing data". Old broad keyword rules wrongly
  // parked token acquisition / upload probing as 'pending'. Unblock those.
  if (cmd.op === 'unblock') {
    const existing = findById(state.findings, cmd.id, 'finding/not-found', 'finding');
    existing.approvalStatus = 'approved';
    existing.safetyDecision = 'allow';
    existing.auditDecision = normalize(existing.auditDecision) === 'needs_review' ? '' : existing.auditDecision;
    existing.approvalNote = normalize(cmd.note) || 'auto-cleared: outside the sole user red line';
    existing.updatedAt = cmd.now;
    return existing;
  }
  if (cmd.op === 'review') {
    const existing = findById(state.findings, cmd.id, 'finding/not-found', 'finding');
    if (!['pending', 'approved', 'denied'].includes(cmd.status)) {
      fail('finding/review', `unknown review status ${cmd.status}`);
    }
    existing.approvalStatus = cmd.status;
    existing.safetyDecision = normalize(cmd.safetyDecision) || existing.safetyDecision || '';
    existing.approvalNote = normalize(cmd.note);
    if (cmd.proposedAction !== undefined) existing.proposedAction = normalize(cmd.proposedAction);
    existing.updatedAt = cmd.now;
    return existing;
  }
  if (cmd.op === 'merge') {
    const target = findById(state.findings, cmd.id, 'finding/not-found', 'finding');
    const source = findById(state.findings, cmd.sourceId, 'finding/source', 'finding');
    if (target.id === source.id) fail('finding/merge', 'cannot merge a finding into itself');
    const unique = (items) => [...new Set((Array.isArray(items) ? items : []).map(normalize).filter(Boolean))];
    target.evidenceIds = unique([...(target.evidenceIds || []), ...(source.evidenceIds || [])]);
    target.affectedAssets = unique([...(target.affectedAssets || []), ...(source.affectedAssets || [])]);
    // A duplicate carries the audit identity of the same vulnerability. Keep
    // the target's own values when present, otherwise inherit the source's so
    // a merged finding never loses vulnType/rootCause/dedupe metadata.
    for (const key of ['vulnType', 'rootCause', 'dedupeKey', 'severityRationale', 'exploitTechnique', 'auditDecision']) {
      if (!normalize(target[key]) && normalize(source[key])) target[key] = normalize(source[key]);
    }
    if ((!target.impactProven || target.impactProven === 'none') && source.impactProven && source.impactProven !== 'none') {
      target.impactProven = source.impactProven;
    }
    target.updatedAt = cmd.now;
    source.deleted = true;
    source.updatedAt = cmd.now;
    return target;
  }
  if (cmd.op === 'delete') {
    const existing = findById(state.findings, cmd.id, 'finding/not-found', 'finding');
    existing.deleted = true;
    existing.updatedAt = cmd.now;
    return existing;
  }
  if (cmd.op === 'rate') {
    const existing = findById(state.findings, cmd.id, 'finding/not-found', 'finding');
    if (cmd.severity !== undefined && !SEVERITIES.includes(cmd.severity)) {
      fail('finding/severity', `unknown severity ${cmd.severity}`);
    }
    if (cmd.impactProven !== undefined && !['none', 'info', 'read', 'write', 'rce'].includes(cmd.impactProven)) {
      fail('finding/impact', `unknown impactProven ${cmd.impactProven}`);
    }
    if (cmd.severity !== undefined) existing.severity = cmd.severity;
    if (cmd.verificationLevel !== undefined) {
      if (!VERIFICATION_LEVELS.includes(cmd.verificationLevel)) {
        fail('finding/verification', `unknown verificationLevel ${cmd.verificationLevel}`);
      }
      if (cmd.verificationLevel === 'confirmed' && existing.status !== 'confirmed') {
        fail('finding/verification', 'confirmed verification level requires a confirmed finding');
      }
      existing.verificationLevel = normalize(cmd.verificationLevel);
    }
    if (cmd.impactProven !== undefined) existing.impactProven = cmd.impactProven;
    if (cmd.riskAnalysis !== undefined) existing.riskAnalysis = normalize(cmd.riskAnalysis);
    if (cmd.remediation !== undefined) existing.remediation = normalize(cmd.remediation);
    if (cmd.dedupeKey !== undefined) existing.dedupeKey = normalize(cmd.dedupeKey);
    if (cmd.severityRationale !== undefined) existing.severityRationale = normalize(cmd.severityRationale);
    if (cmd.vulnType !== undefined) existing.vulnType = normalize(cmd.vulnType);
    if (cmd.rootCause !== undefined) existing.rootCause = normalize(cmd.rootCause);
    if (cmd.exploitTechnique !== undefined) existing.exploitTechnique = normalize(cmd.exploitTechnique);
    if (cmd.auditDecision !== undefined) existing.auditDecision = normalize(cmd.auditDecision);
    if (Array.isArray(cmd.affectedAssets)) existing.affectedAssets = cmd.affectedAssets.map(normalize);
    existing.updatedAt = cmd.now;
    return existing;
  }
  if (cmd.op !== 'add') fail('finding/op', `unknown finding op ${cmd.op}`);
  const direction = findById(state.directions, cmd.directionId, 'finding/direction', 'direction');
  const claim = normalize(cmd.claim ?? cmd.title);
  if (!claim) fail('finding/claim', 'claim required');
  if (cmd.severity === 'info') fail('finding/severity', 'info-level observations belong in facts, not findings');
  if (!SEVERITIES.includes(cmd.severity)) fail('finding/severity', `unknown severity ${cmd.severity}`);
  if (cmd.verificationLevel !== undefined && !VERIFICATION_LEVELS.includes(cmd.verificationLevel)) {
    fail('finding/verification', `unknown verificationLevel ${cmd.verificationLevel}`);
  }
  if (cmd.verificationLevel === 'confirmed') {
    fail('finding/verification', 'confirmed verification level requires a validated finding');
  }
  const evidenceIds = assertEvidenceIds(state, cmd.evidenceIds, 'finding/evidence');
  if (evidenceIds.length === 0) fail('finding/evidence', 'a finding requires at least one evidence record');
  const finding = {
    id: nextId(state, 'finding'),
    directionId: direction.id,
    claim,
    title: normalize(cmd.title) || shortTitle(claim),
    description: normalize(cmd.description) || claim,
    riskAnalysis: normalize(cmd.riskAnalysis),
    remediation: normalize(cmd.remediation),
    steps: (Array.isArray(cmd.steps) ? cmd.steps : Array.isArray(cmd.reproducibleSteps) ? cmd.reproducibleSteps : []).map((step) => typeof step === 'string' ? step : normalize(step?.request ?? step)),
    stepNotes: (Array.isArray(cmd.stepNotes) ? cmd.stepNotes : []).map(normalize),
    apiSources: (Array.isArray(cmd.apiSources) ? cmd.apiSources : []).map(normalize),
    severity: cmd.severity,
    verificationLevel: normalize(cmd.verificationLevel),
    impactProven: ['none', 'info', 'read', 'write', 'rce'].includes(cmd.impactProven) ? cmd.impactProven : 'none',
    vulnType: normalize(cmd.vulnType),
    rootCause: normalize(cmd.rootCause),
    exploitTechnique: normalize(cmd.exploitTechnique),
    affectedAssets: (Array.isArray(cmd.affectedAssets) ? cmd.affectedAssets : []).map(normalize),
    evidenceIds,
    validationId: null,
    status: 'unverified',
    createdAt: cmd.now,
    updatedAt: cmd.now
  };
  state.findings.push(finding);
  // P0-3: a newly registered finding invalidates the old report; reporter
  // must re-verify baseline/proof/verification before delivery.
  markReportPendingReporter(state);
  return finding;
}

function applyValidation(state, cmd) {
  if (cmd.op !== 'add') fail('validation/op', `unknown validation op ${cmd.op}`);
  const finding = findById(state.findings, cmd.findingId, 'validation/finding', 'finding');
  if (finding.approvalStatus === 'pending') {
    fail('validation/approval', 'red-line finding is pending user approval; call pentest_flow_approval first');
  }
  if (!VALIDATION_VERDICTS.includes(cmd.verdict)) fail('validation/verdict', `unknown verdict ${cmd.verdict}`);
  const validator = normalize(cmd.validator);
  if (!validator) fail('validation/validator', 'validator required (independent worker or tool)');
  // High/critical sign-off is reserved for the independent auditor. This is
  // enforced in the canonical reducer, not only in the tool wrapper, so a
  // direct session call cannot mint a Lead-signed critical validation.
  if (['critical', 'high'].includes(finding.severity) && validator !== 'agent:pentest-auditor') {
    fail('validation/validator', 'critical/high findings must be validated by agent:pentest-auditor');
  }
  const evidenceIds = assertEvidenceIds(state, cmd.evidenceIds, 'validation/evidence');
  if (cmd.verdict === 'reproduced' && evidenceIds.length === 0) {
    fail('validation/evidence', 'reproduced requires its own verification evidence');
  }
  const metadata = cmd.metadata && typeof cmd.metadata === 'object' ? cmd.metadata : cmd;
  const validation = {
    id: nextId(state, 'validation'),
    findingId: finding.id,
    verdict: cmd.verdict,
    validator,
    evidenceIds,
    notes: text(cmd.notes),
    // Audit identity is persisted on the validation row itself so a later
    // finding merge/delete cannot erase why the decision was made.
    ...(metadata.auditDecision || metadata.decision ? { auditDecision: normalize(metadata.auditDecision || metadata.decision) } : {}),
    ...(metadata.vulnType ? { vulnType: normalize(metadata.vulnType) } : {}),
    ...(metadata.rootCause ? { rootCause: normalize(metadata.rootCause) } : {}),
    ...(metadata.dedupeKey ? { dedupeKey: normalize(metadata.dedupeKey) } : {}),
    ...(metadata.retest && typeof metadata.retest === 'object'
      ? { retest: {
          verdict: normalize(metadata.retest.verdict),
          reason: normalize(metadata.retest.reason),
          requirements: Array.isArray(metadata.retest.requirements) ? metadata.retest.requirements.slice(0, 8).map(text) : []
        } }
      : {}),
    ...(metadata.severityRationale ? { severityRationale: normalize(metadata.severityRationale) } : {}),
    ...(metadata.exploitTechnique ? { exploitTechnique: normalize(metadata.exploitTechnique) } : {}),
    ...(Array.isArray(metadata.affectedAssets) ? { affectedAssets: metadata.affectedAssets.map(normalize).filter(Boolean) } : {}),
    at: cmd.now
  };
  state.validations.push(validation);
  for (const item of state.validations) {
    if (item.findingId === finding.id && item.id !== validation.id) item.superseded = true;
  }
  finding.validationId = validation.id;
  finding.status = cmd.verdict === 'reproduced' ? 'confirmed' : cmd.verdict === 'not_reproduced' ? 'rejected' : 'inconclusive';
  // Audit identity belongs to the finding as well as the validation row; this
  // keeps rejected/inconclusive findings auditable without a second rate call.
  if (validation.auditDecision) finding.auditDecision = validation.auditDecision;
  if (validation.vulnType) finding.vulnType = validation.vulnType;
  if (validation.rootCause) finding.rootCause = validation.rootCause;
  if (validation.dedupeKey) finding.dedupeKey = validation.dedupeKey;
  if (validation.severityRationale) finding.severityRationale = validation.severityRationale;
  if (validation.exploitTechnique) finding.exploitTechnique = validation.exploitTechnique;
  if (Array.isArray(validation.affectedAssets)) finding.affectedAssets = validation.affectedAssets;
  finding.updatedAt = cmd.now;
  refreshPlannerWake(state, `validation:${validation.id}`, cmd.now);
  return validation;
}

function recordCoverage(state, direction, now) {
  if (!direction || !TERMINAL_STATES.has(direction.state)) return;
  const hasFinding = (state.findings || []).some((finding) => finding.directionId === direction.id && finding.deleted !== true);
  const result = direction.state === 'blocked'
    ? 'blocked'
    : direction.state === 'done'
      ? (hasFinding ? 'issue_found' : 'no_issue_found')
      : 'not_tested';
  // Auto-coverage is only a convenience view. When a finished direction has
  // evidence, carry it onto the coverage row so it can count as tested;
  // otherwise the row remains explicitly evidence-free and cannot close a gap.
  const evidenceIds = [...new Set([
    ...(Array.isArray(direction.conclusion?.evidenceIds) ? direction.conclusion.evidenceIds : []),
    ...(state.facts || [])
      .filter((fact) => fact.directionId === direction.id)
      .flatMap((fact) => Array.isArray(fact.evidenceIds) ? fact.evidenceIds : [])
  ].map(text).filter(Boolean))];
  for (const axis of direction.axis || []) {
    const existing = (state.coverage || []).find((item) => item.axis === axis && (item.assetId || '') === '');
    if (existing) {
      if ((!Array.isArray(existing.evidenceIds) || existing.evidenceIds.length === 0) && evidenceIds.length > 0) {
        existing.evidenceIds = evidenceIds;
        existing.updatedAt = now;
      }
      continue;
    }
    state.coverage.push({
      id: nextId(state, 'coverage'),
      axis,
      assetId: null,
      result,
      note: `auto from ${direction.id} (${direction.state})`,
      evidenceIds,
      createdAt: now,
      updatedAt: now
    });
  }
}

function applyCoverage(state, cmd) {
  if (cmd.op !== 'set') fail('coverage/op', `unknown coverage op ${cmd.op}`);
  let axes = normalizeAxes(cmd.axis ?? cmd.axes);
  if (axes.length === 0) axes = inferAxes(cmd.note);
  if (axes.length === 0) fail('coverage/axis', `axis required, one of: ${AXES.join(', ')}`);
  if (!COVERAGE_RESULTS.includes(cmd.result)) fail('coverage/result', `unknown result ${cmd.result}`);
  const assetId = text(cmd.assetId);
  const axis = axes[0];
  const existing = state.coverage.find((item) => item.axis === axis && (item.assetId || '') === assetId);
  const record = existing || { id: nextId(state, 'coverage'), axis, assetId: assetId || null, createdAt: cmd.now };
  record.result = cmd.result;
  record.note = text(cmd.note);
  record.evidenceIds = assertEvidenceIds(state, cmd.evidenceIds, 'coverage/evidence');
  record.updatedAt = cmd.now;
  if (!existing) state.coverage.push(record);
  return record;
}

function applyTask(state, cmd) {
  if (cmd.op === 'assign') {
    const direction = findById(state.directions, cmd.directionId, 'task/direction', 'direction');
    if (TERMINAL_STATES.has(direction.state)) fail('task/direction', `direction is already ${direction.state}`);
    if (state.tasks.some((task) => task.directionId === direction.id && ['queued', 'running'].includes(task.state))) {
      fail('task/duplicate', `direction ${direction.id} already has an active task`);
    }
    const task = {
      id: nextId(state, 'task'),
      directionId: direction.id,
      state: 'queued',
      provider: normalize(cmd.provider) || 'spawn',
      workerLabel: normalize(cmd.workerLabel) || '',
      budget: cmd.budget && typeof cmd.budget === 'object' ? structuredClone(cmd.budget) : {},
      attempt: 1,
      childId: null,
      createdAt: cmd.now,
      startedAt: null,
      finishedAt: null,
      result: null,
      error: null
    };
    state.tasks.push(task);
    return task;
  }
  const task = findById(state.tasks, cmd.id, 'task/not-found', 'task');
  if (cmd.op === 'start') {
    if (task.state !== 'queued') fail('task/state', `cannot start a ${task.state} task`);
    const childId = normalize(cmd.childId);
    if (!childId) fail('task/child', 'childId required');
    task.childId = childId;
    task.state = 'running';
    task.startedAt = cmd.now;
    return task;
  }
  if (cmd.op === 'cancel') {
    if (!['queued', 'running'].includes(task.state)) fail('task/state', `cannot cancel a ${task.state} task`);
    task.state = 'cancelled';
    task.finishedAt = cmd.now;
    task.error = normalize(cmd.reason) || 'cancelled';
    return task;
  }
  if (cmd.op === 'unknown') {
    if (task.state !== 'running') fail('task/state', `cannot mark a ${task.state} task unknown`);
    task.state = 'unknown';
    task.error = normalize(cmd.reason) || 'worker state unknown after restart';
    return task;
  }
  fail('task/op', `unknown task op ${cmd.op}`);
}

function addCandidate(state, item, source, now) {
  const raw = typeof item === 'string' ? { question: item } : (item || {});
  const question = normalize(raw.question ?? raw.title);
  if (!question) return;
  const key = comparable(question);
  if (state.directions.some((direction) => comparable(direction.question) === key)) return;
  if ((state.planner.candidates || []).some((candidate) => !['rejected', 'blocked'].includes(candidate.state) && comparable(candidate.question) === key)) return;
  let axis = normalizeAxes(raw.axis ?? raw.axes);
  if (axis.length === 0) axis = inferAxes(question);
  if (axis.length === 0) axis = ['surface'];
  const candidate = {
    id: nextId(state, 'candidate'),
    question,
    doneWhen: normalize(raw.doneWhen) || '得到可复现证据或明确排除该方向',
    axis,
    parents: Array.isArray(raw.parents) ? raw.parents.map(text).filter(Boolean) : [],
    source,
    reason: normalize(raw.reason),
    state: 'proposed',
    createdAt: now
  };
  state.planner.candidates.push(candidate);
  if (state.planner.candidates.length > 8) state.planner.candidates.splice(0, state.planner.candidates.length - 8);
  reopenRootGoalForWork(state, 'worker proposed new candidate');
}

function refreshPlannerWake(state, reason, now) {
  const goalsOpen = (state.goals || []).some((goal) => goal.state !== 'met');
  const frontier = (state.directions || []).some((direction) => ['open', 'running'].includes(direction.state));
  const candidates = Array.isArray(state.planner?.candidates) ? state.planner.candidates : [];
  const proposed = candidates.some((candidate) => candidate.state === 'proposed');
  const blocked = candidates.some((candidate) => candidate.state === 'blocked');
  state.planner.lastWakeAt = now;
  state.planner.lastWakeReason = reason;
  // If every remaining candidate is blocked and nothing is actionable, keep
  // the planner quiet until the prerequisite is supplied or the goal is
  // explicitly reopened.
  state.planner.mustGenerate = goalsOpen && !frontier && !(blocked && !proposed);
}

function applyCandidate(state, cmd) {
  const candidate = findById(state.planner.candidates, cmd.id, 'candidate/not-found', 'candidate');
  if (cmd.op === 'reject') {
    candidate.state = 'rejected';
    candidate.reason = normalize(cmd.reason) || candidate.reason;
    candidate.updatedAt = cmd.now;
    return candidate;
  }
  if (cmd.op === 'block') {
    if (candidate.state === 'accepted') fail('candidate/state', 'accepted candidate cannot be blocked');
    candidate.state = 'blocked';
    candidate.blockedBy = (Array.isArray(cmd.blockedBy) ? cmd.blockedBy : [])
      .map(normalize).filter(Boolean);
    candidate.reason = normalize(cmd.reason) || candidate.reason;
    candidate.updatedAt = cmd.now;
    refreshPlannerWake(state, `candidate-blocked:${candidate.id}`, cmd.now);
    return candidate;
  }
  if (cmd.op === 'accept') {
    if (candidate.state === 'accepted') fail('candidate/state', 'candidate already accepted');
    const duplicate = (state.directions || []).find((direction) => comparable(direction.question) === comparable(candidate.question));
    if (duplicate) {
      candidate.state = 'accepted';
      candidate.directionId = duplicate.id;
      candidate.updatedAt = cmd.now;
      return candidate;
    }
    applyDirection(state, {
      op: 'add',
      axis: candidate.axis,
      question: candidate.question,
      doneWhen: candidate.doneWhen,
      parents: candidate.parents,
      origin: 'planner',
      now: cmd.now
    });
    candidate.state = 'accepted';
    candidate.updatedAt = cmd.now;
    return candidate;
  }
  fail('candidate/op', `unknown candidate op ${cmd.op}`);
}

function applyWorker(state, cmd) {
  const task = findById(state.tasks, cmd.taskId, 'worker/task', 'task');
  if (cmd.op === 'fail') {
    if (!['queued', 'running'].includes(task.state)) fail('worker/state', `cannot fail a ${task.state} task`);
    task.state = 'failed';
    task.error = normalize(cmd.error) || 'worker failed';
    task.finishedAt = cmd.now;
    // P0-6: keep a bounded resume checkpoint on the failed task. Falls back
    // to deriving from current state for older callers.
    if (cmd.checkpoint && typeof cmd.checkpoint === 'object') task.checkpoint = structuredClone(cmd.checkpoint);
    else task.checkpoint = buildCheckpoint({ task, direction: (state.directions || []).find((item) => item.id === task.directionId), state, error: task.error, now: cmd.now });
    const failedDirection = (state.directions || []).find((item) => item.id === task.directionId);
    if (failedDirection && failedDirection.state === 'running') {
      failedDirection.state = 'open';
      failedDirection.updatedAt = cmd.now;
    }
    refreshPlannerWake(state, `worker-failed:${task.id}`, cmd.now);
    return task;
  }
  if (cmd.op !== 'commit') fail('worker/op', `unknown worker op ${cmd.op}`);
  if (!['queued', 'running'].includes(task.state)) fail('worker/state', `cannot commit a ${task.state} task`);
  const direction = findById(state.directions, task.directionId, 'worker/direction', 'direction');
  const conclusion = normalize(cmd.conclusion);
  if (!conclusion) fail('worker/conclusion', 'worker conclusion required');
  const directionState = normalize(cmd.directionState) || 'done';
  if (!['done', 'exhausted', 'blocked', 'empty'].includes(directionState)) {
    fail('worker/directionState', `unknown directionState ${directionState}`);
  }
  const keyToId = new Map();
  const createdEvidence = [];
  for (const item of (Array.isArray(cmd.evidence) ? cmd.evidence : [])) {
    const kind = normalize(item.kind);
    const role = normalize(item.role || 'proof');
    if (!EVIDENCE_KINDS.includes(kind)) fail('worker/evidence', `unknown evidence kind ${kind}`);
    if (!EVIDENCE_ROLES.includes(role)) fail('worker/evidence', `unknown evidence role ${role}`);
    const evidence = {
      id: nextId(state, 'evidence'),
      kind,
      role,
      sha256: normalize(item.sha256),
      path: normalize(item.path),
      summary: normalize(item.summary),
      createdAt: cmd.now
    };
    state.evidence.push(evidence);
    createdEvidence.push(evidence);
    const key = normalize(item.key) || normalize(item.path);
    if (key) keyToId.set(key, evidence.id);
  }
  const resolve = (keys) => (Array.isArray(keys) ? keys : []).map((key) => keyToId.get(normalize(key))).filter(Boolean);
  const assetIds = [];
  if (Array.isArray(cmd.assets) && cmd.assets.length > 0) {
    const touched = applyAsset(state, { op: 'add', assets: cmd.assets, now: cmd.now });
    for (const asset of touched) {
      if (asset?.id && !assetIds.includes(asset.id)) assetIds.push(asset.id);
    }
  }
  const factIds = [];
  for (const item of (Array.isArray(cmd.facts) ? cmd.facts : [])) {
    const answer = normalize(item.answer);
    if (!answer) fail('worker/fact', 'fact.answer required');
    if (comparable(answer) === comparable(direction.question)) fail('fact/echoes-question', 'worker fact restates the direction question');
    const fact = {
      id: nextId(state, 'fact'),
      directionId: direction.id,
      answer,
      confidence: normalizeConfidence(item.confidence),
      evidenceIds: resolve(item.evidenceKeys),
      createdAt: cmd.now
    };
    state.facts.push(fact);
    factIds.push(fact.id);
  }
  const findingIds = [];
  for (const item of (Array.isArray(cmd.findings) ? cmd.findings : [])) {
    const claim = normalize(item.claim);
    if (!claim) fail('worker/finding', 'finding.claim required');
    if (item.severity === 'info') {
      // Info-level observations are facts, not vulnerabilities.
      const fact = {
        id: nextId(state, 'fact'),
        directionId: direction.id,
        answer: claim,
        confidence: 'observed',
        evidenceIds: resolve(item.evidenceKeys),
        createdAt: cmd.now
      };
      state.facts.push(fact);
      factIds.push(fact.id);
      continue;
    }
    if (!SEVERITIES.includes(item.severity)) fail('worker/finding', `unknown severity ${item.severity}`);
    const evidenceIds = resolve(item.evidenceKeys);
    if (evidenceIds.length === 0) fail('finding/evidence', 'worker finding requires an evidence key that exists');
    const finding = {
      id: nextId(state, 'finding'),
      directionId: direction.id,
      claim,
      title: normalize(item.title) || shortTitle(claim),
      description: normalize(item.description) || claim,
      riskAnalysis: normalize(item.riskAnalysis),
      remediation: normalize(item.remediation),
      steps: (Array.isArray(item.steps) ? item.steps : Array.isArray(item.reproducibleSteps) ? item.reproducibleSteps : []).map((step) => typeof step === 'string' ? step : normalize(step?.request ?? step)),
      stepNotes: (Array.isArray(item.stepNotes) ? item.stepNotes : []).map(normalize),
      apiSources: (Array.isArray(item.apiSources) ? item.apiSources : []).map(normalize),
      severity: item.severity,
      impactProven: ['none', 'info', 'read', 'write', 'rce'].includes(item.impactProven) ? item.impactProven : 'none',
      evidenceIds,
      validationId: null,
      status: 'unverified',
      createdAt: cmd.now,
      updatedAt: cmd.now
    };
    state.findings.push(finding);
    findingIds.push(finding.id);
    markReportPendingReporter(state);
  }
  for (const item of (Array.isArray(cmd.coverage) ? cmd.coverage : [])) {
    applyCoverage(state, {
      op: 'set', axis: item.axis, result: item.result, note: item.note,
      evidenceIds: resolve(item.evidenceKeys), now: cmd.now
    });
  }
  if (direction.state !== directionState) assertTransition(direction.state, directionState);
  direction.state = directionState;
  direction.conclusion = {
    answer: conclusion,
    evidenceIds: createdEvidence.map((item) => item.id),
    at: cmd.now
  };
  direction.updatedAt = cmd.now;
  recordCoverage(state, direction, cmd.now);
  const nextQuestions = (Array.isArray(cmd.nextQuestions) ? cmd.nextQuestions : []).map(text).filter(Boolean);
  const nextDirections = Array.isArray(cmd.nextDirections) ? cmd.nextDirections : [];
  for (const item of [...nextDirections, ...nextQuestions]) addCandidate(state, item, task.id, cmd.now);
  refreshPlannerWake(state, `worker:${task.id}`, cmd.now);
  task.state = 'done';
  task.finishedAt = cmd.now;
  task.result = {
    conclusion,
    directionState,
    assetIds,
    factIds,
    findingIds,
    evidenceIds: createdEvidence.map((item) => item.id),
    nextQuestions,
    nextDirections
  };
  return task;
}

function applyReport(state, cmd) {
  if (cmd.op !== 'record') fail('report/op', `unknown report op ${cmd.op}`);
  const file = normalize(cmd.path);
  if (!file) fail('report/path', 'report path required');
  state.report = {
    path: file,
    by: normalize(cmd.by) || 'renderer',
    memberName: normalize(cmd.memberName),
    revision: Number(state.revision) || 0,
    // P0-3: commit the exact evidence set this report describes. Later
    // evidence binds mark the report stale without overwriting new evidence.
    evidenceVersion: normalize(cmd.evidenceVersion) || evidenceVersion(state),
    evidenceStale: false,
    pendingReporter: false,
    evidenceChecks: Array.isArray(cmd.evidenceChecks) ? cmd.evidenceChecks : [],
    bytes: Number(cmd.bytes) || 0,
    gaps: Number(cmd.gaps) || 0,
    wordPath: normalize(cmd.wordPath),
    templateId: normalize(cmd.templateId),
    at: cmd.now ?? Date.now()
  };
  return state.report;
}

function applyRole(state, cmd) {
  if (cmd.op !== 'record') fail('role/op', `unknown role op ${cmd.op}`);
  const role = normalize(cmd.role);
  if (!['planner', 'validator', 'reporter', 'reviewer', 'librarian', 'critic', 'auditor'].includes(role)) {
    fail('role/name', `unknown role ${cmd.role}`);
  }
  if (!state.roles || typeof state.roles !== 'object' || Array.isArray(state.roles)) state.roles = {};
  state.roles[role] = {
    lastRunId: normalize(cmd.runId),
    lastRunAt: cmd.ranAt ?? cmd.now ?? Date.now(),
    lastStatus: normalize(cmd.status),
    lastChildId: normalize(cmd.childId),
    lastMemberName: normalize(cmd.memberName),
    lastPreset: normalize(cmd.preset),
    lastRevision: Number(cmd.revision) || 0,
    lastStartedAt: Number(cmd.startedAt) || 0,
    lastVerdict: normalize(cmd.verdict),
    lastDecision: normalize(cmd.decision),
    lastSeverity: normalize(cmd.severity),
    lastImpactProven: normalize(cmd.impactProven),
    lastOk: cmd.ok == null ? null : Boolean(cmd.ok),
    lastProblems: Number(cmd.problems) || 0,
    lastAssets: Number(cmd.assets) || 0,
    lastCandidates: Number(cmd.candidates) || 0,
    lastNotes: normalize(cmd.notes),
    lastError: normalize(cmd.error),
    lastDiagnostic: normalize(cmd.diagnostic)
  };
  return state.roles[role];
}

function applySettings(state, cmd) {
  if (cmd.op !== 'set') fail('settings/op', `unknown settings op ${cmd.op}`);
  if (!state.settings || typeof state.settings !== 'object') state.settings = {};
  if (cmd.workerLimit !== undefined) {
    const limit = Number(cmd.workerLimit);
    if (!Number.isFinite(limit)) fail('settings/workerLimit', 'workerLimit must be a number');
    state.settings.workerLimit = Math.min(Math.max(Math.round(limit), 1), 6);
  }
  if (cmd.autoDispatch !== undefined) {
    if (typeof cmd.autoDispatch !== 'boolean') fail('settings/autoDispatch', 'autoDispatch must be a boolean');
    state.settings.autoDispatch = cmd.autoDispatch;
  }
  // STCS owns audits through its coordinator queue. An explicit false makes the
  // legacy global audit drain skip this session even when it is dormant.
  if (cmd.autoAudit !== undefined) {
    if (typeof cmd.autoAudit !== 'boolean') fail('settings/autoAudit', 'autoAudit must be a boolean');
    state.settings.autoAudit = cmd.autoAudit;
  }
  state.settings.updatedAt = cmd.now;
  refreshPlannerWake(state, 'settings:workerLimit', cmd.now);
  return state.settings;
}

export function reduceV4(state, cmd = {}) {
  if (!state || Number(state.version) !== V4_VERSION) fail('state/version', 'reduceV4 requires a v4 state');
  if (!cmd || typeof cmd !== 'object' || !cmd.type) fail('command/type', 'command.type required');
  const next = structuredClone(state);
  ensureV4Collections(next);
  next.goal.updatedAt = cmd.now ?? Date.now();
  switch (cmd.type) {
    case 'goal': applyGoal(next, cmd); break;
    case 'direction': applyDirection(next, cmd); break;
    case 'candidate': applyCandidate(next, cmd); break;
    case 'fact': applyFact(next, cmd); break;
    case 'asset': applyAsset(next, cmd); break;
    case 'evidence': applyEvidence(next, cmd); break;
    case 'finding': applyFinding(next, cmd); break;
    case 'validation': applyValidation(next, cmd); break;
    case 'coverage': applyCoverage(next, cmd); break;
    case 'task': applyTask(next, cmd); break;
    case 'worker': applyWorker(next, cmd); break;
    case 'role': applyRole(next, cmd); break;
    case 'report': applyReport(next, cmd); break;
    case 'settings': applySettings(next, cmd); break;
    default: fail('command/type', `unknown command type ${cmd.type}`);
  }
  // P0-3: a report records the exact evidence version it describes. Any later
  // command that adds/rebinds evidence marks the old report stale. Never
  // delete the report and never overwrite the new evidence.
  if (!(cmd.type === 'report' && cmd.op === 'record') && next.report) {
    const currentVersion = evidenceVersion(next);
    if (!next.report.evidenceVersion || next.report.evidenceVersion !== currentVersion) {
      next.report.evidenceStale = true;
    }
  }
  next.revision = (Number(state.revision) || 0) + 1;
  return next;
}
