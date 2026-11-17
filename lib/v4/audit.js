/**
 * Selected findings the auditor still has to review.
 * Pure; the ONE audit-state rule lives in policy.js and is the same rule the
 * projection/UI use. No local re-derivation, so 待审核 can never disagree.
 */
import { auditStateOf } from './policy.js';

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

export function selectAuditCandidates(state, options = {}) {
  const now = Number(options.now) || Date.now();
  const cooldown = options.cooldown instanceof Map ? options.cooldown : new Map();
  const sessionId = String(state?.sessionId || options.sessionId || '');
  const validations = state?.validations || [];
  return (Array.isArray(state?.findings) ? state.findings : [])
    .filter((finding) => finding && finding.deleted !== true && finding.severity !== 'info')
    // A red-line finding may need a human "approval" before any *write*, but
    // auditing it is read-only: keeping pending findings out of the queue left
    // a false critical (`/open/user/init`) unverified forever. Denied findings
    // stay excluded; pending ones are audited and can be downgraded.
    .filter((finding) => finding.approvalStatus !== 'denied')
    .filter((finding) => auditStateOf(finding, validations) === 'pending')
    .filter((finding) => (Number(cooldown.get(`${sessionId}:${finding.id}`)) || 0) <= now)
    .slice()
    .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .map((finding) => finding.id);
}
