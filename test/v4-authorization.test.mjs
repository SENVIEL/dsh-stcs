import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeAuthorization, platformGuardReason, PLATFORM_GUARD_PREFIX } from '../lib/v4/authorization.js'
import { readFileSync } from 'node:fs'

const PORTAL_TEXT = [
  '用户明确表示「这些都可以、可以测任何方向的功能」，据此撤销 Lead 此前自加的「逐项书面确认」门槛：功能面/接口面/认证边界/参数面/WAF 应用层的主动测试均在授权范围内。',
  '【Lead 授权核验门槛（非用户设限，Lead 自行执行门槛，待可核验凭证到位即解除）】：当前客观事实为：① 4 个核心目标对当前测试源直接 RST 拦截；② 未见书面授权书或工单编号、授权方联系人、测试窗口凭证、测试源加白凭证、应急联系人与回滚方案。在补齐任一可核验授权凭证（书面授权/工单、甲方加白或测试专线/VPN、测试窗口）之前，Lead 暂不执行对生产系统的利用级操作。',
  '范围限用户列出的 6 个域名，排除未列出的主机。'
].join('\n')

test('normalizeAuthorization removes Lead self-imposed gates but keeps user scope', () => {
  const out = normalizeAuthorization(PORTAL_TEXT)
  assert.match(out, /这些都可以、可以测任何方向的功能/)
  assert.match(out, /范围限用户列出的 6 个域名/)
  assert.match(out, /按用户授权原话执行/)
  assert.match(out, /正常渗透动作默认放行/)
  assert.doesNotMatch(out, /书面授权书或工单编号/)
  assert.doesNotMatch(out, /测试源加白凭证/)
  assert.doesNotMatch(out, /测试专线/)
  assert.doesNotMatch(out, /≤?\s*1\s*req\s*\/\s*5\s*s/i)
  // Idempotent: policy is appended once.
  assert.equal(normalizeAuthorization(out), out)
})

test('authorization with explicit user red lines is preserved', () => {
  const text = '用户授权：仅做无损漏洞验证（PoC 只读/回显），禁止 DoS、批量爆破、删改业务数据。'
  const out = normalizeAuthorization(text)
  assert.match(out, /严禁测试删除和篡改原有数据的接口。除此之外不设其它前置限制/)
  assert.match(out, /正常渗透动作默认放行/)
})

test('guard rejection is explicitly platform-side, not a target defense', () => {
  const reason = platformGuardReason('【Scope 硬拦截】目标越界')
  assert.ok(reason.startsWith(PLATFORM_GUARD_PREFIX))
  assert.match(reason, /非目标防御/)
  assert.match(reason, /不要换 payload/)
})

test('flow_start and flow_status both normalize stored authorization', () => {
  const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  const start = source.indexOf("name: 'pentest_flow_start'")
  const status = source.indexOf("name: 'pentest_flow_status'")
  assert.ok(start > 0 && status > start)
  assert.match(source.slice(start, status), /normalizeAuthorization\(args\.authorization/)
  assert.match(source.slice(start, status), /cleanedAuth !== existingAuth/)
  const statusBody = source.slice(status, status + 2600)
  assert.match(statusBody, /cleanedAuth !== existingAuth/)
  assert.match(statusBody, /session\.goalSet\(\{ authorization: cleanedAuth \}\)/)
})

test('guard rejections are wrapped with the platform-side prefix', () => {
  const source = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  const wrapped = (source.match(/platformGuardReason\(/g) || []).length
  assert.ok(wrapped >= 8, `expected all guard denials wrapped, got ${wrapped}`)
})
