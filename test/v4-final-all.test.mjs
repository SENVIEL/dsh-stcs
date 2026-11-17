import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

test('V4Session.run tolerates snapshot append failures by default', () => {
  const source = readFileSync(new URL('../lib/v4/session.js', import.meta.url), 'utf8')
  assert.match(source, /tolerateAppendFailure: true, \.\.\.options/)
})

test('global drain queues one finding per tick on the reused member', () => {
  const plugin = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  const start = plugin.indexOf('const drainGlobalAuditDebt')
  const body = plugin.slice(start, plugin.indexOf('// Re-emit the live UI snapshot', start))
  assert.match(body, /agents\.get\(sessionId\)/)
  assert.match(body, /pentestIds\.has/)
  assert.match(body, /work\.slice\(0, 1\)/)
  assert.match(body, /findingIds: \[findingId\]/)
  assert.doesNotMatch(body, /\|\| live\.find\(\(item\) => item\?\.id\)\)/)
  assert.match(plugin, /const auditRetryDelayMs = 20000/)
})

test('sole red line remains delete/tamper existing data only', () => {
  const safety = readFileSync(new URL('../lib/v4/safety.js', import.meta.url), 'utf8')
  assert.match(safety, /严禁测试删除和篡改原有数据的接口/)
  assert.doesNotMatch(safety, /拒绝服务攻击|\bcrash\b|\brestart\b|\bshutdown\b/)
})
