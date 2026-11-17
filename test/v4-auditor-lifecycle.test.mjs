import test from 'node:test'
import assert from 'node:assert/strict'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'
import { normalizeDedupeKey } from '../lib/v4/dedupe.js'
import { validateRoleOutput } from '../lib/v4/roles.js'

function baseState() {
  let state = createV4State({ sessionId: 'audit-s1', target: 'https://t.test', objective: 'o', workdir: 'C:/tmp/audit', now: 1 })
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['identity'],
    question: '登录面能否绕过认证？', doneWhen: '拿到未授权会话或穷举失败', now: 2
  })
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [
      { kind: 'request', role: 'proof', sha256: 'a'.repeat(64), path: 'evidence/req.txt', summary: 'login request' },
      { kind: 'response', role: 'proof', sha256: 'b'.repeat(64), path: 'evidence/resp.txt', summary: 'login response' }
    ], now: 3
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: '认证可被绕过', severity: 'high', impactProven: 'read', evidenceIds: ['evidence-1'], now: 4
  })
  return state
}

const AUDIT_META = {
  auditDecision: 'rejected',
  vulnType: 'auth_bypass',
  rootCause: 'missing server-side authorization check on /admin',
  dedupeKey: 'auth_bypass:missing server-side authorization check on /admin',
  severityRationale: 'read-only impact, not high',
  exploitTechnique: 'cookie replay',
  affectedAssets: ['https://t.test']
}

test('rejected audit decision persists all audit metadata on validation and finding', () => {
  let state = baseState()
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'not_reproduced', validator: 'agent:pentest-auditor', evidenceIds: ['evidence-1'],
    metadata: AUDIT_META, now: 5
  })
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1',
    severity: 'medium', impactProven: 'info',
    vulnType: AUDIT_META.vulnType,
    rootCause: AUDIT_META.rootCause,
    dedupeKey: AUDIT_META.dedupeKey,
    severityRationale: AUDIT_META.severityRationale,
    exploitTechnique: AUDIT_META.exploitTechnique,
    affectedAssets: AUDIT_META.affectedAssets,
    auditDecision: 'rejected',
    now: 6
  })
  const validation = state.validations[0]
  assert.equal(validation.auditDecision, 'rejected')
  assert.equal(validation.vulnType, 'auth_bypass')
  assert.match(validation.rootCause, /authorization/)
  assert.equal(validation.dedupeKey, AUDIT_META.dedupeKey)
  assert.equal(validation.severityRationale, AUDIT_META.severityRationale)
  assert.equal(validation.exploitTechnique, 'cookie replay')
  assert.deepEqual(validation.affectedAssets, ['https://t.test'])
  const finding = state.findings[0]
  assert.equal(finding.status, 'rejected')
  assert.equal(finding.auditDecision, 'rejected')
  assert.equal(finding.vulnType, 'auth_bypass')
  assert.equal(finding.dedupeKey, AUDIT_META.dedupeKey)
})

test('inconclusive audit decision also persists metadata', () => {
  let state = baseState()
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'inconclusive', validator: 'agent:pentest-auditor', evidenceIds: [],
    metadata: { ...AUDIT_META, auditDecision: 'inconclusive' }, now: 5
  })
  assert.equal(state.validations[0].auditDecision, 'inconclusive')
  assert.equal(state.findings[0].status, 'inconclusive')
  assert.equal(state.findings[0].vulnType, 'auth_bypass')
})

test('high/critical validation by Lead is rejected; medium is allowed', () => {
  let state = baseState()
  assert.throws(
    () => reduceV4(state, {
      type: 'validation', op: 'add', findingId: 'finding-1',
      verdict: 'reproduced', validator: 'lead', evidenceIds: ['evidence-1'], now: 5
    }),
    (error) => error.code === 'validation/validator'
  )
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1', severity: 'medium', now: 5
  })
  assert.doesNotThrow(() => reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'reproduced', validator: 'lead', evidenceIds: ['evidence-1'], now: 6
  }))
})

test('long dedupeKey is canonicalized without rejecting the audit', () => {
  const longCause = 'vulnerable component '.repeat(300).trim()
  const key = normalizeDedupeKey({ vulnType: 'rce', rootCause: longCause })
  assert.ok(key.length > 2000)
  assert.equal(key, `rce:${longCause.toLowerCase()}`)
  assert.doesNotThrow(() => validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'not_reproduced', decision: 'rejected',
    severity: 'low', severityRationale: 'no impact', impactProven: 'info',
    vulnType: 'rce', rootCause: longCause, exploitTechnique: 'none',
    dedupeKey: key, evidence: [], safetyDecision: 'allow_readonly', notes: ''
  }))
  let state = baseState()
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1', dedupeKey: key, now: 5
  })
  assert.equal(state.findings[0].dedupeKey, key)
})

test('needs_review is a valid auditor decision and requires user approval', () => {
  assert.doesNotThrow(() => validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'inconclusive', decision: 'needs_review',
    severity: 'low', severityRationale: 'destructive reproduction would damage data',
    impactProven: 'none', vulnType: 'rce', rootCause: 'unsafe deserialization',
    exploitTechnique: 'crafted payload', dedupeKey: 'rce:unsafe deserialization',
    evidence: [], safetyDecision: 'requires_user_approval', notes: 'needs approval'
  }))
  assert.throws(() => validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'inconclusive', decision: 'needs_review',
    severity: 'low', severityRationale: 'x', impactProven: 'none',
    vulnType: 'rce', rootCause: 'unsafe deserialization',
    exploitTechnique: 'crafted payload', dedupeKey: 'rce:unsafe deserialization',
    evidence: [], safetyDecision: 'allow', notes: ''
  }), /requires_user_approval/)
})

test('duplicate merge carries audit metadata and affected assets to the target', () => {
  let state = baseState()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'response', role: 'proof', sha256: 'c'.repeat(64), path: 'evidence/second.txt', summary: 'second' }],
    now: 5
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: '同一认证绕过的另一个入口', severity: 'high', evidenceIds: ['evidence-3'], now: 6
  })
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-2',
    vulnType: 'auth_bypass', rootCause: 'missing server-side authorization check',
    dedupeKey: 'auth_bypass:missing server-side authorization check',
    severityRationale: 'unauthorized admin read', exploitTechnique: 'cookie replay',
    affectedAssets: ['https://t.test'], auditDecision: 'duplicate', now: 7
  })
  state = reduceV4(state, {
    type: 'finding', op: 'merge', id: 'finding-1', sourceId: 'finding-2', now: 8
  })
  const target = state.findings.find((item) => item.id === 'finding-1')
  assert.equal(target.deleted, undefined)
  assert.equal(target.vulnType, 'auth_bypass')
  assert.equal(target.rootCause, 'missing server-side authorization check')
  assert.equal(target.dedupeKey, 'auth_bypass:missing server-side authorization check')
  assert.equal(target.severityRationale, 'unauthorized admin read')
  assert.equal(target.exploitTechnique, 'cookie replay')
  assert.equal(state.findings.find((item) => item.id === 'finding-2').deleted, true)
})

test('goal.proofs stores evidence id and keeps finding/fact id in its own field', () => {
  let state = baseState()
  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: 'direction-1',
    answer: 'observed login behavior', confidence: 'observed', evidenceIds: ['evidence-1'], now: 5
  })
  const settled = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'observed login behavior', evidenceIds: ['evidence-1'] }, now: 5.5
  })
  const factProved = reduceV4(settled, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'fact-1', reason: 'fact proves it', now: 6
  })
  assert.deepEqual(factProved.goals[0].proofs[0], {
    evidenceId: 'evidence-1', factId: 'fact-1', reason: 'fact proves it', at: 6
  })
  const findingProved = reduceV4(settled, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'finding-1', reason: 'finding proves it', now: 6
  })
  assert.equal(findingProved.goals[0].proofs[0].evidenceId, 'evidence-1')
  assert.equal(findingProved.goals[0].proofs[0].findingId, 'finding-1')
  assert.throws(
    () => reduceV4(settled, { type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'evidence-1', now: 6 }),
    (error) => error.code === 'goal/evidence'
  )
})

test('a validated critical RCE proves the root goal even with open directions', () => {
  let state = baseState()
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1',
    severity: 'critical', impactProven: 'rce', now: 5
  })
  const proved = reduceV4(state, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'finding-1', reason: 'auditor reproduced RCE', now: 6
  })
  assert.equal(proved.goals[0].proofs[0].findingId, 'finding-1')
  assert.equal(proved.directions[0].state, 'blocked')
})

test('auditor high/no-impact is normalized to low/inconclusive instead of failing the role', () => {
  const output = validateRoleOutput('auditor', {
    findingId: 'finding-4',
    verdict: 'reproduced',
    decision: 'approved',
    severity: 'high',
    severityRationale: 'path traversal may write files',
    impactProven: 'none',
    vulnType: 'path_traversal',
    rootCause: 'path.join with attacker-controlled name',
    dedupeKey: 'path_traversal:path.join with attacker-controlled name',
    evidence: [],
    safetyDecision: 'allow',
    notes: 'suspected write primitive'
  })
  assert.equal(output.severity, 'low')
  assert.equal(output.decision, 'inconclusive')
  assert.equal(output.verdict, 'inconclusive')
  assert.equal(output.auditorNormalization.reason, 'no proven impact must be low')
  assert.match(output.notes, /auditor normalization/)
})

test('auditor RCE severity is normalized to critical without failing', () => {
  const output = validateRoleOutput('auditor', {
    findingId: 'finding-4',
    verdict: 'reproduced',
    decision: 'approved',
    severity: 'high',
    severityRationale: 'command execution observed',
    impactProven: 'rce',
    vulnType: 'rce',
    rootCause: 'unsafe upload',
    dedupeKey: 'rce:unsafe upload',
    evidence: [],
    safetyDecision: 'allow',
    notes: ''
  })
  assert.equal(output.severity, 'critical')
  assert.equal(output.decision, 'approved')
  assert.equal(output.verdict, 'reproduced')
})
