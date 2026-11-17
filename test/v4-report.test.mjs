import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { renderV4Report } from '../lib/v4/report.js'
import { validateReportMarkdown } from '../lib/v4/report-template.js'
import { renderV4Docx, writeV4Docx } from '../lib/v4/docx.js'

test('renders a v4 report with findings, evidence and validations', () => {
  const markdown = renderV4Report({
    goal: { target: 'https://t.test', objective: 'find bugs', authorization: 'authorized', workdir: 'C:/w' },
    directions: [{ id: 'direction-1', question: '有哪些接口？', state: 'done', conclusion: { answer: '找到 1 个未授权接口' } }],
    findings: [{ id: 'finding-1', claim: '/admin 未授权访问', severity: 'high', status: 'confirmed', impactProven: 'read', evidenceIds: ['evidence-1'], description: '管理员接口可匿名读取。', steps: ['GET /admin HTTP/1.1\\nHost: t.test'], stepNotes: ['未携带 Cookie'], riskAnalysis: '泄露管理数据。', remediation: '增加服务端鉴权。' }],
    evidence: [{ id: 'evidence-1', kind: 'response', role: 'proof', path: 'evidence/e1.txt', sha256: 'abc' }],
    validations: [{ id: 'validation-1', findingId: 'finding-1', verdict: 'reproduced', note: 'replayed' }],
    tasks: [{ id: 'task-1', state: 'done' }],
    facts: [],
    coverage: []
  }, { now: new Date('2026-01-01T00:00:00Z') })
  assert.match(markdown, /\[high\] \/admin 未授权访问/)
  assert.match(markdown, /reproduced/)
  assert.match(markdown, /evidence\/e1\.txt/)
  assert.match(markdown, /找到 1 个未授权接口/)
  assert.match(markdown, /#### 漏洞描述/)
  assert.match(markdown, /GET \/admin HTTP\/1\.1/)
  assert.match(markdown, /#### 风险分析/)
  assert.match(markdown, /增加服务端鉴权/)
})

test('report separates unverified candidates from negative observations', () => {
  const markdown = renderV4Report({
    goal: { target: 'https://t.test', targets: ['https://t.test'], objective: 'find bugs', authorization: '', workdir: 'C:/w' },
    directions: [], facts: [], findings: [
      { id: 'f1', claim: 'real issue', severity: 'high', status: 'confirmed', impactProven: 'read', evidenceIds: [] },
      { id: 'f2', claim: 'source-only RCE candidate', severity: 'high', status: 'unverified', impactProven: 'none', verificationLevel: 'source_only', evidenceIds: [] },
      { id: 'f3', claim: 'confirmed negative result', severity: 'low', status: 'not_reproduced', impactProven: 'none', evidenceIds: [] }
    ], evidence: [], validations: [], tasks: [], coverage: []
  })
  assert.match(markdown, /授权：未记录（红线缺失，禁止交付）/)
  assert.match(markdown, /## 已确认发现/)
  assert.match(markdown, /## 未确认发现\n[\s\S]*source-only RCE candidate/)
  assert.match(markdown, /source-only RCE candidate（unverified \/ source_only）/)
  assert.match(markdown, /## 负面观察（不是漏洞）\n[\s\S]*confirmed negative result/)
  assert.doesNotMatch(markdown, /## 负面观察（不是漏洞）[\s\S]*source-only RCE candidate/)
})

test('report does not count blocked or evidence-free coverage as covered', () => {
  const markdown = renderV4Report({
    goal: { target: 'https://t.test', objective: 'find bugs', authorization: 'authorized', workdir: 'C:/w' },
    directions: [], facts: [], findings: [], evidence: [], validations: [], tasks: [],
    coverage: [
      { axis: 'surface', result: 'blocked', note: 'credentials unavailable', evidenceIds: ['evidence-1'] },
      { axis: 'identity', result: 'no_issue_found', note: 'auto without evidence', evidenceIds: [] },
      { axis: 'config', result: 'no_issue_found', note: 'tested', evidenceIds: ['evidence-1'] }
    ]
  })
  assert.match(markdown, /未覆盖轴：surface, identity/)
  assert.doesNotMatch(markdown, /未覆盖轴：.*config/)
})

test('report template contract and deterministic DOCX are generated', () => {
  const state = {
    goal: { target: 'https://t.test', objective: 'find bugs', authorization: 'authorized', workdir: 'C:/w' },
    directions: [], facts: [], tasks: [], coverage: [], validations: [],
    findings: [{
      id: 'finding-1', claim: 'admin bypass', severity: 'high', status: 'confirmed',
      impactProven: 'read', evidenceIds: ['evidence-1'], description: 'admin data exposed',
      steps: ['GET /admin HTTP/1.1\nHost: t.test'], riskAnalysis: 'data exposure', remediation: 'enforce auth'
    }],
    evidence: [{ id: 'evidence-1', kind: 'response', role: 'proof', path: 'evidence/e1.txt', sha256: 'abc' }]
  }
  const markdown = renderV4Report(state, { now: new Date('2026-01-01T00:00:00Z') })
  const template = validateReportMarkdown(markdown, state.findings)
  assert.equal(template.templateId, 'pentest-default-v1')
  assert.equal(template.confirmed, 1)

  const docx = renderV4Docx(state, { now: new Date('2026-01-01T00:00:00Z') })
  assert.equal(docx.subarray(0, 2).toString('utf8'), 'PK')
  const text = docx.toString('utf8')
  assert.match(text, /word\/document\.xml/)
  assert.match(text, /测试过程/)
  assert.match(text, /admin bypass/)

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-docx-'))
  try {
    const out = writeV4Docx(state, path.join(dir, 'report.docx'))
    assert.ok(out.bytes > 100)
    assert.equal(fs.readFileSync(out.path).subarray(0, 2).toString('utf8'), 'PK')
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
