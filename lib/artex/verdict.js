/**
 * STCS graded verdicts.
 *
 * The canonical audit rule (`policy.auditStateOf`) is deliberately untouched:
 * only an auditor conclusion makes a finding "audited". This module adds a
 * display/decision tier on top of the same validation rows and never writes
 * state itself.
 */
import { asArray, text } from './util.js';

export const ARTEX_TIERS = [
  'confirmed_deterministic',
  'confirmed_reproduced',
  'preview',
  'not_reproduced',
  'inconclusive'
];

export const AUDITED_TIERS = new Set(['confirmed_deterministic', 'confirmed_reproduced']);

export function isAuditedTier(tier) {
  return AUDITED_TIERS.has(text(tier));
}

function evidenceMap(evidence) {
  const map = new Map();
  for (const item of asArray(evidence)) {
    if (item && item.id) map.set(text(item.id), item);
  }
  return map;
}

function hasProofEvidence(finding, byId) {
  const ids = asArray(finding?.evidenceIds).map((item) => text(item)).filter(Boolean);
  if (ids.length === 0) return false;
  if (byId.size === 0) return true;
  return ids.some((id) => {
    const row = byId.get(id);
    return !row || ['proof', 'verification', 'supporting'].includes(text(row.role));
  });
}

function hasRequestAndResponse(finding, byId) {
  const ids = asArray(finding?.evidenceIds).map((item) => text(item)).filter(Boolean);
  if (ids.length === 0) return false;
  const kinds = new Set();
  for (const id of ids) {
    const row = byId.get(id);
    if (row?.kind) kinds.add(text(row.kind));
  }
  return kinds.has('request') && kinds.has('response');
}

/**
 * Tier for one finding:
 * - confirmed_deterministic: auditor reproduced + worker marked confirmed +
 *   request AND response evidence (the closest honest proxy for a
 *   deterministic check; no container-level deterministic runner exists);
 * - confirmed_reproduced: auditor reproduced (everything else);
 * - preview: proof evidence exists but no auditor conclusion yet;
 * - not_reproduced / inconclusive: the auditor's latest verdict.
 */
export function verdictTierOf(finding, validations = [], evidence = []) {
  if (!finding || finding.deleted === true || finding.severity === 'info') return null;
  const byId = evidenceMap(evidence);
  const latest = latestAuditorValidationFor(validations, finding.id);
  const auditorConclusion = Boolean(latest);
  if (!auditorConclusion) {
    return hasProofEvidence(finding, byId) ? 'preview' : 'inconclusive';
  }
  if (text(latest.verdict) === 'reproduced') {
    if (text(finding.verificationLevel) === 'confirmed' && hasRequestAndResponse(finding, byId)) {
      return 'confirmed_deterministic';
    }
    return 'confirmed_reproduced';
  }
  if (text(latest.verdict) === 'not_reproduced') return 'not_reproduced';
  return 'inconclusive';
}

function latestAuditorValidationFor(validations, findingId) {
  const id = text(findingId);
  if (!id) return undefined;
  return asArray(validations)
    .filter((item) => item
      && text(item.findingId) === id
      && text(item.validator) === 'agent:pentest-auditor'
      && item.superseded !== true)
    .slice()
    .sort((a, b) => (Number(a.at) || 0) - (Number(b.at) || 0))
    .at(-1);
}

export function summarizeTiers(state) {
  const validations = asArray(state?.validations);
  const evidence = asArray(state?.evidence);
  const counts = Object.fromEntries(ARTEX_TIERS.map((tier) => [tier, 0]));
  let pendingAudit = 0;
  let audited = 0;
  let total = 0;
  for (const finding of asArray(state?.findings)) {
    if (!finding || finding.deleted === true || finding.severity === 'info') continue;
    total += 1;
    const tier = verdictTierOf(finding, validations, evidence);
    if (tier) counts[tier] += 1;
    if (!latestAuditorValidationFor(validations, finding.id)) pendingAudit += 1;
    if (isAuditedTier(tier)) audited += 1;
  }
  return {
    total,
    ...counts,
    audited,
    pendingAudit,
    preview: counts.preview
  };
}

export function tierLabel(tier) {
  return {
    confirmed_deterministic: '已审核·确定性',
    confirmed_reproduced: '已审核·独立复现',
    preview: '预览·待审核',
    not_reproduced: '未复现',
    inconclusive: '不确定'
  }[text(tier)] || text(tier);
}
