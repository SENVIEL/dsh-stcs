import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const plugin = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../../dsh-pentest-ui/lib/ui-pentest.client.js', import.meta.url), 'utf8')

test('pause/resume commands carry the exact graph session id', () => {
  assert.ok(ui.includes('(pause ? "/pentest-pause-all " : "/pentest-resume-all ") + CURRENT_SESSION'))
  const start = plugin.indexOf("register('pentest-pause-all'")
  const body = plugin.slice(start - 900, start + 200)
  assert.ok(body.includes('rawInput'))
  assert.ok(body.includes("explicit.startsWith('session-')"))
})

test('audit-pending command carries the exact graph session id', () => {
  assert.ok(ui.includes('/pentest-audit-pending " + CURRENT_SESSION'))
  const start = plugin.indexOf("name: 'pentest-audit-pending'")
  const body = plugin.slice(start, start + 1400)
  assert.ok(body.includes('rawInput'))
  assert.ok(body.includes("explicit.startsWith('session-')"))
})
