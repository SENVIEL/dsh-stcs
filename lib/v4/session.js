/**
 * v4 会话门面：把 reducer 包成"一次命令一个事务"。
 *
 * P2/P3 的 worker/工具层直接调这里，不再接触 v2 兼容图。
 */
import { PentestStateStore } from '../store.js';
import { createV4State, V4_VERSION, ensureV4Collections } from './state.js';
import { deriveAssetsFromState } from './assets.js';
import { reduceV4 } from './reduce.js';

export class V4Session {
  constructor({ store, sessionId }) {
    if (!store) throw new Error('V4Session requires a store');
    if (!sessionId) throw new Error('V4Session requires a sessionId');
    this.store = store;
    this.sessionId = sessionId;
  }

  static createStore({ load, save, append, now }) {
    return new PentestStateStore({ load, save, append, now, reduce: reduceV4 });
  }

  async init(goal = {}) {
    const existing = await this.store.read(this.sessionId);
    if (existing) return existing;
    const state = createV4State({ ...goal, sessionId: this.sessionId, now: goal.now ?? Date.now() });
    return this.store.create(this.sessionId, state);
  }

  /**
   * Re-emit the canonical v4 state as a UI snapshot. The legacy handler only
   * knows the v3 store, so v4 sessions used to have no working reproject at
   * all and kept rendering a stale projection after pause/cancel.
   */
  async reproject({ tolerateAppendFailure = false, force = false } = {}) {
    const state = await this.store.read(this.sessionId);
    if (!state) return null;
    await this.store.reproject(this.sessionId, { force, tolerateAppendFailure });
    return state;
  }

  async read() {
    const state = await this.store.read(this.sessionId);
    if (!state) return null;
    ensureV4Collections(state);
    // Migration/self-heal for sessions created before v4 seeded assets from
    // goal.targets. This is intentionally one-way and only runs while the
    // canonical inventory is empty; later reads do not invent assets.
    if (!Array.isArray(state.assets)) state.assets = [];
    if (state.assets.length === 0) {
      const derived = deriveAssetsFromState(state);
      if (derived.length > 0) return this.addAsset(derived);
    }
    return state;
  }

  /**
   * All canonical v4 writes go through here. The UI snapshot append is a
   * derived read model: many historical sessions have corrupt event logs
   * (seq gaps), which used to make save-succeed/append-fail throw and roll the
   * mutation back — leaving approvals unblocked-but-still-pending and
   * findings forever 待验证. Default to tolerating snapshot failures; the
   * state table is always saved first and is the source of truth.
   */
  async run(command, options = {}) {
    const out = await this.store.mutate(this.sessionId, command, { tolerateAppendFailure: true, ...options });
    return out.state;
  }

  /**
   * Commit a control command even when the target session's event log is
   * corrupt: the canonical state table is saved, and only the optional UI
   * snapshot append is allowed to fail. Used by pause/resume/audit controls.
   */
  runTolerant(command) {
    return this.run(command, { tolerateAppendFailure: true });
  }

  goalSet(fields) { return this.run({ type: 'goal', op: 'set', ...fields }); }
  addGoal({ title, criteria, parentId }) { return this.run({ type: 'goal', op: 'add', title, criteria, parentId }); }
  proveGoal({ goalId, evidenceId, reason }) { return this.run({ type: 'goal', op: 'prove', goalId, evidenceId, reason }); }
  acceptCandidate(id) { return this.run({ type: 'candidate', op: 'accept', id }); }
  rejectCandidate(id, reason) { return this.run({ type: 'candidate', op: 'reject', id, reason }); }
  blockCandidate(id, reason, blockedBy = []) {
    return this.run({ type: 'candidate', op: 'block', id, reason, blockedBy });
  }
  pause() { return this.run({ type: 'goal', op: 'pause' }); }
  resume() { return this.run({ type: 'goal', op: 'resume' }); }

  addDirection({ axis, axes, question, title, doneWhen, stage, assets, parents, priority, origin }) {
    return this.run({ type: 'direction', op: 'add', axis: axis ?? axes, question: question ?? title, doneWhen, stage, assets, parents, priority, origin });
  }

  setWorkerLimit(workerLimit) {
    return this.run({ type: 'settings', op: 'set', workerLimit });
  }

  setAutoDispatch(value) {
    return this.run({ type: 'settings', op: 'set', autoDispatch: value === true });
  }

  updateDirection(id, patch = {}) {
    return this.run({ type: 'direction', op: 'update', id, ...patch });
  }

  addEvidence(items) {
    return this.run({ type: 'evidence', op: 'add', evidence: Array.isArray(items) ? items : [items] });
  }

  addAsset(items) {
    return this.run({ type: 'asset', op: 'add', assets: Array.isArray(items) ? items : [items] });
  }

  addFact({ directionId, answer, detail, confidence, evidenceIds }) {
    return this.run({ type: 'fact', op: 'add', directionId, answer: answer ?? detail, confidence, evidenceIds });
  }

  addFinding({ directionId, claim, title, severity, impactProven, evidenceIds }) {
    return this.run({ type: 'finding', op: 'add', directionId, claim: claim ?? title, severity, impactProven, evidenceIds });
  }

  rateFinding({ findingId, severity, impactProven, riskAnalysis, remediation, dedupeKey, severityRationale, vulnType, rootCause, exploitTechnique, affectedAssets, auditDecision }) {
    return this.run({
      type: 'finding', op: 'rate', id: findingId,
      severity, impactProven, riskAnalysis, remediation, dedupeKey, severityRationale,
      vulnType, rootCause, exploitTechnique, affectedAssets, auditDecision
    });
  }

  mergeFinding({ findingId, sourceId }) {
    return this.run({ type: 'finding', op: 'merge', id: findingId, sourceId });
  }

  reviewFinding({ findingId, status, safetyDecision, note, proposedAction }) {
    return this.run({
      type: 'finding', op: 'review', id: findingId,
      status, safetyDecision, note, proposedAction
    });
  }

  deleteFinding(id) {
    return this.run({ type: 'finding', op: 'delete', id });
  }

  validate({ findingId, verdict, validator, evidenceIds, notes, metadata }) {
    return this.run({ type: 'validation', op: 'add', findingId, verdict, validator, evidenceIds, notes, metadata });
  }

  setCoverage({ axis, assetId, result, note, evidenceIds }) {
    return this.run({ type: 'coverage', op: 'set', axis, assetId, result, note, evidenceIds });
  }

  recordReport({ path, by, memberName, bytes, gaps, wordPath, templateId, evidenceVersion, evidenceChecks }) {
    return this.run({
      type: 'report', op: 'record', path, by, memberName, bytes, gaps, wordPath, templateId,
      ...(evidenceVersion ? { evidenceVersion } : {}),
      ...(Array.isArray(evidenceChecks) ? { evidenceChecks } : {})
    });
  }
}

export { V4_VERSION };
