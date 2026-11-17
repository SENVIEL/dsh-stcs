import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

const root = new URL('../', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const ui = read('../dsh-pentest-ui/lib/ui-pentest.client.js')
const plugin = read('lib/plugin.js')
const audit = read('lib/v4/audit.js')
const dispatch = read('lib/v4/dispatch.js')
const roles = read('lib/v4/roles.js')
const projection = read('lib/projection.js')

test('ONE policy evaluator exists and every backend consumer imports it', () => {
  const policy = read('lib/v4/policy.js')
  assert.match(policy, /export function auditStateOf/)
  assert.match(policy, /export function isHumanGoalCommand/)
  assert.match(policy, /export \{[^}]*RED_LINE/)
  assert.match(plugin, /from '\.\/v4\/policy\.js'/)
  assert.match(audit, /from '\.\/policy\.js'/)
  assert.match(projection, /from '\.\/v4\/policy\.js'/)
  assert.match(dispatch, /from '\.\/policy\.js'/)
  assert.match(roles, /from '\.\/policy\.js'/)
})

test('audit state is computed ONLY in projection; UI consumes the field', () => {
  assert.match(projection, /const auditState = auditStateOf\(item, validations\)/)
  assert.match(projection, /category: categoryOfAuditState\(auditState\)/)
  // UI must not re-derive from validation/status/approval locally
  const uiAudit = ui.slice(ui.indexOf('function auditStateOf'), ui.indexOf('function candidateSeverity'))
  assert.match(uiAudit, /finding\.auditState/)
  assert.doesNotMatch(uiAudit, /finding\.validation/)
  assert.doesNotMatch(uiAudit, /approvalStatus/)
})

test('backend candidates do NOT maintain their own reviewed set', () => {
  assert.doesNotMatch(audit, /new Set\(/)
  assert.match(audit, /auditStateOf\(finding, validations\)/)
})

test('red line string has exactly one definition', () => {
  const auth = read('lib/v4/authorization.js')
  assert.match(auth, /export const RED_LINE/)
  const files = [plugin, dispatch, roles, read('lib/v4/safety.js')]
  for (const f of files) {
    // literal phrase may appear in tests/comments; production prompts must
    // interpolate RED_LINE instead of restating it.
    assert.doesNotMatch(f, /'[^']*严禁测试删除和篡改原有数据的接口[^']*'/)
  }
})

test('protocol uses policy constants, not hardcoded copies', () => {
  assert.match(plugin, /\$\{RED_LINE\}/)
  assert.match(plugin, /\$\{AUTHORIZATION_POLICY\}/)
  assert.doesNotMatch(plugin, /唯一红线是「严禁测试删除/)
})
