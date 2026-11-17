import assert from 'node:assert/strict'
import test from 'node:test'

import {
  evidenceVersion, snapshotEvidenceVersion, reportEvidenceStatus,
  verifyReportEvidenceRoles, evidenceByRole
} from '../lib/v4/evidence-version.js'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'

function baseState() {
  return createV4State({ sessionId: 's-p03', target: 'https://t.test', objective: 'o', now: 1 })
}

function withEvidence(overrides = []) {
  const state = baseState()
  state.evidence = [
    { id: 'evidence-1', kind: 'response', role: 'baseline', path: 'e/1.txt', sha256: 'a'.repeat(64), summary: 'base' },
    { id: 'evidence-2', kind: 'response', role: 'proof', path: 'e/2.txt', sha256: 'b'.repeat(64), summary: 'proof' },
    ...overrides
  ]
  return state
}

test('evidenceVersion is content-addressed and order-independent', () => {
  const a = withEvidence()
  const b = withEvidence()
  b.evidence = [...b.evidence].reverse()
  assert.equal(evidenceVersion(a), evidenceVersion(b))
  assert.match(evidenceVersion(a), /^ev-ver-[a-f0-9]{64}$/)
  b.evidence[0].sha256 = 'c'.repeat(64)
  assert.notEqual(evidenceVersion(a), evidenceVersion(b))
})

test('snapshot and reportEvidenceStatus detect changed evidence', () => {
  const state = withEvidence()
  const snap = snapshotEvidenceVersion(state)
  assert.equal(reportEvidenceStatus(state, snap.version).stale, false)
  const changed = withEvidence([{ id: 'evidence-3', kind: 'file', role: 'verification', path: 'e/3.txt', sha256: 'd'.repeat(64) }])
  const status = reportEvidenceStatus(changed, snap.version)
  assert.equal(status.stale, true)
  assert.equal(status.reason, 'evidence-changed')
  assert.equal(reportEvidenceStatus(state, null).reason, 'no-evidence-version')
})

test('verifyReportEvidenceRoles requires resolvable ids and a proof/verification role', () => {
  const state = withEvidence()
  state.findings = [
    { id: 'finding-1', severity: 'high', deleted: false, evidenceIds: ['evidence-2'] },
    { id: 'finding-2', severity: 'medium', deleted: false, evidenceIds: ['missing'] }
  ]
  const problems = verifyReportEvidenceRoles(state)
  assert.ok(problems.some((p) => p.includes('finding-2')))
  assert.ok(!problems.some((p) => p.includes('finding-1')))
  state.findings[0].evidenceIds = ['evidence-1']
  assert.ok(verifyReportEvidenceRoles(state).some((p) => p.includes('needs a proof or verification')))
})

test('evidenceByRole groups baseline/proof/verification for the reporter', () => {
  const state = withEvidence([{ id: 'evidence-3', role: 'verification', path: 'e/3', sha256: 'd'.repeat(64) }])
  const grouped = evidenceByRole(state)
  assert.equal(grouped.baseline.length, 1)
  assert.equal(grouped.proof.length, 1)
  assert.equal(grouped.verification.length, 1)
})

test('report commits evidenceVersion; later evidence change marks stale without deleting evidence', () => {
  let state = withEvidence()
  state.directions = [{ id: 'direction-1', question: 'q', state: 'running', conclusion: null }]
  state.tasks = [{ id: 'task-1', directionId: 'direction-1', state: 'running', childId: 'c1' }]
  state = reduceV4(state, { type: 'report', op: 'record', path: 'reports/v4-report.md', by: 'renderer', bytes: 10, gaps: 0, now: 2 })
  const version = state.report.evidenceVersion
  assert.match(version, /^ev-ver-/)
  assert.equal(state.report.evidenceStale, false)
  assert.equal(state.report.pendingReporter, false)

  state = reduceV4(state, {
    type: 'worker', op: 'commit', taskId: 'task-1', conclusion: 'c', directionState: 'done',
    evidence: [{ id: 'evidence-9', kind: 'response', role: 'proof', path: 'e/9', sha256: 'f'.repeat(64) }],
    facts: [], findings: [], coverage: [], now: 3
  })
  assert.equal(state.report.evidenceStale, true)
  assert.ok(state.evidence.some((e) => e.id === 'evidence-9' || e.sha256 === 'f'.repeat(64)))
  assert.ok(state.report.path, 'old report is kept, not deleted')
})

test('a new finding marks the report pendingReporter; re-recording clears it', () => {
  let state = withEvidence()
  state.directions = [{ id: 'direction-1', question: 'q', state: 'running', conclusion: null }]
  state = reduceV4(state, { type: 'report', op: 'record', path: 'reports/v4-report.md', by: 'renderer', now: 2 })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1', claim: 'new issue',
    severity: 'high', evidenceIds: ['evidence-1'], now: 3
  })
  assert.equal(state.report.pendingReporter, true)
  assert.equal(state.report.evidenceStale, true)
  state = reduceV4(state, { type: 'report', op: 'record', path: 'reports/v4-report.md', by: 'renderer', now: 4 })
  assert.equal(state.report.pendingReporter, false)
  assert.equal(state.report.evidenceStale, false)
})
