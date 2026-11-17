/**
 * v2 tool handlers — 与传输层解耦，便于用 memory store 单测。
 * 所有 handler 只做参数校验 + store.mutate/read；不做 UI、不 spawn、不读环境。
 */

import fs from 'node:fs';
import pathMod from 'node:path';
import { createState } from './state.js';
import { migrateToV3 } from './migrate-v3.js';
import { buildReport, reportToHtml } from './report.js';
import { auditEvidence } from './evidence-v3.js';

function text(value) {
  return String(value ?? '').trim();
}

function ensureSessionId(sessionId) {
  if (!sessionId) throw new Error('pentest: no owning session');
  return sessionId;
}

/** Internal member-report entries are bookkeeping, not runnable directions. */
function isInternalReportDirection(title, detail = '') {
  return /成员回报汇总|事实入口|不是探索方向/.test(String(title || '') + ' ' + String(detail || ''));
}

export function createHandlers({ store, now = () => Date.now(), legacyState }) {
  // 最近一次生成报告时对应的 state revision；用于交付一致性检查。
  const lastReports = new Map();
  async function requireState(sessionId) {
    const state = await store.read(sessionId);
    if (!state) throw new Error('pentest engagement is not initialized; call pentest_add_goal first');
    return state;
  }

  return {
    async migrate({ sessionId }) {
      ensureSessionId(sessionId);
      const existing = await store.read(sessionId);
      if (existing) {
        if (typeof store.reproject === 'function') await store.reproject(sessionId);
        if (Number(existing.version) >= 3) {
          return {
            migrated: false,
            alreadyV3: true,
            revision: existing.revision,
            directions: (existing.directions || []).length,
            findings: (existing.findings || []).length,
            queue: (existing.queue || []).length
          };
        }
        return { migrated: false, repaired: true, revision: existing.revision, intents: existing.intents.length, queue: existing.queue.length };
      }
      if (typeof legacyState !== 'function') throw new Error('pentest_migrate: legacy reader unavailable');
      const state = await legacyState(sessionId);
      if (!state) throw new Error('pentest_migrate: no legacy engagement found for this session');
      await store.create(sessionId, state);
      return {
        migrated: true,
        revision: state.revision,
        intents: state.intents.length,
        queue: state.queue.length,
        findings: state.findings.length
      };
    },

    /**
     * Explicit v2 -> v3 schema migration. Dry-run by default; write=true
     * replaces one state row and emits a v3 snapshot. Callers should backup the
     * store file before a bulk migration (tools/migrate-live-v3.mjs does).
     */
    async migrateV3({ sessionId, write = false }) {
      ensureSessionId(sessionId);
      const current = await requireState(sessionId);
      if (Number(current.version) >= 3) {
        return { alreadyV3: true, revision: current.revision, directions: current.directions?.length || 0, findings: current.findings?.length || 0 };
      }
      const migrated = migrateToV3(current, { now: now() });
      if (write !== true) {
        return { dryRun: true, ...migrated.stats, revision: current.revision };
      }
      const state = await store.replace(sessionId, migrated.state);
      return {
        migrated: true,
        revision: state.revision,
        directions: state.directions.length,
        findings: state.findings.length,
        stats: migrated.stats
      };
    },

    /**
     * 第一次访问旧会话时自动迁移；不让“旧会话继续跑”变成空状态。
     * 无旧数据时保持未初始化，由 add_goal 初始化。
     */
    async ensure({ sessionId }) {
      ensureSessionId(sessionId);
      const existing = await store.read(sessionId);
      if (existing) return existing;
      if (typeof legacyState !== 'function') return undefined;
      let legacy;
      try {
        legacy = await legacyState(sessionId);
      } catch {
        return undefined;
      }
      if (!legacy) return undefined;
      await store.create(sessionId, legacy);
      return legacy;
    },

    async addGoal({ sessionId, target, objective, authorization, workdir, targets, excludedTargets }) {
      ensureSessionId(sessionId);
      const existing = await store.read(sessionId);
      if (!existing) {
        const at = now();
        const base = createState({ sessionId, target, objective, authorization, workdir, targets, excludedTargets, now: at });
        const { state } = migrateToV3(base, { now: at });
        await store.create(sessionId, state);
        return {
          initialized: true,
          version: state.version,
          goalId: state.goal.id,
          target: state.goal.target,
          objective: state.goal.objective,
          workdir: state.goal.workdir,
          targets: state.goal.targets || [],
          excludedTargets: state.goal.excludedTargets || []
        };
      }
      // A goal's workspace is created once. Later add_goal calls must not move
      // it (that would orphan SCOPE/evidence and break the workspace boundary).
      const existingWorkdir = text(existing.state?.goal?.workdir ?? existing.goal?.workdir);
      let effectiveWorkdir = workdir;
      let workdirKept = false;
      if (existingWorkdir !== '') {
        const requested = text(workdir);
        if (requested !== '' && pathMod.resolve(requested) !== pathMod.resolve(existingWorkdir)) {
          effectiveWorkdir = existingWorkdir;
          workdirKept = true;
        }
      }
      const out = await store.mutate(sessionId, {
        type: 'goal', op: 'set', target, objective, authorization, workdir: effectiveWorkdir, targets, excludedTargets, now: now()
      });
      return {
        initialized: true,
        goalId: out.state.goal.id,
        target: out.state.goal.target,
        objective: out.state.goal.objective,
        workdir: out.state.goal.workdir,
        workdirKept,
        targets: out.state.goal.targets || [],
        excludedTargets: out.state.goal.excludedTargets || [],
        updated: true
      };
    },

    async setScope({ sessionId, targets, excludedTargets }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'scope', targets, excludedTargets, now: now() });
      return { targets: out.state.goal.targets || [], excludedTargets: out.state.goal.excludedTargets || [] };
    },

    async addIntent({ sessionId, title, detail, doneWhen, dependsOn, priority, fromFactId, kind, budget, maxCalls, maxMs, maxEvidence }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'intent', op: 'add', title, detail, doneWhen, dependsOn, priority, fromFactId, kind, now: now()
      });
      const direction = out.result;
      if (isInternalReportDirection(direction.title, direction.detail)) {
        try {
          await store.mutate(sessionId, {
            type: 'intent', op: 'set', id: direction.id, state: 'done',
            reason: '内部汇总入口，不进入任务队列', now: now()
          });
        } catch { /* state persistence is best effort; do not create a task */ }
        return { ...direction, state: 'done', taskId: null };
      }
      // Phase 5: every runnable direction gets exactly one queue task.
      try {
        const active = (out.state.queue || []).find((task) => task.intentId === direction.id && ['pending', 'claimed', 'running'].includes(task.state));
        if (!active) {
          const queued = await store.mutate(sessionId, {
            type: 'queue', op: 'push', intentId: direction.id, title: direction.title, priority: direction.priority,
            payload: { directionKind: direction.kind }, budget, maxCalls, maxMs, maxEvidence, now: now()
          });
          return { ...direction, taskId: queued.result.task.id, task: queued.result.task };
        }
        return { ...direction, taskId: active.id, task: active };
      } catch {
        return direction;
      }
    },

    /** Pause scheduling and all active pentest work without ending the goal. */
    async pauseAll({ sessionId, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'goal', op: 'pause', reason: String(reason || 'user'), now: now()
      });
      return {
        paused: true,
        goalPhase: out.result?.phase || 'active',
        pausedAt: out.result?.pausedAt || null,
        reason: String(reason || 'user')
      };
    },

    /** Resume a previously paused goal; the sidecar picks pending tasks up again. */
    async resumeAll({ sessionId }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'goal', op: 'resume', now: now()
      });
      return { paused: false, goalPhase: out.result?.phase || 'active' };
    },

    /** Re-emit the current snapshot after an append was rejected previously. */
    async reproject({ sessionId }) {
      ensureSessionId(sessionId);
      // Explicit reproject must bypass the same-revision dedupe: it exists to
      // repair a UI that missed the snapshot for the current revision.
      const state = await store.reproject(sessionId, { force: true });
      return {
        reprojected: true,
        revision: state.revision,
        directions: (state.directions || state.intents || []).length,
        findings: (state.findings || []).length,
        assets: (state.assets || []).length
      };
    },

    /** Phase 5: repair a graph whose directions predate auto-task creation. */
    async syncQueue({ sessionId }) {
      ensureSessionId(sessionId);
      const state = await requireState(sessionId);
      const directions = Number(state.version) >= 3 ? (state.directions || []) : (state.intents || []);
      const active = new Set((state.queue || [])
        .filter((task) => ['pending', 'claimed', 'running'].includes(task.state))
        .map((task) => task.directionId || task.intentId));
      const created = [];
      for (const direction of directions) {
        if (['done', 'exhausted', 'blocked', 'stopped'].includes(direction.state)) continue;
        if (isInternalReportDirection(direction.title, direction.detail)) continue;
        if (active.has(direction.id)) continue;
        try {
          const out = await store.mutate(sessionId, {
            type: 'queue', op: 'push', intentId: direction.id, title: direction.title,
            priority: direction.priority, payload: { directionKind: direction.kind }, now: now()
          });
          created.push(out.result.task.id);
        } catch { /* keep syncing the remaining directions */ }
      }
      return { created, count: created.length };
    },

    async updateIntent({ sessionId, intentId, state, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'intent', op: 'set', id: intentId, state, reason, now: now() });
      return out.result;
    },

    async addFact({ sessionId, intentId, kind, target, detail, confidence, evidenceRefs, author }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'fact', op: 'add', intentId, kind, target, detail, confidence, evidenceRefs, author, now: now()
      });
      return out.result;
    },

    async addAsset({ sessionId, assetType, value, meta, parentId, inScope, author }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'asset', op: 'add', assetType, value, meta, parentId, inScope, author, now: now()
      });
      return out.result;
    },

    async addFinding({ sessionId, intentId, fromFactId, title, severity, ...fields }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'finding', op: 'add',
        intentId,
        fromFactId,
        title,
        severity,
        ...fields,
        sourceStatus: (text(intentId) || text(fromFactId)) ? 'linked' : 'unbound',
        now: now()
      });
      return { ...out.result, sourceStatus: (text(intentId) || text(fromFactId)) ? 'linked' : 'unbound' };
    },

    async updateFinding({ sessionId, id, ...fields }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'finding', op: 'update',
        id,
        ...fields,
        ...(text(fields.intentId) ? { sourceStatus: 'linked' } : {}),
        now: now()
      });
      return { ...out.result, ...(text(fields.intentId) ? { sourceStatus: 'linked' } : {}) };
    },

    async validateFinding({ sessionId, id, findingId, verdict, evidenceRefs, notes, validator }) {
      ensureSessionId(sessionId);
      const targetId = String(id || findingId || '');
      if (!targetId) throw new Error('validation requires id or findingId');
      const allowed = new Set(['reproduced', 'not_reproduced', 'inconclusive']);
      if (!allowed.has(String(verdict || ''))) throw new Error('validation verdict must be reproduced/not_reproduced/inconclusive');
      const at = now();
      const out = await store.mutate(sessionId, {
        type: 'finding', op: 'update', id: targetId,
        validation: {
          verdict: String(verdict),
          evidenceRefs: Array.isArray(evidenceRefs) ? evidenceRefs.filter((item) => typeof item === 'string' && item !== '') : [],
          notes: String(notes ?? ''),
          validator: String(validator ?? ''),
          at
        },
        now: at
      });
      return out.result;
    },

    async retestFinding({ sessionId, id, findingId, verdict, summary }) {
      ensureSessionId(sessionId);
      const targetId = String(id || findingId || '');
      if (!targetId) throw new Error('retest requires id or findingId');
      const at = now();
      const out = await store.mutate(sessionId, {
        type: 'finding', op: 'update', id: targetId,
        retest: { verdict: String(verdict ?? ''), summary: String(summary ?? ''), at },
        now: at
      });
      return out.result;
    },

    async addCoverage({ sessionId, surface, riskArea, outcome, evidence, author }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'coverage', op: 'add', surface, riskArea, outcome, evidence, author, now: now() });
      return out.result;
    },

    async addDigest({ sessionId, title, summary, factIds }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'digest', op: 'add', title, summary, factIds, now: now() });
      return out.result;
    },

    /**
     * 成员批量提交：facts/assets/findings 逐条落库；线索类 fact 自动生成本地验证 intent。
     * 返回每条结果，任何一条失败都显式返回，不静默丢弃。
     */
    async submit({ sessionId, intentId, facts, assets, findings }) {
      ensureSessionId(sessionId);
      const state0 = await requireState(sessionId);
      const targetIntent = String(intentId || '');
      const knownIntents = Number(state0.version) >= 3 ? (state0.directions || []) : (state0.intents || []);
      if (targetIntent && !knownIntents.some((intent) => intent.id === targetIntent)) {
        throw new Error(`pentest_submit: unknown intent ${targetIntent}`);
      }
      const result = { facts: [], assets: [], findings: [], followUpIntents: [], errors: [] };
      for (const fact of Array.isArray(facts) ? facts : []) {
        try {
          const out = await store.mutate(sessionId, {
            type: 'fact', op: 'add',
            intentId: targetIntent || String(fact.intentId || ''),
            kind: fact.kind, target: fact.target, detail: fact.detail,
            confidence: fact.confidence, evidenceRefs: fact.evidenceRefs,
            now: now()
          });
          result.facts.push(out.result.fact);
          const text = String(fact.detail || '');
          if (out.result.reused !== true && (String(fact.kind || '') === 'vuln' || /线索|疑似|未证实|待验证/.test(text))) {
            const title = ('验证: ' + text.replace(/^【[^】]*】/, '').trim()).slice(0, 80);
            const follow = await store.mutate(sessionId, {
              type: 'intent', op: 'add', title, detail: text.slice(0, 400),
              doneWhen: '确认或否证该线索', fromFactId: out.result.fact.id, now: now()
            });
            result.followUpIntents.push({ intentId: follow.result.id, factId: out.result.fact.id });
          }
        } catch (error) {
          result.errors.push({ kind: 'fact', detail: String(fact?.detail || '').slice(0, 120), error: String(error?.message || error) });
        }
      }
      for (const asset of Array.isArray(assets) ? assets : []) {
        try {
          const out = await store.mutate(sessionId, {
            type: 'asset', op: 'add', assetType: asset.type, value: asset.value,
            meta: asset.meta, parentId: asset.parentId, inScope: asset.inScope, now: now()
          });
          result.assets.push(out.result);
        } catch (error) {
          result.errors.push({ kind: 'asset', value: String(asset?.value || ''), error: String(error?.message || error) });
        }
      }
      for (const finding of Array.isArray(findings) ? findings : []) {
        try {
          const findingIntentId = String(finding.intentId || targetIntent || '');
          const out = await store.mutate(sessionId, {
            ...finding,
            type: 'finding', op: 'add',
            intentId: findingIntentId,
            fromFactId: finding.fromFactId,
            sourceStatus: (findingIntentId || finding.fromFactId) ? 'linked' : 'unbound',
            now: now()
          });
          result.findings.push({
            ...out.result,
            sourceStatus: (findingIntentId || finding.fromFactId) ? 'linked' : 'unbound'
          });
        } catch (error) {
          result.errors.push({ kind: 'finding', title: String(finding?.title || ''), error: String(error?.message || error) });
        }
      }
      return result;
    },

    async evidenceAudit({ sessionId }) {
      ensureSessionId(sessionId);
      const state = await requireState(sessionId);
      return auditEvidence(state);
    },

    async report({ sessionId, format = 'markdown' }) {
      ensureSessionId(sessionId);
      const state = await requireState(sessionId);
      const markdown = buildReport(state);
      const visibleFindings = (state.findings || []).filter((finding) => finding.deleted !== true);
      const openIntentSource = Number(state.version) >= 3 ? (state.directions || []) : (state.intents || []);
      const openIntents = openIntentSource.filter((intent) => intent.state === 'open' || intent.state === 'running').length;
      const audit = Number(state.version) >= 3 ? auditEvidence(state) : { ok: true, problems: [] };
      const result = {
        markdown,
        evidenceProblems: audit.problems,
        evidenceOk: audit.ok,
        findings: visibleFindings.length,
        facts: state.facts.length,
        assets: state.assets.length,
        coverage: Array.isArray(state.coverage) ? state.coverage.length : 0,
        revision: state.revision,
        openIntents
      };
      lastReports.set(sessionId, { revision: state.revision, at: now(), findings: visibleFindings.length });
      if (format === 'html') result.html = reportToHtml(markdown, `${state.goal?.target || '渗透测试'} — 渗透测试报告`);
      // A report that only exists in chat is not a deliverable. Persist it under
      // the engagement workdir so the artifact survives the session.
      const workdir = text(state.goal?.workdir);
      if (workdir !== '') {
        try {
          const reportsDir = pathMod.join(workdir, 'reports');
          fs.mkdirSync(reportsDir, { recursive: true });
          const markdownPath = pathMod.join(reportsDir, 'REPORT.md');
          fs.writeFileSync(markdownPath, markdown, 'utf8');
          result.reportPath = markdownPath;
          if (result.html) {
            const htmlPath = pathMod.join(reportsDir, 'REPORT.html');
            fs.writeFileSync(htmlPath, result.html, 'utf8');
            result.reportHtmlPath = htmlPath;
          }
        } catch (error) {
          result.reportError = error?.message || String(error);
        }
      } else {
        result.reportError = 'goal.workdir is empty; report was not written to disk';
      }
      return result;
    },

    async deleteFinding({ sessionId, id, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'finding', op: 'delete', id, reason, now: now() });
      return out.result;
    },

    /**
     * 交付前一致性检查：报告是否对应当前 revision、coverage/assets 是否缺失、
     * high/critical 是否完成独立验证、是否有未收口 intent/queue。
     */
    async deliveryCheck({ sessionId }) {
      ensureSessionId(sessionId);
      const state = await requireState(sessionId);
      const isV3 = Number(state.version) >= 3;
      const goal = state.goal || {};
      const visible = (state.findings || []).filter((finding) => finding.deleted !== true);
      const intentSource = isV3 ? (state.directions || []) : (state.intents || []);
      const openIntents = intentSource.filter((intent) => intent.state === 'open' || intent.state === 'running');
      const activeQueue = (state.queue || []).filter((task) => ['pending', 'claimed', 'running'].includes(task.state));
      const problems = [];
      const workdir = text(goal.workdir);
      const scopePath = workdir === '' ? '' : pathMod.join(pathMod.isAbsolute(workdir) ? workdir : pathMod.resolve(workdir), 'SCOPE.md');
      if (scopePath === '') problems.push('goal.workdir 为空，缺少 SCOPE.md 与独立工作目录');
      else if (!fs.existsSync(scopePath)) problems.push('缺少 ' + scopePath + '（授权与红线文件）');
      const sessionShort = String(sessionId).replace(/^session-/, '').slice(0, 8);
      if (workdir !== '' && sessionShort !== '' && !pathMod.basename(pathMod.normalize(workdir)).includes(sessionShort)) {
        problems.push('workdir 未按会话隔离（basename 应包含 ' + sessionShort + '），多个会话不能共用同一个根目录');
      }
      if (openIntents.length > 0) problems.push(openIntents.length + ' 个 open/running intent 未收口');
      if (activeQueue.length > 0) problems.push(activeQueue.length + ' 个活跃 queue task 未收口');
      if (visible.length > 0 && (!Array.isArray(state.coverage) || state.coverage.length === 0)) problems.push('有 findings 但 coverage=0，未记录覆盖情况');
      if (visible.length > 0 && (!Array.isArray(state.assets) || state.assets.length === 0)) problems.push('有 findings 但 assets=0，资产图缺失');
      if (!isV3) {
        const intentById = new Map(state.intents.map((intent) => [intent.id, intent]));
        const perIntent = new Map();
        for (const finding of visible) perIntent.set(finding.intentId, (perIntent.get(finding.intentId) || 0) + 1);
        const badLineage = visible.filter((finding) => {
          const intent = intentById.get(finding.intentId);
          return !intent || intent.kind !== 'verify' || intent.autoGenerated !== true || (perIntent.get(finding.intentId) || 0) > 1;
        });
        if (badLineage.length > 0) {
          problems.push(badLineage.length + ' 条 finding 没有专属 auto verify intent（或一个 intent 挂了多条），运行读取会自动修复；未修复前不要交付');
        }
      }
      const missingApiSources = visible.filter((finding) => {
        const lists = [finding.apiSources, finding.interfaceSources, finding.sourceFiles, finding.sources]
          .filter((value) => Array.isArray(value)).flat().filter(Boolean);
        const refs = [
          ...(Array.isArray(finding.evidenceRefs) ? finding.evidenceRefs : []),
          String(finding.trafficRef || '')
        ].filter(Boolean);
        return lists.length === 0 && !refs.some((ref) => /(?:\.js|\.mjs|\.ts|\.tsx|\.map|bundle|sourcemap)/i.test(ref));
      });
      if (missingApiSources.length > 0) {
        problems.push(missingApiSources.length + ' 条 finding 缺少接口来源 apiSources（JS bundle / 源文件 / 路由定义位置），报告会显示未记录');
      }
      const missingStepNotes = visible.filter((finding) => {
        if (isV3) {
          const steps = Array.isArray(finding.steps) ? finding.steps : [];
          return steps.length > 0 && steps.some((step) => !text(step.note));
        }
        const steps = (Array.isArray(finding.reproducibleSteps) && finding.reproducibleSteps.length > 0)
          ? finding.reproducibleSteps
          : (Array.isArray(finding.steps) ? finding.steps : []);
        const notes = Array.isArray(finding.stepNotes) ? finding.stepNotes.filter(Boolean) : [];
        return steps.length > 0 && notes.length < steps.length;
      });
      if (missingStepNotes.length > 0) {
        problems.push(missingStepNotes.length + ' 条 finding 的 stepNotes 少于可复现步骤数，报告只能用兜底说明');
      }
      const severe = visible.filter((finding) => finding.severity === 'critical' || finding.severity === 'high');
      const unvalidated = severe.filter((finding) => {
        const validation = isV3
          ? (state.validations || []).find((item) => item.findingId === finding.id)
          : finding.validation;
        const evidenceIds = Array.isArray(finding.evidenceIds) ? finding.evidenceIds.filter(Boolean) : [];
        const refs = Array.isArray(finding.evidenceRefs) ? finding.evidenceRefs.filter(Boolean) : [];
        return (validation?.verdict !== 'reproduced') && refs.length === 0 && evidenceIds.length === 0;
      });
      if (unvalidated.length > 0) problems.push(unvalidated.length + ' 条 high/critical 没有 reproduced validation 或 evidenceRefs');
      const keys = new Map();
      const duplicates = [];
      for (const finding of visible) {
        const key = text(finding.rootCauseKey || finding.dedupeKey || finding.title).toLowerCase();
        if (key === '') continue;
        if (keys.has(key)) duplicates.push({ key, ids: [keys.get(key), finding.id] });
        else keys.set(key, finding.id);
      }
      if (duplicates.length > 0) problems.push(duplicates.length + ' 组疑似重复 finding（同一 dedupeKey）');
      const markedDuplicates = visible.filter((finding) => /\[(重复|已并入|duplicate)/i.test(String(finding.title || '')));
      if (markedDuplicates.length > 0) problems.push(markedDuplicates.length + ' 条 finding 标题仍带「重复/已并入」标记，请用 pentest_delete_finding 清理');
      if (isV3) {
        const audit = auditEvidence(state);
        for (const problem of audit.problems) {
          if (!problems.includes(problem)) problems.push(problem);
        }
      }
      const directionIds = new Set((state.directions || []).map((direction) => direction.id));
      const unboundFindings = visible.filter((finding) => (
        String(finding.sourceStatus || '') === 'unbound' ||
        !finding.directionId ||
        !directionIds.has(finding.directionId)
      ));
      const warnings = unboundFindings.length > 0
        ? [unboundFindings.length + ' 条 finding 未绑定真实 direction（sourceStatus=unbound）；探索期允许，交付前建议 link 或确认 engagement-level']
        : [];
      const last = lastReports.get(sessionId);
      if (!last) problems.push('尚未在本次会话生成 pentest_report');
      else if (last.revision !== state.revision) problems.push('报告已过期：报告基于 revision ' + last.revision + '，当前 revision ' + state.revision);
      return {
        ok: problems.length === 0,
        problems,
        warnings,
        unboundFindings: unboundFindings.map((finding) => ({ id: finding.id, title: finding.title, directionId: finding.directionId || null })),
        revision: state.revision,
        reportRevision: last ? last.revision : null,
        goalPhase: goal.phase || '',
        workdir,
        scopePath,
        findings: visible.length,
        coverage: Array.isArray(state.coverage) ? state.coverage.length : 0,
        assets: Array.isArray(state.assets) ? state.assets.length : 0,
        openIntents: openIntents.map((intent) => ({ id: intent.id, title: intent.title, state: intent.state })),
        duplicateKeys: duplicates
      };
    },


    async state({ sessionId, view = 'full', limit } = {}) {
      ensureSessionId(sessionId);
      const state = await requireState(sessionId);
      const isV3 = Number(state.version) >= 3;
      const mode = view === 'brief' ? 'brief' : 'full';
      // A read is a natural repair point: if a previous snapshot append was
      // rejected, re-emit the canonical snapshot so the 渗透 tab recovers.
      // Only the full view pays for it; brief reads must stay cheap.
      if (isV3 && mode === 'full') {
        try { await store.reproject(sessionId); } catch { /* read must not fail */ }
      }
      // ARTEX frontier: open/running intents are the only actionable work.
      // Highest priority first; running before open at equal priority.
      const stateRank = { running: 0, open: 1, exhausted: 2, blocked: 2, done: 3, stopped: 4 };
      const intentSource = isV3 ? state.directions : state.intents;
      const intents = (Array.isArray(intentSource) ? intentSource : []).slice().sort((a, b) => {
        const pa = Number(a.priority ?? 0);
        const pb = Number(b.priority ?? 0);
        if (pa !== pb) return pb - pa;
        return (stateRank[a.state] ?? 5) - (stateRank[b.state] ?? 5);
      });
      const realIntents = isV3 ? intents : intents.filter((intent) => intent.autoGenerated !== true);
      const autoIntents = isV3 ? [] : intents.filter((intent) => intent.autoGenerated === true);
      const frontier = realIntents.filter((intent) => intent.state === 'open' || intent.state === 'running');
      const visibleFindings = state.findings.filter((finding) => finding.deleted !== true);
      const counts = {
        intents: realIntents.length,
        ...(isV3 ? { directions: realIntents.length } : {}),
        autoIntents: autoIntents.length,
        frontier: frontier.length,
        facts: (state.facts || []).length,
        findings: visibleFindings.length,
        evidence: (state.evidence || []).length,
        validations: (state.validations || []).length,
        assets: (state.assets || []).length,
        queue: (state.queue || []).length,
        coverage: (state.coverage || []).length,
        digests: (state.digests || []).length
      };
      if (mode === 'brief') {
        // Context-budget view: counts + the few items the Lead actually acts on.
        // Deliberately excludes facts/evidence bodies; use pentest_query for those.
        const max = Math.min(50, Math.max(1, Number(limit) || 10));
        const validationByFinding = new Map((state.validations || []).map((item) => [item.findingId, item]));
        return {
          version: state.version,
          revision: state.revision,
          brief: true,
          goal: state.goal,
          counts,
          frontier: frontier.slice(0, max).map((intent) => ({
            id: intent.id,
            title: intent.title,
            kind: intent.kind,
            state: intent.state,
            priority: intent.priority,
            doneWhen: intent.doneWhen || '',
            axis: Array.isArray(intent.axis) ? intent.axis : (intent.axis ? [intent.axis] : []),
            conclusion: intent.conclusion?.answer || ''
          })),
          recentFacts: (state.facts || []).slice(-max).map((fact) => ({
            id: fact.id,
            directionId: fact.directionId || fact.intentId || '',
            kind: fact.kind,
            target: fact.target,
            answer: String(fact.detail || '').replace(/\s+/g, ' ').trim().slice(0, 160),
            confidence: fact.confidence,
            createdAt: fact.createdAt
          })),
          stuckTasks: (state.queue || [])
            .filter((task) => ['pending', 'claimed', 'running'].includes(task.state))
            .slice(0, max)
            .map((task) => ({
              id: task.id, title: task.title, state: task.state,
              workerId: task.workerId || '', leaseUntil: task.leaseUntil || 0, attempts: task.attempts || 0
            })),
          unvalidated: visibleFindings
            .filter((finding) => ['critical', 'high'].includes(finding.severity)
              && validationByFinding.get(finding.id)?.verdict !== 'reproduced')
            .slice(0, max)
            .map((finding) => ({ id: finding.id, title: finding.title, severity: finding.severity, evidenceStatus: finding.evidenceStatus })),
          note: 'brief view; pass view:"full" for the legacy payload or use pentest_query for paginated collections'
        };
      }
      return {
        version: state.version,
        revision: state.revision,
        goal: state.goal,
        intents: realIntents,
        autoIntents,
        frontier,
        facts: state.facts,
        findings: visibleFindings,
        evidence: state.evidence || [],
        validations: state.validations || [],
        assets: state.assets,
        edges: state.edges,
        queue: state.queue,
        coverage: state.coverage,
        digests: state.digests,
        counts
      };
    },

    async queuePush({ sessionId, intentId, title, priority, maxAttempts, payload, budget, maxCalls, maxMs, maxEvidence }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'push', intentId, title, priority, maxAttempts, payload,
        budget, maxCalls, maxMs, maxEvidence, now: now()
      });
      return out.result;
    },

    async queueSpend({ sessionId, taskId, workerId, calls, timeMs, evidence }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'spend', taskId, workerId, calls, timeMs, evidence, now: now()
      });
      return out.result;
    },

    async queueRenew({ sessionId, taskId, workerId, leaseMs }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'renew', taskId, workerId, leaseMs, now: now()
      });
      return out.result;
    },

    async queueClaim({ sessionId, workerId, leaseMs }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'queue', op: 'claim', workerId, leaseMs, now: now() });
      return out.result;
    },

    async queueAssign({ sessionId, taskId, workerId, leaseMs }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'queue', op: 'assign', taskId, workerId, leaseMs, now: now() });
      return out.result;
    },

    async queueComplete({ sessionId, taskId, workerId, summary, evidenceIds, findingIds }) {
      ensureSessionId(sessionId);
      const before = await store.read(sessionId);
      const task = (before?.queue || []).find((item) => item.id === taskId);
      let usageUnavailable = false;
      if (task && ['pending', 'claimed', 'running'].includes(task.state)) {
        const budget = task.budget || {};
        const evidenceCount = Array.isArray(evidenceIds) ? evidenceIds.length : 0;
        const findingCount = Array.isArray(findingIds) ? findingIds.length : 0;
        if ((evidenceCount > 0 || findingCount > 0) && !(Number(budget.calls) > 0) && !(Number(budget.evidence) > 0)) {
          await this.queueSpend({ sessionId, taskId, workerId, calls: 1, evidence: evidenceCount });
        }
        const afterSpend = await store.read(sessionId);
        const current = (afterSpend?.queue || []).find((item) => item.id === taskId) || task;
        const usage = current.budget || {};
        usageUnavailable = !(Number(usage.calls) > 0) && !(Number(usage.timeMs) > 0) && !(Number(usage.evidence) > 0);
      }
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'complete', taskId, workerId, summary, evidenceIds, findingIds, now: now()
      });
      return usageUnavailable ? { ...out.result, usageUnavailable: true } : out.result;
    },

    async queueFail({ sessionId, taskId, workerId, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'fail', taskId, workerId, reason, now: now()
      });
      return out.result;
    },

    async queueBindJob({ sessionId, taskId, workerId, jobId }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'bindJob', taskId, workerId, jobId, now: now()
      });
      return out.result;
    },

    async queueReconcile({ sessionId, liveWorkers }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, {
        type: 'queue', op: 'reconcile', liveWorkers, now: now()
      });
      return out.result;
    },

    async goalProve({ sessionId, evidenceId, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'prove', evidenceId, reason, now: now() });
      return { goal: out.result, proofs: out.result.proofs };
    },

    async goalComplete({ sessionId }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'complete', now: now() });
      return out.result;
    },

    async goalBlock({ sessionId, reason, kind }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'block', reason, kind, now: now() });
      return out.result;
    },

    async goalStop({ sessionId, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'stop', reason, now: now() });
      // stop/reopen 只改 goal 阶段，不改变报告内容；把最近报告 revision 跟上，避免误报 stale。
      const last = lastReports.get(sessionId);
      if (last && last.revision === out.state.revision - 1) lastReports.set(sessionId, { ...last, revision: out.state.revision });
      return out.result;
    },

    async goalReopen({ sessionId, reason }) {
      ensureSessionId(sessionId);
      const out = await store.mutate(sessionId, { type: 'goal', op: 'reopen', reason, now: now() });
      const last = lastReports.get(sessionId);
      if (last && last.revision === out.state.revision - 1) lastReports.set(sessionId, { ...last, revision: out.state.revision });
      return out.result;
    }
  };
}
