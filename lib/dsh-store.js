/**
 * DSH storage adapter for the v2 state kernel.
 *
 * 线上只允许一行动态 state；旧表只读迁移。
 * 这里不依赖具体 storage-domain 实现，便于注入假表测试。
 */

import { appendPluginRecord } from '@deepseek-ai/dsh-session';
import crypto from 'node:crypto';
import { PentestStateStore } from './store.js';
import { snapshotEvent, jsonSafe } from './projection.js';
import { shouldEmitSnapshot } from './snapshot-gate.js';

export function createStateTableAdapter(table) {
  if (!table || typeof table.get !== 'function' || typeof table.put !== 'function') {
    throw new Error('v2 state table adapter requires get/put');
  }
  return {
    async load(sessionId) {
      const row = await table.get(sessionId);
      return row && row.state ? row.state : undefined;
    },
    async save(sessionId, state) {
      await table.put(sessionId, { sessionId, revision: state.revision, state });
    },
    async delete(sessionId) {
      if (typeof table.delete === 'function') await table.delete(sessionId);
    }
  };
}

const lastSnapshotRevision = new Map();
const lastSnapshotGoal = new Map();
const lastSnapshotFindings = new Map();
const lastSnapshotHash = new Map();

function digestSnapshot(record) {
  return crypto.createHash('sha256').update(JSON.stringify(record)).digest('hex');
}

function findingFingerprint(findings, onlyCriticalHigh = false) {
  const rows = (Array.isArray(findings) ? findings : [])
    .filter((item) => !onlyCriticalHigh || ['critical', 'high'].includes(item?.severity))
    .map((item) => [item?.id || '', item?.status || '', item?.severity || '', item?.deleted === true ? 1 : 0, item?.approvalStatus || '']);
  rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  return JSON.stringify(rows);
}

export function createDshStateStore({ table, sessions, now, appendRecord = appendPluginRecord, reduce }) {
  const adapter = createStateTableAdapter(table);
  return new PentestStateStore({
    ...(reduce ? { reduce } : {}),
    load: adapter.load,
    save: adapter.save,
    append: async (sessionId, event) => {
      // [OOM fix 2026-10-29] every mutation used to append a 200-400 KB
      // projection snapshot (300+ MB over 1600 revisions -> renderer OOM).
      // Snapshot is still the only live UI channel: keep every revision for the
      // first 50 (new sessions must show intents/facts immediately), then
      // throttle to every 10 revisions plus every goal phase/pause change.
      const revision = Number(event?.data?.revision ?? 0);
      const last = lastSnapshotRevision.get(sessionId) ?? 0;
      const nextGoal = event?.data?.state?.goal;
      const previousGoal = lastSnapshotGoal.get(sessionId);
      const goalChanged = previousGoal === undefined
        ? true
        : previousGoal === null || nextGoal === null || nextGoal === undefined
          ? previousGoal !== nextGoal
          : previousGoal.phase !== nextGoal.phase || Boolean(previousGoal.paused) !== Boolean(nextGoal.paused);
      // Always surface goal phase/paused changes (UI pause/block/resume). New
      // sessions emit every revision up to 50, then every 10 revisions.
      // Same-revision dedupe: reads used to re-emit an identical snapshot on
      // every call, which produced 697 events / 26.9 MB for a 39-revision
      // session. Only an explicit reproject (force) may repeat a revision.
      const force = event?.force === true;
      const findings = event?.data?.state?.findings;
      const findingState = findingFingerprint(findings);
      const criticalHighState = findingFingerprint(findings, true);
      const previousFindingState = lastSnapshotFindings.get(sessionId);
      const findingStateChanged = previousFindingState !== undefined
        && previousFindingState.all !== findingState;
      const criticalHighChanged = previousFindingState !== undefined
        && previousFindingState.criticalHigh !== criticalHighState;
      const evidenceCount = Array.isArray(event?.data?.state?.evidence)
        ? event.data.state.evidence.length
        : 0;
      if (!shouldEmitSnapshot({
        revision, last, goalChanged, force, evidenceCount, findingStateChanged, criticalHighChanged
      })) return;
      const session = typeof sessions?.get === 'function' ? sessions.get(sessionId) : undefined;
      if (session && typeof session.append === 'function') {
        // 外部插件事件必须用 plugin: 命名空间并带 ignorable，否则 DSH 重启读日志会拒绝。
        // jsonSafe is essential: v3 ViewModel can carry undefined fields from
        // partial findings. DSH's append validator rejects the whole event for
        // undefined/-0, which used to persist state without emitting a snapshot.
        const fullState = jsonSafe(event.data?.state ?? null);
        // The installed pentest UI projection only understands full state
        // snapshots, so keep the wire event full. The OOM fix is the removed
        // force-reproject plus the snapshot gate, not a patch-only wire format.
        const record = jsonSafe({ revision: event.data?.revision ?? 0, state: fullState });
        const snapshotHash = digestSnapshot(fullState);
        // Content dedupe is independent of force: a manual reproject of an
        // unchanged state must not append another full snapshot.
        if (lastSnapshotHash.get(sessionId) === snapshotHash) return;
        try {
          appendRecord(session, 'plugin:pentest/state', record);
          lastSnapshotRevision.set(sessionId, revision);
          lastSnapshotGoal.set(sessionId, nextGoal ? { phase: nextGoal.phase, paused: Boolean(nextGoal.paused) } : null);
          lastSnapshotFindings.set(sessionId, { all: findingState, criticalHigh: criticalHighState });
          lastSnapshotHash.set(sessionId, snapshotHash);
        } catch (error) {
          // 非 DSH Session 的测试替身没有 #appendRecord；退回普通 append。
          if (appendRecord !== appendPluginRecord) throw error;
          try {
            session.append('plugin:pentest/state', record);
            lastSnapshotRevision.set(sessionId, revision);
            lastSnapshotGoal.set(sessionId, nextGoal ? { phase: nextGoal.phase, paused: Boolean(nextGoal.paused) } : null);
            lastSnapshotFindings.set(sessionId, { all: findingState, criticalHigh: criticalHighState });
            lastSnapshotHash.set(sessionId, snapshotHash);
          } catch (fallbackError) {
            // Snapshot is a derived read model, not the source of truth. A
            // committed state mutation must not fail just because the UI event
            // was rejected; the next pentest_state/reproject re-emits it.
            console.warn('[pentest] snapshot append failed; state committed, will reproject on next read:', fallbackError?.message || fallbackError);
          }
        }
      }
    },
    now
  });
}

/** 每次提交后给 UI 的 projection 快照；适配器可用于 sessionProjections.apply。 */
export function projectionFromEvent(event) {
  if (!event || event.type !== 'pentest/state') return undefined;
  return snapshotEvent(event.data?.state ?? event.data);
}
