import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'
import { parseReportGaps } from '../lib/v4/report-template.js'

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text)
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

async function createHarness(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-v4-lifecycle-'))
  fs.cpSync(path.resolve(import.meta.dirname, '..', 'lib'), path.join(root, 'lib'), { recursive: true })
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'package.json'), '{"type":"module","exports":"./index.js"}')
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-tools', 'index.js'), 'export function defineTool(value){ return value }')
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'package.json'), '{"type":"module","exports":"./index.js"}')
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-storage-domain', 'index.js'), 'export function defineDomain(value){ return value }\nexport function domainTable(value){ return value }')
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'package.json'), '{"type":"module","exports":"./index.js"}')
  write(path.join(root, 'node_modules', '@deepseek-ai', 'dsh-session', 'index.js'), 'export function appendPluginRecord(){}')
  write(path.join(root, 'node_modules', 'zod', 'package.json'), '{"type":"module","exports":"./index.js"}')
  write(path.join(root, 'node_modules', 'zod', 'index.js'), 'export const z = { any(){ return {} } }')

  const tables = new Map()
  const tableFor = (key) => {
    if (!tables.has(key)) {
      const rows = new Map()
      tables.set(key, { rows, async get(id) { return rows.get(id) }, async put(id, value) { rows.set(id, structuredClone(value)) } })
    }
    return tables.get(key)
  }
  const tools = []
  const cleanups = []
  const agentTeams = typeof options.agentTeamsFactory === 'function'
    ? options.agentTeamsFactory(root)
    : options.agentTeams
  const ctx = {
    tools: { register(tool) { tools.push(tool) }, guard() { return () => {} } },
    storageDomain: {
      get() { return undefined },
      async open(spec) { return { table(name) { return tableFor(`${spec.name}:${name}`) } } }
    },
    sessions: { get() { return undefined } },
    inject() {},
    effect(fn) { const cleanup = fn(); if (typeof cleanup === 'function') cleanups.push(cleanup); return cleanup },
    on() { return () => {} },
    logger: { warn() {} },
    systemPrompt: { section() { return () => {} }, context() { return () => {} }, variable() { return () => {} } },
    get(name) { return name === 'agentTeams' ? agentTeams : undefined }
  }
  const module = await import(pathToFileURL(path.join(root, 'lib', 'plugin.js')).href)
  module.apply(ctx)
  const byName = new Map(tools.map((tool) => [tool.name, tool]))
  const exec = { agent: { id: 's1', session: { id: 's1', header: { cwd: root } } } }
  const call = async (name, args = {}) => {
    const tool = byName.get(name)
    assert.ok(tool, `${name} must be registered`)
    return tool.execute(args, exec)
  }
  const v4Rows = tableFor('stcs_v4:states').rows
  const readState = () => v4Rows.get('s1')?.state
  const seedState = (state) => v4Rows.set('s1', { sessionId: 's1', revision: state.revision, state: structuredClone(state) })
  const cleanup = () => {
    for (const fn of cleanups) fn()
    fs.rmSync(root, { recursive: true, force: true })
  }
  return { root, call, readState, seedState, cleanup }
}

function buildDeliverableState(root) {
  const proofText = 'HTTP/1.1 200 OK\n\nadmin token accepted'
  write(path.join(root, 'evidence', 'proof.txt'), proofText)
  const proofSha = sha256(proofText)
  let state = createV4State({
    sessionId: 's1', target: 'https://t.test', objective: 'prove admin read',
    authorization: 'authorized, read-only', workdir: root, now: 1000
  })
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['identity'],
    question: '管理员接口能否未授权访问？', doneWhen: '匿名请求返回管理员数据', now: 1001
  })
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'response', role: 'proof', sha256: proofSha, path: 'evidence/proof.txt', summary: 'admin read' }],
    now: 1002
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: '管理员接口可匿名读取', severity: 'high', impactProven: 'read',
    evidenceIds: ['evidence-1'], description: 'anonymous admin read',
    riskAnalysis: 'admin data exposure', remediation: 'enforce server auth',
    steps: ['GET /admin HTTP/1.1\nHost: t.test'], now: 1003
  })
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1', verdict: 'reproduced',
    validator: 'agent:pentest-auditor', evidenceIds: ['evidence-1'], now: 1004
  })
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'admin read confirmed', evidenceIds: ['evidence-1'] }, now: 1005
  })
  state = reduceV4(state, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'finding-1', reason: 'admin read proves it', now: 1006
  })
  return state
}

function makeAuditorTeams(root, resultFactory) {
  const member = { id: 'member-auditor-1', name: 'pentest-auditor', role: 'teammate', status: 'inactive', diagnostics: [] }
  const writeResult = (promptText) => {
    const match = promptText.match(/write ONLY the JSON object[\s\S]*?to: (.+\.json)/)
    assert.ok(match, 'role prompt must include a result path')
    const file = match[1]
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, JSON.stringify(resultFactory()), 'utf8')
  }
  return {
    async spawnTeammate(_caller, request) {
      writeResult(request.prompt[0].text)
      return { member }
    },
    async sendMessage(_caller, request) {
      writeResult(request.content[0].text)
      return { accepted: true }
    },
    listMembers() { return [member] }
  }
}

function makeReporterTeams(root, { gaps = 0, markdown } = {}) {
  const member = { id: 'member-reporter-1', name: 'pentest-reporter', role: 'teammate', status: 'inactive', diagnostics: [] }
  const writeResult = (promptText) => {
    const match = promptText.match(/write ONLY the JSON object[\s\S]*?to: (.+\.json)/)
    assert.ok(match, 'role prompt must include a result path')
    const resultFile = match[1]
    fs.mkdirSync(path.dirname(resultFile), { recursive: true })
    fs.writeFileSync(resultFile, JSON.stringify({
      ok: true,
      reportPath: 'reports/v4-report.md',
      sections: [{ title: '执行摘要', summary: 'done' }],
      gaps: Array.from({ length: gaps }, (_, index) => ({
        code: `GAP-${String(index + 1).padStart(2, '0')}`, severity: 'low', detail: 'gap'
      })),
      notes: ''
    }), 'utf8')
    write(path.join(root, 'reports', 'v4-report.md'), markdown)
  }
  return {
    async spawnTeammate(_caller, request) {
      writeResult(request.prompt[0].text)
      return { member }
    },
    async sendMessage(_caller, request) {
      writeResult(request.content[0].text)
      return { accepted: true }
    },
    listMembers() { return [member] }
  }
}

test('flow_audit re-reviews an old Lead-signed high finding with the auditor', async () => {
  const proofText = 'HTTP/1.1 200 OK\n\nauditor reproduced'
  const harness = await createHarness({
    agentTeamsFactory: (root) => makeAuditorTeams(root, () => ({
      findingId: 'finding-1', verdict: 'reproduced', decision: 'approved',
      severity: 'high', severityRationale: 'unauthorized admin read reproduced',
      impactProven: 'read', vulnType: 'auth_bypass',
      rootCause: 'missing server-side authorization check',
      exploitTechnique: 'anonymous request to /admin',
      dedupeKey: 'auth_bypass:missing server-side authorization check',
      affectedAssets: ['https://t.test'],
      evidence: [{
        kind: 'response', path: 'evidence/auditor-proof.txt',
        sha256: sha256(proofText), summary: 'auditor replay'
      }],
      safetyDecision: 'allow_readonly', notes: 'reproduced'
    }))
  })
  try {
    const state = buildDeliverableState(harness.root)
    state.validations = [{
      id: 'validation-1', findingId: 'finding-1', verdict: 'reproduced',
      validator: 'Lead', evidenceIds: ['evidence-1'], notes: 'legacy', at: 1004
    }]
    write(path.join(harness.root, 'evidence', 'auditor-proof.txt'), proofText)
    harness.seedState(state)
    const result = await harness.call('pentest_flow_audit', { timeoutMs: 5000, wait: true })
    assert.equal(result.audited.length, 1)
    assert.equal(result.audited[0].findingId, 'finding-1')
    const after = harness.readState()
    const latest = after.validations.at(-1)
    assert.equal(latest.validator, 'agent:pentest-auditor')
    assert.equal(latest.verdict, 'reproduced')
    const old = after.validations.find((item) => item.validator === 'Lead')
    assert.equal(old.superseded, true)
    assert.equal(after.findings[0].vulnType, 'auth_bypass')
    assert.equal(after.findings[0].status, 'confirmed')
  } finally {
    harness.cleanup()
  }
})

test('flow_audit persists needs_review metadata and creates a pending approval', async () => {
  const harness = await createHarness({
    agentTeamsFactory: (root) => makeAuditorTeams(root, () => ({
      findingId: 'finding-1', verdict: 'inconclusive', decision: 'needs_review',
      severity: 'low', severityRationale: 'reproduction would require a destructive write',
      impactProven: 'none', vulnType: 'rce',
      rootCause: 'unsafe deserialization', exploitTechnique: 'crafted payload',
      dedupeKey: 'rce:unsafe deserialization', affectedAssets: ['https://t.test'],
      evidence: [], safetyDecision: 'requires_user_approval',
      proposedAction: 'write non-destructive marker file', notes: 'needs user approval'
    }))
  })
  try {
    const state = buildDeliverableState(harness.root)
    state.validations = []
    state.findings[0].status = 'unverified'
    harness.seedState(state)
    const result = await harness.call('pentest_flow_audit', { timeoutMs: 5000, wait: true })
    assert.equal(result.pending.length, 1)
    const after = harness.readState()
    const finding = after.findings[0]
    assert.equal(finding.approvalStatus, 'pending')
    assert.equal(finding.auditDecision, 'needs_review')
    assert.equal(finding.vulnType, 'rce')
    assert.match(finding.rootCause, /deserialization/)
    assert.equal(finding.dedupeKey, 'rce:unsafe deserialization')
  } finally {
    harness.cleanup()
  }
})

test('parseReportGaps counts explicit GAP codes and bullet gaps', () => {
  assert.equal(parseReportGaps('# 报告\n\nGAP-01 未测内网\nGAP-02 未测移动端\nGAP-16 未测供应链'), 3)
  assert.equal(parseReportGaps('# 报告\n\n## 覆盖缺口\n- 未覆盖内网\n- 未覆盖移动端\n'), 2)
  assert.equal(parseReportGaps('# 报告\n\n- 未覆盖轴：surface, identity\n'), 2)
  assert.equal(parseReportGaps('# 报告\n\n没有缺口'), 0)
})

test('reporter file is adopted with by/revision/bytes/gaps aligned to disk', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    state.roles.reporter = {
      lastStatus: 'completed', lastStartedAt: 0, lastRunAt: Date.now() + 5000,
      lastMemberName: 'pentest-reporter', lastRevision: state.revision
    }
    harness.seedState(state)
    const reportPath = path.join(harness.root, 'reports', 'v4-report.md')
    const markdown = [
      '# 渗透测试报告（v4）', '',
      '## 已确认发现', '',
      '### [high] 管理员接口可匿名读取', '',
      '#### 漏洞描述', '匿名可读管理员数据。', '',
      '#### 测试过程', '```http\nGET /admin HTTP/1.1\nHost: t.test\n```', '',
      '#### 风险分析', '管理员数据泄露。', '',
      '#### 修复建议', '增加服务端鉴权。', '',
      '## 覆盖缺口', '- GAP-01 未测试内网', '- GAP-02 未测试移动端', '',
      '## 证据索引', '- evidence-1 evidence/proof.txt'
    ].join('\n')
    write(reportPath, markdown)

    const result = await harness.call('pentest_flow_report', { member: true })
    assert.equal(result.adopted, true)
    assert.equal(result.by, 'teammate:reporter')
    assert.equal(result.bytes, fs.statSync(reportPath).size)
    assert.equal(result.gaps, 2)
    const after = harness.readState()
    assert.equal(after.report.by, 'teammate:reporter')
    assert.equal(after.report.memberName, 'pentest-reporter')
    assert.equal(after.report.bytes, fs.statSync(reportPath).size)
    assert.equal(after.report.gaps, 2)
    assert.equal(after.report.revision + 1, after.revision)
    assert.equal(fs.existsSync(path.join(harness.root, 'reports', 'v4-report.docx')), false)

    const delivery = await harness.call('pentest_flow_delivery')
    assert.deepEqual(delivery.problems, [])
    assert.equal(delivery.ok, true)
  } finally {
    harness.cleanup()
  }
})

test('reporter structured gaps are recorded and DOCX stays opt-in', async () => {
  const markdown = [
    '# 渗透测试报告（v4）', '',
    '## 已确认发现', '',
    '### [high] 管理员接口可匿名读取', '',
    '#### 漏洞描述', '匿名可读管理员数据。', '',
    '#### 测试过程', '```http\nGET /admin HTTP/1.1\nHost: t.test\n```', '',
    '#### 风险分析', '管理员数据泄露。', '',
    '#### 修复建议', '增加服务端鉴权。', '',
    '## 证据索引', '- evidence-1 evidence/proof.txt'
  ].join('\n')
  const harness = await createHarness({
    agentTeamsFactory: (root) => makeReporterTeams(root, { gaps: 3, markdown })
  })
  try {
    const state = buildDeliverableState(harness.root)
    harness.seedState(state)
    const result = await harness.call('pentest_flow_report', { member: true })
    assert.equal(result.by, 'teammate:reporter')
    assert.equal(result.gaps.length, 3)
    const after = harness.readState()
    assert.equal(after.report.gaps, 3)
    assert.equal(after.report.bytes, fs.statSync(path.join(harness.root, 'reports', 'v4-report.md')).size)
    assert.equal(after.report.revision + 1, after.revision)
    assert.equal(fs.existsSync(path.join(harness.root, 'reports', 'v4-report.docx')), false)
  } finally {
    harness.cleanup()
  }
})

test('stale renderer report is rejected by delivery', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    state.report = {
      path: 'reports/v4-report.md', by: 'teammate:reporter', memberName: 'pentest-reporter',
      revision: state.revision - 3, bytes: 12, gaps: 0, templateId: 'pentest-default-v1', at: 1
    }
    write(path.join(harness.root, 'reports', 'v4-report.md'), '# 渗透测试报告（v4）\nGAP-01 缺口\n证据\n')
    harness.seedState(state)
    const delivery = await harness.call('pentest_flow_delivery')
    assert.equal(delivery.ok, false)
    assert.ok(delivery.problems.some((item) => item.includes('报告已过期')))
    assert.ok(delivery.problems.some((item) => item.includes('字节数不一致')))
    assert.ok(delivery.problems.some((item) => item.includes('gaps 不一致')))
  } finally {
    harness.cleanup()
  }
})

test('delivery rejects a high finding whose only reproduction was signed by Lead', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    // Simulate an old session: the finding is marked confirmed, but the only
    // reproduction row was signed by Lead, not the auditor.
    state.validations = [{
      id: 'validation-1', findingId: 'finding-1', verdict: 'reproduced',
      validator: 'Lead', evidenceIds: ['evidence-1'], notes: 'legacy', at: 1004
    }]
    harness.seedState(state)
    const delivery = await harness.call('pentest_flow_delivery')
    assert.equal(delivery.ok, false)
    assert.ok(delivery.problems.some((item) => item.includes('agent:pentest-auditor')))
  } finally {
    harness.cleanup()
  }
})

test('delivery rejects a goal proof whose evidenceId is a finding id', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    state.goals[0].proofs = [{ evidenceId: 'finding-1', reason: 'legacy proof', at: 1 }]
    harness.seedState(state)
    const delivery = await harness.call('pentest_flow_delivery')
    assert.equal(delivery.ok, false)
    assert.ok(delivery.problems.some((item) => item.includes('proof.evidenceId 不是 evidence id')))
  } finally {
    harness.cleanup()
  }
})

test('delivery rejects a pending approval', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    state.findings[0].approvalStatus = 'pending'
    harness.seedState(state)
    const delivery = await harness.call('pentest_flow_delivery')
    assert.equal(delivery.ok, false)
    assert.ok(delivery.problems.some((item) => item.includes('等待用户审批')))
  } finally {
    harness.cleanup()
  }
})

test('flow_validate rejects a Lead validator for high and accepts the auditor', async () => {
  const harness = await createHarness()
  try {
    const state = buildDeliverableState(harness.root)
    // Remove the seeded validation so the tool is the only writer.
    state.validations = []
    state.findings[0].status = 'unverified'
    state.findings[0].validationId = null
    harness.seedState(state)
    await assert.rejects(
      () => harness.call('pentest_flow_validate', {
        findingId: 'finding-1', verdict: 'reproduced', validator: 'lead',
        independent: false, evidenceIds: ['evidence-1']
      }),
      /agent:pentest-auditor/
    )
    const ok = await harness.call('pentest_flow_validate', {
      findingId: 'finding-1', verdict: 'reproduced', validator: 'agent:pentest-auditor',
      independent: false, evidenceIds: ['evidence-1'], notes: 'auditor replay'
    })
    assert.equal(ok.verdict, 'reproduced')
    const after = harness.readState()
    assert.equal(after.validations.at(-1).validator, 'agent:pentest-auditor')
  } finally {
    harness.cleanup()
  }
})
