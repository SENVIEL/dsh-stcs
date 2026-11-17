import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('background audit uses only the target session own live agent', () => {
  const start = source.indexOf('const auditPendingFor')
  const end = source.indexOf('const GLOBAL_AUDIT_MEMBER', start)
  assert.ok(start >= 0 && end > start)
  const body = source.slice(start, end)
  // Borrowing another live agent attached pentest-auditor children to an
  // unrelated chat session. Only the exact own agent may be used.
  assert.doesNotMatch(body, /agentsService\.list\(\)/)
  assert.doesNotMatch(body, /live\.find\(/)
  assert.match(body, /agentsService\.get\(session\.sessionId\)/)
  assert.match(body, /own\?\.id === session\?\.sessionId/)
  assert.match(body, /no-own-live-agent/)
  assert.match(body, /no-team-transport/)
  assert.match(body, /new TeamRoleRunner/)
  assert.doesNotMatch(body, /\bnew RoleRunner\(/)
})

test('auditor candidates are derived from state without a live agent', async () => {
  const { selectAuditCandidates } = await import('../lib/v4/audit.js')
  const state = {
    sessionId: 's1',
    goal: { phase: 'active' },
    findings: [
      { id: 'f1', severity: 'high', status: 'unverified' },
      { id: 'f2', severity: 'info', status: 'unverified' }
    ]
  }
  assert.deepEqual(selectAuditCandidates(state, { now: 1000 }), ['f1'])
})
