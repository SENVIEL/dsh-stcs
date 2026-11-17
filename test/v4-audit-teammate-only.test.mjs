import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('plugin never constructs a RoleRunner for audits', () => {
  assert.doesNotMatch(source, /\bnew RoleRunner\(/, 'no direct role construction remains')
  assert.doesNotMatch(source, /import \{ RoleRunner/)
  assert.match(source, /import \{ TeamRoleRunner, CORE_ROLE_NAMES \}/)
})

test('autoAuditFindings refuses a non-TeamRoleRunner instead of falling back', () => {
  const start = source.indexOf('async function autoAuditFindings')
  const body = source.slice(start, source.indexOf('const AUDIT_CONCURRENCY', start))
  assert.match(body, /instanceof TeamRoleRunner/)
  assert.doesNotMatch(body, /import \{ RoleRunner|\bnew RoleRunner\(|fallback/i)
  assert.match(body, /auditor requires a visible teammate transport/)
})

test('auditPendingFor uses the DSH 0.2.2 subagent transport', () => {
  const start = source.indexOf('const auditPendingFor')
  const body = source.slice(start, source.indexOf('const reprojectSession', start))
  assert.match(body, /no-team-transport/)
  assert.match(body, /new TeamRoleRunner/)
  assert.match(body, /subagents\?\.startActivation/)
  assert.doesNotMatch(body, /new RoleRunner/)
})

test('pentest_flow_role supports named subagent transport', () => {
  const start = source.indexOf("name: 'pentest_flow_role'")
  assert.ok(start > 0)
  const body = source.slice(start, start + 2600)
  assert.match(body, /enum: \['subagent', 'teammate'\]/)
  assert.match(body, /subagents\?\.startActivation/)
  assert.doesNotMatch(body, /subagent transport is not allowed/)
})

test('dispatch onCommit only queues audits with a role transport', () => {
  const start = source.indexOf("name: 'pentest_flow_dispatch'")
  const body = source.slice(start, start + 5000)
  assert.match(body, /subagents\?\.startActivation \|\| agentTeams\?\.spawnTeammate\)[\s\S]{0,80}new TeamRoleRunner/)
  assert.doesNotMatch(body, /subagentsService[\s\S]{0,200}new RoleRunner/)
})
