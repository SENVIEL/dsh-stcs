import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
const roles = readFileSync(new URL('../lib/v4/roles.js', import.meta.url), 'utf8')

test('global audit drain exists and is called by the tick', () => {
  assert.match(source, /const drainGlobalAuditDebt = async/)
  assert.match(source, /await drainGlobalAuditDebt\(v4CachedKeys, agents\)/)
})

test('global drain uses any live agent as host and never strands pending findings', () => {
  const start = source.indexOf('const drainGlobalAuditDebt')
  const body = source.slice(start, source.indexOf('// Re-emit the live UI snapshot', start))
  assert.match(body, /no-pentest-live-host/)
  assert.match(body, /pentestIds\.has/)
  assert.doesNotMatch(body, /\|\| live\.find\(\(item\) => item\?\.id\)\)/) // never fall back to a random live agent
  assert.match(body, /new TeamRoleRunner/)
  assert.doesNotMatch(body, /\bnew RoleRunner\(/)
  assert.match(body, /memberName: GLOBAL_AUDIT_MEMBER/)
})

test('paused sessions still drain audit debt but never dispatch workers', () => {
  const start = source.indexOf('const autoAdvanceV4')
  const body = source.slice(start, source.indexOf('const finish', start) + 2200)
  assert.match(body, /!\['active', 'paused'\]\.includes\(state\.goal\.phase\)/)
  assert.match(body, /paused-audit-only/)
})

test('global drain writes results into the finding own session, not the host', () => {
  const start = source.indexOf('const drainGlobalAuditDebt')
  const body = source.slice(start, source.indexOf('// Re-emit the live UI snapshot', start))
  assert.match(body, /const session = await getV4Session\(sessionId\)/)
  assert.match(body, /enqueueAuditOnce\(\{\s*session, runner/)
  assert.match(body, /auditCooldown\.set\(`\$\{sessionId\}/)
})

test('tick audits every live session (no early break that strands findings)', () => {
  const start = source.indexOf('const tick = async () =>')
  const body = source.slice(start, source.indexOf('const timer = setInterval', start))
  assert.doesNotMatch(body, /auditSessionsThisTick >= AUDIT_CONCURRENCY\) break/)
  assert.match(body, /Audit every session with its own live agent/)
  assert.match(body, /await autoAdvanceV4\(sessionId, agent, \{ dispatchOpen: true \}\)/)
})

test('TeamRoleRunner supports a fixed reusable member name', () => {
  assert.match(roles, /this\.memberName = text\(memberName\)\.trim\(\)/)
  assert.match(roles, /const preferredName = this\.memberName \|\| teammateName\(role\)/)
})

test('no subagent fallback remains anywhere in the plugin', () => {
  assert.doesNotMatch(source, /\bnew RoleRunner\(/)
  assert.doesNotMatch(source, /import \{ RoleRunner/)
})
