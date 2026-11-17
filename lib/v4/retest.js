/**
 * P2-10 independent retest tri-state.
 *
 * ARTEX/DSH principles: a single failed reproduction is NOT proof a finding
 * is fixed. "fixed" requires a comparable environment, a normal control
 * showing the target still responds, and at least two consistent attempts.
 * Everything else is "inconclusive" and blocks delivery. This is a pure
 * evaluator: it never loosens the existing validateWorkerPayload / evidence
 * gates and never mutates state.
 */
export const RETEST_VERDICTS = ['reproduced', 'fixed', 'inconclusive'];

function text(value) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function boundedArray(value, max = 16) {
  return Array.isArray(value) ? value.slice(0, max) : [];
}

function proofEvidence(evidence) {
  return boundedArray(evidence).filter((item) => item && typeof item === 'object')
    .filter((item) => ['proof', 'verification'].includes(text(item.role)))
    .filter((item) => text(item.sha256).trim() || text(item.body).trim() || text(item.path).trim());
}

/**
 * Evaluate one independent retest.
 * @returns {{verdict:string, reason:string, requirements:string[]}}
 */
export function evaluateRetest({
  priorFinding = null,
  priorEvidence = [],
  currentEvidence = [],
  attempts = [],
  comparableEnvironment = true,
  normalControl = null,
  now = 0
} = {}) {
  const requirements = [];
  if (!priorFinding || typeof priorFinding !== 'object') {
    return { verdict: 'inconclusive', reason: 'entry hard-gate: priorFinding is required', requirements: ['provide the original finding'] };
  }
  const current = boundedArray(currentEvidence);
  const prior = boundedArray(priorEvidence);
  const attemptRows = boundedArray(attempts);
  const controls = boundedArray(normalControl);
  const proofs = proofEvidence(current);

  // Reproduced wins over fixed: if fresh proof evidence exists, the issue is
  // still live regardless of any "failed to reproduce" attempts.
  if (proofs.length > 0) {
    return {
      verdict: 'reproduced',
      reason: 'independent proof/verification evidence is present in the retest',
      requirements: []
    };
  }

  if (!comparableEnvironment) requirements.push('retest must run in a comparable environment');
  if (controls.length === 0) requirements.push('a normal control response is required');
  else if (!controls.some((c) => c && (c.ok === true || c.healthy === true || text(c.status) === '200'))) {
    requirements.push('normal control must show the target still responds normally');
  }
  const consistentFailures = attemptRows.filter((a) => a && (a.reproduced === false || text(a.result) === 'not_reproduced'));
  if (consistentFailures.length < 2) requirements.push('at least two consistent non-reproduction attempts are required');
  if (current.length === 0) requirements.push('retest evidence is required');

  if (requirements.length === 0) {
    return {
      verdict: 'fixed',
      reason: 'comparable environment + normal control + at least two consistent non-reproductions',
      requirements: []
    };
  }
  return {
    verdict: 'inconclusive',
    reason: 'insufficient evidence to declare fixed; a single failure never proves remediation',
    requirements
  };
}

/** Bounded aggregate with a delivery gate. */
export function aggregateRetests(results = []) {
  const rows = boundedArray(results, 100).map((r) => (r && typeof r === 'object' ? r : {}));
  const counts = { reproduced: 0, fixed: 0, inconclusive: 0 };
  const blockers = [];
  for (const row of rows) {
    const verdict = RETEST_VERDICTS.includes(row.verdict) ? row.verdict : 'inconclusive';
    counts[verdict] += 1;
    if (verdict === 'inconclusive') {
      blockers.push(`${text(row.findingId || '(unknown)')}: ${text(row.reason || 'unverified retest')}`);
    }
  }
  return {
    total: rows.length,
    counts,
    deliverable: blockers.length === 0,
    blockers: blockers.slice(0, 20)
  };
}
