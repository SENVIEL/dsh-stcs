/**
 * P0-3 evidence versioning.
 *
 * A report is a snapshot of findings + the evidence bytes behind them. If a
 * worker later binds/replaces evidence, a revision-only freshness check is
 * insufficient: the old report still claims to describe the current evidence.
 *
 * This module computes a private, content-addressed evidence version from the
 * canonical evidence set (id + sha256 + role). It never reads files and never
 * mutates state. The version is stored on state.report when a report is
 * recorded, then compared by delivery/status to mark a report stale.
 */
import crypto from 'node:crypto';

export const EVIDENCE_VERSION_PREFIX = 'ev-ver-';

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

/** Stable digest over canonical evidence identities and content hashes. */
export function evidenceVersion(state) {
  const rows = (Array.isArray(state?.evidence) ? state.evidence : [])
    .map((item) => ({
      id: text(item?.id),
      sha256: text(item?.sha256).toLowerCase(),
      role: text(item?.role),
      path: text(item?.path)
    }))
    .filter((item) => item.id || item.sha256)
    .sort((a, b) =>
      a.id.localeCompare(b.id) || a.sha256.localeCompare(b.sha256) || a.path.localeCompare(b.path));
  const canonical = JSON.stringify(rows);
  return EVIDENCE_VERSION_PREFIX + crypto.createHash('sha256').update(canonical).digest('hex');
}

/** Snapshot of the current evidence version; safe to keep in private state. */
export function snapshotEvidenceVersion(state) {
  return {
    version: evidenceVersion(state),
    count: (Array.isArray(state?.evidence) ? state.evidence : []).length,
    at: Date.now()
  };
}

/**
 * Compare a recorded report against the current evidence set.
 * `recordedVersion` missing means a pre-P0-3 report: treat it as unverifiable
 * rather than silently fresh.
 */
export function reportEvidenceStatus(state, recordedVersion = null) {
  const current = evidenceVersion(state);
  const recorded = text(recordedVersion);
  if (!recorded) return { stale: true, reason: 'no-evidence-version', current, recorded: null };
  if (recorded === current) return { stale: false, reason: 'match', current, recorded };
  return { stale: true, reason: 'evidence-changed', current, recorded };
}

/**
 * Deterministic reporter gate: check that every evidence id referenced by a
 * reportable finding resolves to a current evidence row with a content hash.
 * Returns a bounded list of problems; empty means the reporter may write.
 */
export function verifyReportEvidenceRoles(state) {
  const byId = new Map((Array.isArray(state?.evidence) ? state.evidence : [])
    .map((item) => [text(item?.id), item]));
  const problems = [];
  const findings = (Array.isArray(state?.findings) ? state.findings : [])
    .filter((item) => item?.deleted !== true && item?.severity !== 'info');
  for (const finding of findings) {
    const ids = Array.isArray(finding.evidenceIds) ? finding.evidenceIds : [];
    if (ids.length === 0) {
      problems.push(`${finding.id}: no evidenceIds`);
      continue;
    }
    for (const id of ids) {
      const row = byId.get(text(id));
      if (!row) problems.push(`${finding.id}: missing evidence ${id}`);
      else if (!text(row.sha256).trim()) problems.push(`${finding.id}: evidence ${id} has no sha256`);
    }
    const roles = ids.map((id) => text(byId.get(text(id))?.role));
    if (!roles.includes('proof') && !roles.includes('verification')) {
      problems.push(`${finding.id}: needs a proof or verification evidence role`);
    }
  }
  return problems;
}

/** Group evidence by role for the reporter's baseline/proof/verification pass. */
export function evidenceByRole(state) {
  const out = { baseline: [], proof: [], verification: [], supporting: [], counter: [] };
  for (const item of (Array.isArray(state?.evidence) ? state.evidence : [])) {
    const role = text(item?.role);
    if (Object.hasOwn(out, role)) out[role].push({
      id: text(item?.id), path: text(item?.path), sha256: text(item?.sha256), summary: text(item?.summary)
    });
  }
  return out;
}
