import assert from 'node:assert/strict'
import test from 'node:test'

import { redLineReason } from '../lib/v4/safety.js'
import { selectAuditCandidates } from '../lib/v4/audit.js'
import { reduceV4 } from '../lib/v4/reduce.js'
import { createV4State } from '../lib/v4/state.js'
import { readFileSync } from 'node:fs'

test('sole red line: only delete/tamper of EXISTING data is blocked', () => {
  assert.ok(redLineReason('测试删除原有数据的接口 DELETE FROM users'))
  assert.ok(redLineReason('篡改原有业务记录的接口'))
  assert.ok(redLineReason('调用删除原有文件的接口'))
})

test('everything outside the sole red line is NOT gated', () => {
  const allowed = [
    'videoclaimpage 的 /oauth/token 接受 client_id=cxh、client_secret=password 返回 JWT',
    'POST /api/org/FileAttachmentService/saveUploadFile 上传 multipart 文件（JSP 被 WAF 阻断，未证明落盘）',
    'WAF 阻断 / 覆盖 202 挑战页 / 重启窗口 / 服务崩溃描述',
    'DoS 关键字出现在描述里',
    '只读 GET 返回 500 Java 堆栈',
    '命令执行 whoami 回显',
    '覆盖 WAF 挑战响应体、只读复核',
    'FileAttachmentService.saveUploadFile 暴露未授权 multipart 上传面（JSP/路径穿越被阻断，未证明落盘）'
  ]
  for (const text of allowed) assert.equal(redLineReason(text), '', `should be allowed: ${text}`)
})

test('audit candidates include pending findings for read-only verification', () => {
  const state = {
    sessionId: 's1',
    findings: [
      { id: 'f1', severity: 'high', deleted: false },
      { id: 'f2', severity: 'low', deleted: false, approvalStatus: 'pending' },
      { id: 'f3', severity: 'medium', deleted: false }
    ],
    validations: [{ findingId: 'f1', validator: 'agent:pentest-auditor', verdict: 'reproduced' }]
  }
  // f1 is already audited; a pending red-line finding (f2) is still audited
  // read-only so a false critical can be downgraded or rejected.
  assert.deepEqual(selectAuditCandidates(state, { now: 1000 }), ['f3', 'f2'])
})

test('tick unblocks stale approvals without needing a live agent or drain', () => {
  const plugin = readFileSync(new URL('../lib/plugin.js', import.meta.url), 'utf8')
  const start = plugin.indexOf('Unconditional migration (no live agent')
  assert.ok(start > 0)
  const body = plugin.slice(start, plugin.indexOf('if (unblockedThisTick > 0)', start))
  assert.match(body, /op: 'unblock'/)
  assert.match(body, /for \(const sessionId of v4CachedKeys\)/)
  assert.doesNotMatch(body, /ctx\.sessions/)
  assert.doesNotMatch(body, /drainGlobalAuditDebt/)
})

test('finding unblock clears the stale approval gate', () => {
  const state = createV4State({ sessionId: 's1', target: 'https://t.test', objective: 'o', now: 1 })
  state.findings = [{ id: 'finding-1', claim: 'x', severity: 'high', status: 'unverified', deleted: false, approvalStatus: 'pending', safetyDecision: 'requires_user_approval', auditDecision: 'needs_review' }]
  const next = reduceV4(state, { type: 'finding', op: 'unblock', id: 'finding-1', now: 2 })
  assert.equal(next.findings[0].approvalStatus, 'approved')
  assert.equal(next.findings[0].safetyDecision, 'allow')
  assert.notEqual(next.findings[0].auditDecision, 'needs_review')
})
