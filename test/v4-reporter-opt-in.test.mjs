import assert from 'node:assert/strict'
import test from 'node:test'

import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')

test('pentest_flow_report never starts the reporter teammate by default', () => {
  const start = source.indexOf("name: 'pentest_flow_report'")
  const body = source.slice(start, source.indexOf("name: 'pentest_flow_role'", start))
  assert.match(body, /const useMember = args\.member === true/)
  assert.doesNotMatch(body, /member !== false && Boolean\(agentTeams/)
  assert.match(body, /Default FALSE/)
  assert.match(body, /useMember && reporterFileFresh/)
})

test('delivery accepts a deterministic renderer report', () => {
  const start = source.indexOf("name: 'pentest_flow_delivery'")
  const body = source.slice(start, start + 3500)
  assert.doesNotMatch(body, /报告不是 reporter 成员生成/)
  assert.match(body, /deterministic renderer report is the normal default/)
})

test('pentest_flow_role refuses to run reporter without explicit confirmation', () => {
  const start = source.indexOf("name: 'pentest_flow_role'")
  const body = source.slice(start, start + 2600)
  assert.match(body, /confirmReporter/)
  assert.match(body, /reporter teammate requires an explicit user request/)
})

test('protocol states the reporter is opt-in only', () => {
  assert.match(source, /默认由确定性 renderer 生成报告，绝不自动启动任何报告成员/)
  assert.match(source, /只有用户明确说「生成报告/)
})

test('auditors remain always-visible-teammates (unchanged by this fix)', () => {
  assert.doesNotMatch(source, /\bnew RoleRunner\(/)
  assert.match(source, /drainGlobalAuditDebt/)
})
