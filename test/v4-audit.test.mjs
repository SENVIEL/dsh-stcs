import assert from 'node:assert/strict'
import test from 'node:test'

import { selectAuditCandidates } from '../lib/v4/audit.js'

const finding = (id, severity, extra = {}) => ({
  id, severity, status: 'unverified', deleted: false, ...extra
})

test('audit candidates include every non-info finding regardless of dispatch settings', () => {
  const state = {
    sessionId: 's1',
    settings: { autoDispatch: false, autoAudit: true },
    findings: [
      finding('finding-1', 'low'),
      finding('finding-2', 'info'),
      finding('finding-3', 'critical'),
      finding('finding-4', 'medium', { deleted: true })
    ]
  }
  assert.deepEqual(selectAuditCandidates(state, { now: 1000 }), ['finding-3', 'finding-1'])
})

test('audit candidates respect the retry cooldown per session', () => {
  const state = { sessionId: 's1', findings: [finding('finding-1', 'high'), finding('finding-2', 'low')] }
  const cooldown = new Map([['s1:finding-1', 5000]])
  assert.deepEqual(selectAuditCandidates(state, { now: 1000, cooldown }), ['finding-2'])
  assert.deepEqual(selectAuditCandidates(state, { now: 6000, cooldown }), ['finding-1', 'finding-2'])
})

test('auditor-validated findings are done; Lead-signed ones still need review', () => {
  const state = {
    sessionId: 's1',
    findings: [finding('finding-1', 'high'), finding('finding-2', 'low'), finding('finding-3', 'medium')],
    validations: [
      { findingId: 'finding-1', verdict: 'reproduced', validator: 'agent:pentest-auditor' },
      { findingId: 'finding-3', verdict: 'reproduced', validator: 'lead' }
    ]
  }
  assert.deepEqual(selectAuditCandidates(state, { now: 1000 }), ['finding-3', 'finding-2'])
})
