import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { V4Session } from '../lib/v4/session.js'
import { V4Dispatcher, WORKER_SCHEMA } from '../lib/v4/dispatch.js'

function makeHarness({ childId = 'child-1', children = [] } = {}) {
  const rows = new Map()
  const store = V4Session.createStore({
    load: async (id) => rows.get(id),
    save: async (id, state) => { rows.set(id, structuredClone(state)) },
    append: async () => {},
    now: () => 1000
  })
  const session = new V4Session({ store, sessionId: 's1' })
  const calls = []
  const interrupts = []
  let resolveResult
  const result = new Promise((resolve) => { resolveResult = resolve })
  const service = {
    list: () => ['spawn'],
    getProvider: () => ({ capabilities: { outputSchema: true }, inheritsParentContext: false }),
    listChildren: async () => children,
    interrupt: (...args) => { interrupts.push(args) },
    startActivation: async (spec) => {
      calls.push(spec)
      return { childId, result, dispose: async () => {} }
    }
  }
  return { session, service, calls, interrupts, resolveResult }
}

async function withGoal(harness, workdir) {
  await harness.session.init({ target: 'https://t.test', targets: ['https://t.test'], objective: 'o', workdir })
  await harness.session.addDirection({
    axis: ['input'], question: '上传点能否写到可执行目录？', doneWhen: '写文件后能从 Web 根回读'
  })
}

function writeEvidence(workdir, rel, content) {
  const file = path.join(workdir, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
  return crypto.createHash('sha256').update(content).digest('hex')
}

test('dispatch starts a spawn worker with outputSchema and marks the task running', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    const out = await dispatcher.assign('direction-1')
    assert.equal(out.taskId, 'task-1')
    assert.equal(out.childId, 'child-1')
    assert.equal(h.calls.length, 1)
    assert.equal(h.calls[0].provider, 'spawn')
    assert.equal(h.calls[0].request.outputSchema, WORKER_SCHEMA)
    assert.match(h.calls[0].request.prompt[0].text, /上传点能否写到可执行目录/)
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'running')
    assert.equal(state.tasks[0].childId, 'child-1')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('commit writes evidence, fact, finding and closes the direction', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const sha = writeEvidence(workdir, 'evidence/e1.txt', 'POST /upload -> 200, /uploads/x.php readable')
    const ok = await dispatcher.commitResult('task-1', {
      stopReason: 'completed',
      structured: {
        conclusion: '上传可写 Web 目录，已回读',
        directionState: 'done',
        evidence: [{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/e1.txt', sha256: sha }],
        facts: [{ answer: '上传返回 200，且 /uploads/x.php 可回读', confidence: 'observed', evidenceKeys: ['e1'] }],
        assets: [{ type: 'endpoint', value: 'POST /upload', meta: 'upload endpoint' }],
        findings: [{ claim: '任意文件上传可写 Web 目录', description: '未授权上传可写入 Web 目录。', steps: ['POST /upload HTTP/1.1\nHost: t.test\n\nfile=test'], riskAnalysis: '可导致 Web 内容被篡改。', remediation: '增加鉴权与扩展名白名单。', severity: 'high', impactProven: 'write', evidenceKeys: ['e1'] }],
        coverage: [{ axis: 'input', result: 'issue_found', note: 'upload verified', evidenceKeys: ['e1'] }],
        nextQuestions: ['能否覆盖已有文件？']
      }
    })
    assert.equal(ok, true)
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'done')
    assert.equal(state.directions[0].state, 'done')
    assert.equal(state.directions[0].conclusion.answer, '上传可写 Web 目录，已回读')
    assert.equal(state.evidence.length, 1)
    assert.equal(state.facts.length, 1)
    assert.equal(state.findings.length, 1)
    assert.equal(state.findings[0].evidenceIds[0], 'evidence-1')
    assert.equal(state.findings[0].status, 'unverified')
    assert.ok(state.assets.some((item) => item.type === 'endpoint' && item.value === 'POST /upload'))
    assert.equal(state.coverage[0].result, 'issue_found')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('commit notifies the orchestrator with the new finding ids', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    let seen = null
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({
      session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir,
      onCommit: async (info) => { seen = info }
    })
    await dispatcher.assign('direction-1')
    const sha = writeEvidence(workdir, 'evidence/e1.txt', 'proof')
    const ok = await dispatcher.commitResult('task-1', {
      stopReason: 'completed',
      structured: {
        conclusion: 'finding', directionState: 'done',
        evidence: [{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/e1.txt', sha256: sha }],
        facts: [], findings: [{ claim: 'issue', description: 'issue', steps: ['GET /'], riskAnalysis: 'risk', remediation: 'fix', severity: 'high', impactProven: 'read', evidenceKeys: ['e1'] }], coverage: []
      }
    })
    assert.equal(ok, true)
    assert.equal(seen.taskId, 'task-1')
    assert.deepEqual(seen.findingIds, ['finding-1'])
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('commit promotes a coverage issue_found when the worker forgot findings', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const sha = writeEvidence(workdir, 'evidence/rce.txt', 'uid=0(root)')
    const ok = await dispatcher.commitResult('task-1', {
      stopReason: 'completed',
      structured: {
        conclusion: '已执行 id，返回 uid=0(root)',
        directionState: 'done',
        evidence: [{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/rce.txt', sha256: sha }],
        facts: [{ answer: '已确认命令执行，id 返回 uid=0(root)', confidence: 'observed', evidenceKeys: ['e1'] }],
        findings: [],
        coverage: [{ axis: 'chain', result: 'issue_found', note: '已确认通过 SQL 执行 OS 命令，id 返回 uid=0(root)', evidenceKeys: ['e1'] }]
      }
    })
    assert.equal(ok, true)
    const state = await h.session.read()
    assert.equal(state.findings.length, 1)
    assert.equal(state.findings[0].severity, 'critical')
    assert.equal(state.findings[0].impactProven, 'rce')
    assert.equal(state.findings[0].evidenceIds[0], 'evidence-1')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('commit salvages a finding missing report-only fields', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const sha = writeEvidence(workdir, 'evidence/default.txt', 'admin login accepted')
    const ok = await dispatcher.commitResult('task-1', {
      stopReason: 'completed',
      structured: {
        conclusion: '默认口令可登录',
        directionState: 'done',
        evidence: [{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/default.txt', sha256: sha }],
        facts: [{ answer: '默认口令登录成功', confidence: 'observed', evidenceKeys: ['e1'] }],
        findings: [{ claim: 'DataEase 默认口令可登录', severity: 'high', evidenceKeys: ['e1'] }],
        coverage: []
      }
    })
    assert.equal(ok, true)
    const state = await h.session.read()
    assert.equal(state.findings.length, 1)
    assert.equal(state.findings[0].description, 'DataEase 默认口令可登录')
    assert.ok(state.findings[0].steps.length > 0)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('invalid worker payload fails the task and writes nothing', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const ok = await dispatcher.commitResult('task-1', { stopReason: 'completed', structured: { directionState: 'done' } })
    assert.equal(ok, false)
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'failed')
    assert.equal(state.findings.length, 0)
    assert.equal(state.directions[0].state, 'open')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('missing or tampered evidence fails the task', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const payload = (evidence) => ({
      stopReason: 'completed',
      structured: {
        conclusion: 'x', directionState: 'done',
        evidence, facts: [], findings: [], coverage: []
      }
    })
    const missing = await dispatcher.commitResult('task-1', payload([{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/nope.txt' }]))
    assert.equal(missing, false)
    let state = await h.session.read()
    assert.equal(state.tasks[0].state, 'failed')

    // New task, tampered hash.
    const h2 = makeHarness({ childId: 'child-2' })
    await withGoal(h2, workdir)
    const dispatcher2 = new V4Dispatcher({ session: h2.session, subagents: h2.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher2.assign('direction-1')
    writeEvidence(workdir, 'evidence/e2.txt', 'real content')
    const tampered = await dispatcher2.commitResult('task-1', payload([{ key: 'e1', kind: 'response', role: 'proof', path: 'evidence/e2.txt', sha256: 'f'.repeat(64) }]))
    assert.equal(tampered, false)
    state = await h2.session.read()
    assert.equal(state.tasks[0].state, 'failed')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('cancel interrupts the child and marks the task cancelled', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    await dispatcher.cancel('task-1')
    assert.equal(h.interrupts.length, 1)
    assert.deepEqual(h.interrupts[0], ['child-1', { kind: 'ancestor', agent: { id: 'lead' } }])
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'cancelled')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('reconcile marks running tasks unknown when the child is gone', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness({ children: [] })
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const out = await dispatcher.reconcile()
    assert.deepEqual(out.unknown, ['task-1'])
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'unknown')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('dispatcher refuses a second active task for the same direction', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    await assert.rejects(() => dispatcher.assign('direction-1'), /already has an active task/)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('normalizes real worker vocabulary drift before committing', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await dispatcher.assign('direction-1')
    const sha = writeEvidence(workdir, 'evidence/e1.txt', 'GET /admin/users -> 200, phone 13800000001')
    const ok = await dispatcher.commitResult('task-1', {
      stopReason: 'completed',
      structured: {
        conclusion: '存在未授权数据访问',
        directionState: 'completed',
        evidence: [{ key: 'e1', kind: 'http', role: 'support', path: 'evidence/e1.txt', sha256: sha }],
        facts: [{ answer: 'GET /admin/users 返回 200 与手机号', confidence: 'certain', evidenceKeys: ['e1'] }],
        findings: [{ claim: '未授权读取用户信息', description: '未授权读取用户信息。', steps: ['GET /admin/users HTTP/1.1\nHost: t.test'], riskAnalysis: '泄露用户手机号。', remediation: '增加服务端鉴权。', severity: 'moderate', impactProven: 'read', evidenceKeys: ['e1'] }],
        coverage: [{ axis: 'authn', result: 'found', note: '无 Cookie 也返回 200', evidenceKeys: ['e1'] }]
      }
    })
    assert.equal(ok, true)
    const state = await h.session.read()
    assert.equal(state.tasks[0].state, 'done')
    assert.equal(state.evidence[0].role, 'supporting')
    assert.equal(state.evidence[0].kind, 'response')
    assert.equal(state.findings[0].severity, 'medium')
    assert.equal(state.coverage[0].axis, 'identity')
    assert.equal(state.coverage[0].result, 'issue_found')
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})



test('dispatch refuses a v4 goal without structured scope targets', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await h.session.init({ target: 'https://t.test', objective: 'o', workdir })
    await h.session.addDirection({ axis: ['surface'], question: '目标有哪些接口？', doneWhen: '列出端点' })
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await assert.rejects(() => dispatcher.assign('direction-1'), /no structured scope targets/)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('dispatch refuses a direction that mentions an out-of-scope host', async () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'v4-dispatch-'))
  try {
    const h = makeHarness()
    await withGoal(h, workdir)
    await h.session.addDirection({ axis: ['surface'], question: '能否从 http://evil.example 横向？', doneWhen: '确认连通' })
    const dispatcher = new V4Dispatcher({ session: h.session, subagents: h.service, agent: { id: 'lead' }, cwd: workdir })
    await assert.rejects(() => dispatcher.assign('direction-2'), /out-of-scope host/)
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true })
  }
})

test('worker schema stays inside the subagent JSON-schema subset', () => {
  const walk = (node, where) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach((item, index) => walk(item, `${where}[${index}]`)); return }
    assert.equal('minLength' in node, false, `unsupported minLength at ${where}`)
    if (Array.isArray(node.enum)) assert.ok(node.type || node.oneOf, `enum needs type at ${where}`)
    for (const [key, value] of Object.entries(node)) walk(value, `${where}.${key}`)
  }
  walk(WORKER_SCHEMA, 'root')
})
