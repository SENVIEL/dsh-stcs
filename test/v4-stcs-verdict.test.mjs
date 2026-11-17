import assert from 'node:assert/strict'
import test from 'node:test'

import { auditStateOf } from '../lib/v4/policy.js'
import { summarizeTiers, verdictTierOf } from '../lib/artex/verdict.js'

const evidence = [
  { id: 'e1', kind: 'request', role: 'proof' },
  { id: 'e2', kind: 'response', role: 'proof' }
]

function finding(id, extra = {}) {
  return { id, severity: 'high', claim: `claim ${id}`, evidenceIds: ['e1', 'e2'], deleted: false, ...extra }
}

function auditor(findingId, verdict, at = 1) {
  return { id: `v-${findingId}-${at}`, findingId, verdict, validator: 'agent:pentest-auditor', superseded: false, at }
}

test('STCS deterministic tier requires auditor reproduction, confirmed level and request+response evidence', () => {
  const f = finding('f1', { verificationLevel: 'confirmed' })
  assert.equal(verdictTierOf(f, [auditor('f1', 'reproduced')], evidence), 'confirmed_deterministic')

  const withoutLevel = finding('f2')
  assert.equal(verdictTierOf(withoutLevel, [auditor('f2', 'reproduced')], evidence), 'confirmed_reproduced')

  const onlyRequest = finding('f3', { verificationLevel: 'confirmed', evidenceIds: ['e1'] })
  assert.equal(verdictTierOf(onlyRequest, [auditor('f3', 'reproduced')], evidence), 'confirmed_reproduced')
})

test('STCS preview is not audited and never becomes a canonical validation', () => {
  const f = finding('f4', { evidenceIds: ['e1'] })
  const state = { findings: [f], validations: [], evidence: [evidence[0]] }
  assert.equal(verdictTierOf(f, [], [evidence[0]]), 'preview')
  assert.equal(auditStateOf(f, []), 'pending', 'canonical audit rule must still say pending')
  const summary = summarizeTiers(state)
  assert.equal(summary.preview, 1)
  assert.equal(summary.audited, 0)
  assert.equal(summary.pendingAudit, 1)
})

test('STCS not_reproduced and inconclusive come from the latest auditor conclusion', () => {
  assert.equal(verdictTierOf(finding('f5'), [auditor('f5', 'not_reproduced')], evidence), 'not_reproduced')
  assert.equal(verdictTierOf(finding('f6'), [auditor('f6', 'inconclusive')], evidence), 'inconclusive')
  const noEvidence = finding('f7', { evidenceIds: [] })
  assert.equal(verdictTierOf(noEvidence, [], []), 'inconclusive')
})

test('STCS audited count only includes the two confirmed tiers', () => {
  const findings = [
    finding('f1', { verificationLevel: 'confirmed' }),
    finding('f2'),
    finding('f3', { evidenceIds: ['e1'] }),
    finding('f4')
  ]
  const state = {
    findings,
    evidence,
    validations: [
      auditor('f1', 'reproduced'),
      auditor('f2', 'reproduced'),
      auditor('f4', 'not_reproduced')
    ]
  }
  const summary = summarizeTiers(state)
  assert.equal(summary.audited, 2)
  assert.equal(summary.preview, 1)
  assert.equal(summary.not_reproduced, 1)
  assert.equal(summary.pendingAudit, 1)
})
