import assert from 'node:assert/strict'
import test from 'node:test'

import { selectAuditCandidates } from '../lib/v4/audit.js'
import { readFileSync } from 'node:fs'

test('manual audit force clears this session retry cooldown', () => {
  const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  const start = source.indexOf('const auditPendingFor')
  const body = source.slice(start, source.indexOf('const reprojectSession', start))
  assert.match(body, /if \(force && clearCooldown\)/)
  assert.match(body, /auditCooldown\.delete\(key\)/)

  const state = {
    sessionId: 's1',
    findings: [{ id: 'f1', severity: 'high', status: 'unverified' }]
  }
  const cooldown = new Map([['s1:f1', 9999999999999], ['other:f2', 9999999999999]])
  // The caller deletes only this session's cooldown before selecting.
  for (const key of [...cooldown.keys()]) if (key.startsWith('s1:')) cooldown.delete(key)
  assert.deepEqual(selectAuditCandidates(state, { now: 1000, cooldown }), ['f1'])
  assert.equal(cooldown.get('other:f2'), 9999999999999)
})
