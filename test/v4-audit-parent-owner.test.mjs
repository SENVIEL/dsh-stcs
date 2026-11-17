import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('per-session audit uses only the target session own live agent + visible teammate', () => {
  const start = source.indexOf('const auditPendingFor')
  const end = source.indexOf('const GLOBAL_AUDIT_MEMBER', start)
  const body = source.slice(start, end)
  assert.doesNotMatch(body, /agentsService\.list\(\)/)
  assert.match(body, /agentsService\.get\(session\.sessionId\)/)
  assert.match(body, /no-own-live-agent/)
  assert.match(body, /no-team-transport/)
  assert.match(body, /new TeamRoleRunner/)
  assert.doesNotMatch(body, /\bnew RoleRunner\(/)
})

test('global drain reuses ONE visible member hosted on a pentest-preset agent only', () => {
  const start = source.indexOf('const drainGlobalAuditDebt')
  const body = source.slice(start, source.indexOf('// Re-emit the live UI snapshot', start))
  assert.match(body, /GLOBAL_AUDIT_MEMBER/)
  assert.match(body, /pentestIds\.has/)
  assert.match(body, /no-pentest-live-host/)
  assert.doesNotMatch(body, /\|\| live\.find\(\(item\) => item\?\.id\)\)/)
  assert.doesNotMatch(body, /\|\| live\.find\(\(item\) => item\?\.id\)\)/)
  assert.match(body, /new TeamRoleRunner/)
  assert.doesNotMatch(body, /\bnew RoleRunner\(/)
  // results go to the target session, not the host
  assert.match(body, /const session = await getV4Session\(sessionId\)/)
  assert.match(body, /enqueueAuditOnce\(\{\s*session, runner/)
})

test('scheduler tick drains every session and paused sessions audit too', () => {
  const start = source.indexOf('const tick = async () =>')
  const body = source.slice(start, source.indexOf('const timer = setInterval', start))
  assert.match(body, /await drainGlobalAuditDebt\(v4CachedKeys, agents\)/)
  assert.doesNotMatch(body, /auditSessionsThisTick >= AUDIT_CONCURRENCY\) break/)
  assert.match(source, /paused-audit-only/)
})

test('audit candidates use the single policy evaluator', () => {
  const audit = readFileSync(new URL('../lib/v4/audit.js', import.meta.url), 'utf8')
  const policy = readFileSync(new URL('../lib/v4/policy.js', import.meta.url), 'utf8')
  assert.match(audit, /auditStateOf\(finding, validations\)/)
  assert.match(policy, /agent:pentest-auditor/)
})
