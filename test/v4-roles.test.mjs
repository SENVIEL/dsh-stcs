import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'
import { RoleRunner, TeamRoleRunner, validateRoleOutput } from '../lib/v4/roles.js'
import { redLineReason } from '../lib/v4/safety.js'

function makeSession() {
  let state = createV4State({ sessionId: 'role-s1', target: 'https://t.test', objective: 'o', workdir: 'C:/tmp/s1', now: 1 })
  return {
    get state() { return state },
    async read() { return state },
    async run(cmd) { state = reduceV4(state, cmd); return state }
  }
}

function makeSubagents(structured, stopReason = 'completed') {
  const calls = []
  return {
    calls,
    async startActivation(request) {
      calls.push(request)
      return { childId: 'child-1', result: Promise.resolve({ stopReason, structured }) }
    }
  }
}

test('role runner uses named preset, maxDepth 1 and records role state', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-role-'))
  const file = path.join(dir, 'proof.txt')
  fs.writeFileSync(file, 'new evidence')
  const sha256 = crypto.createHash('sha256').update('new evidence').digest('hex')
  const session = makeSession()
  const subagents = makeSubagents({
    findingId: 'finding-1', verdict: 'reproduced', notes: 'ok',
    evidence: [{ kind: 'file', path: 'proof.txt', sha256, summary: 'proof' }]
  })
  const runner = new RoleRunner({ session, subagents, agent: { id: 'lead' }, cwd: dir })
  const out = await runner.run('validator', { findingId: 'finding-1' })
  assert.equal(out.structured.verdict, 'reproduced')
  assert.equal(subagents.calls.length, 1)
  assert.equal(subagents.calls[0].request.agentPreset, 'pentest-validator')
  assert.equal(subagents.calls[0].request.maxDepth, 1)
  assert.equal(subagents.calls[0].request.outputSchema.required.includes('verdict'), true)
  assert.equal(session.state.roles.validator.lastStatus, 'completed')
  assert.equal(session.state.roles.validator.lastVerdict, 'reproduced')
  assert.equal(session.state.roles.validator.lastChildId, 'child-1')
})

test('auditor runs through the named role transport with its own schema', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-auditor-'))
  const file = path.join(dir, 'proof.txt')
  fs.writeFileSync(file, 'auditor proof')
  const sha256 = crypto.createHash('sha256').update('auditor proof').digest('hex')
  const subagents = makeSubagents({
    findingId: 'finding-1', verdict: 'reproduced', decision: 'approved',
    severity: 'critical', severityRationale: 'validated OS command execution',
    impactProven: 'rce', vulnType: 'rce', rootCause: 'dataease previewsql h2 create alias', exploitTechnique: 'h2_jdbc_create_alias',
    dedupeKey: 'rce:dataease previewsql h2 create alias',
    safetyDecision: 'allow_readonly',
    evidence: [{ kind: 'file', path: 'proof.txt', sha256, summary: 'proof' }], notes: 'confirmed'
  })
  const session = makeSession()
  const runner = new RoleRunner({ session, subagents, agent: { id: 'lead' }, cwd: dir })
  const out = await runner.run('auditor', { findingId: 'finding-1' })
  assert.equal(out.structured.decision, 'approved')
  assert.equal(out.structured.severity, 'critical')
  assert.equal(subagents.calls[0].request.agentPreset, 'pentest-validator')
  assert.equal(subagents.calls[0].request.outputSchema.required.includes('decision'), true)
  assert.equal(session.state.roles.auditor.lastStatus, 'completed')
  assert.equal(session.state.roles.auditor.lastVerdict, 'reproduced')
  assert.equal(session.state.roles.auditor.lastDecision, 'approved')
  assert.equal(session.state.roles.auditor.lastSeverity, 'critical')
  assert.equal(session.state.roles.auditor.lastImpactProven, 'rce')
})

test('auditor accepts a descriptive dedupeKey instead of rejecting the whole run', () => {
  assert.doesNotThrow(() => validateRoleOutput('auditor', {
    findingId: 'finding-3',
    verdict: 'not_reproduced',
    decision: 'rejected',
    severity: 'low',
    severityRationale: 'information disclosure only',
    impactProven: 'info',
    vulnType: 'info_disclosure',
    rootCause: 'wordpress default configuration leaves the rest users collection and author archive routes publicly readable, publishing the author user_nicename, display name and numeric user id to anonymous clients; absence of hardening (not a defect)',
    dedupeKey: 'info_disclosure:wordpress default configuration leaves the rest users collection and author archive routes publicly readable, publishing the author user_nicename, display name and numeric user id to anonymous clients; absence of hardening (not a defect)',
    evidence: [],
    safetyDecision: 'allow_readonly',
    notes: 'no independent reproduction'
  }))
})

test('role runner rejects an incomplete role without marking success', async () => {
  const session = makeSession()
  const subagents = makeSubagents({}, 'aborted')
  const runner = new RoleRunner({ session, subagents, agent: { id: 'lead' }, cwd: process.cwd() })
  await assert.rejects(() => runner.run('reviewer', {}), /stopped: aborted/)
  assert.equal(session.state.roles.reviewer.lastStatus, 'incomplete')
  assert.match(session.state.roles.reviewer.lastDiagnostic, /aborted/)
})

test('role runner rejects malformed structured output', async () => {
  const session = makeSession()
  const subagents = makeSubagents({ ok: true, checkedRevision: 1 })
  const runner = new RoleRunner({ session, subagents, agent: { id: 'lead' }, cwd: process.cwd() })
  await assert.rejects(() => runner.run('reviewer', {}), /missing problems/)
  assert.equal(session.state.roles.reviewer.lastStatus, 'failed')
})

test('validateRoleOutput enforces role-specific shape', () => {
  assert.throws(() => validateRoleOutput('validator', { findingId: 'f', verdict: 'maybe', evidence: [], notes: '' }), /invalid verdict/)
  assert.throws(() => validateRoleOutput('librarian', { assets: {}, notes: '' }), /assets must be an array/)
  assert.doesNotThrow(() => validateRoleOutput('critic', { repeats: [], tooBroad: [], candidates: [] }))
  assert.doesNotThrow(() => validateRoleOutput('reporter', {
    ok: true, reportPath: 'reports/v4-report.md', sections: [], gaps: [], notes: ''
  }))
  assert.throws(() => validateRoleOutput('reporter', { ok: true, reportPath: 'x', sections: {}, gaps: [], notes: '' }), /reporter output is invalid/)
  assert.doesNotThrow(() => validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'reproduced', decision: 'approved',
    severity: 'critical', severityRationale: 'validated OS command execution',
    impactProven: 'rce', vulnType: 'rce', rootCause: 'dataease previewsql h2 create alias', exploitTechnique: 'h2_jdbc_create_alias',
    dedupeKey: 'rce:dataease previewsql h2 create alias',
    evidence: [], safetyDecision: 'allow_readonly', notes: ''
  }))
  assert.throws(() => validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'reproduced', decision: 'approved',
    severity: 'critical', severityRationale: 'validated OS command execution',
    impactProven: 'rce', vulnType: 'rce', rootCause: 'dataease previewsql h2 create alias', exploitTechnique: 'h2_jdbc_create_alias',
    dedupeKey: 'rce:dataease previewsql h2 create alias',
    evidence: [], safetyDecision: 'deny', notes: ''
  }), /cannot approve/)
  const normalizedInfo = validateRoleOutput('auditor', {
    findingId: 'finding-1', verdict: 'reproduced', decision: 'approved',
    severity: 'high', severityRationale: 'inflated', impactProven: 'info',
    vulnType: 'info', rootCause: 'banner', exploitTechnique: 'banner', dedupeKey: 'info:banner',
    evidence: [], safetyDecision: 'allow', notes: ''
  })
  assert.equal(normalizedInfo.severity, 'low')
  assert.equal(normalizedInfo.decision, 'inconclusive')
  assert.match(normalizedInfo.notes, /information-only/)
})

test('sole red line blocks only delete/tamper of existing data', () => {
  assert.ok(redLineReason('未授权删除原有用户数据的接口'))
  assert.match(redLineReason('DELETE /api/users/1'), /DELETE/i)
  // Outside the sole user red line: must NOT be gated behind approval.
  assert.equal(redLineReason('cause a crash with a malformed request'), '')
  assert.equal(redLineReason('read-only GET /api/version'), '')
  assert.equal(redLineReason('obtain an OAuth2 JWT with client_credentials'), '')
})

test('role state reducer rejects unknown roles', () => {
  const state = createV4State({ sessionId: 'role-s2', target: 't', now: 1 })
  assert.throws(() => reduceV4(state, { type: 'role', op: 'record', role: 'hacker', now: 2 }), /unknown role/)
})

test('role evidence must stay inside workdir and match its hash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-role-evidence-'))
  fs.writeFileSync(path.join(dir, 'ok.txt'), 'ok')
  const runner = new RoleRunner({ session: makeSession(), subagents: {}, agent: {}, cwd: dir })
  assert.throws(() => runner.prepareEvidence([{ kind: 'file', path: '../escape.txt' }]), /escapes workdir/)
  assert.throws(() => runner.prepareEvidence([{ kind: 'file', path: 'ok.txt', sha256: '0'.repeat(64) }]), /hash mismatch/)
  const [prepared] = runner.prepareEvidence([{ kind: 'file', path: 'ok.txt', summary: 'ok' }])
  assert.equal(prepared.role, 'verification')
  assert.equal(prepared.path, 'ok.txt')
  assert.equal(prepared.sha256, crypto.createHash('sha256').update('ok').digest('hex'))
})


test('team role runner creates a visible member, reuses it, and records each run', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-team-role-'))
  const session = makeSession()
  let spawned = null
  const messages = []
  let live = false
  const member = { id: 'member-1', name: 'pentest-reviewer', role: 'teammate', status: 'inactive', diagnostics: [] }
  const writeResult = (text) => {
    const match = text.match(/write ONLY the JSON object[\s\S]*?to: (.+\.json)/)
    assert.ok(match, 'prompt must include result path')
    fs.mkdirSync(path.dirname(match[1]), { recursive: true })
    fs.writeFileSync(match[1], JSON.stringify({ ok: true, checkedRevision: 1, problems: [], notes: 'clean' }))
  }
  const agentTeams = {
    async spawnTeammate(caller, request) {
      spawned = request
      live = true
      writeResult(request.prompt[0].text)
      return { member }
    },
    async sendMessage(caller, request) {
      messages.push(request)
      writeResult(request.content[0].text)
      return { accepted: true }
    },
    listMembers() { return live ? [member] : [] }
  }
  const runner = new TeamRoleRunner({ session, agentTeams, agent: { id: 'lead' }, cwd: dir })
  const first = await runner.run('reviewer', { revision: 1 })
  const second = await runner.run('reviewer', { revision: 2 })
  assert.equal(first.transport, 'teammate')
  assert.equal(first.childId, 'member-1')
  assert.equal(first.structured.ok, true)
  assert.equal(spawned.name, 'pentest-reviewer')
  assert.equal(spawned.context, 'fresh')
  assert.equal(messages.length, 1)
  assert.equal(messages[0].target, 'pentest-reviewer')
  assert.equal(second.memberName, 'pentest-reviewer')
  assert.equal(session.state.roles.reviewer.lastStatus, 'completed')
  assert.equal(session.state.roles.reviewer.lastChildId, 'member-1')
  assert.equal(session.state.roles.reviewer.lastMemberName, 'pentest-reviewer')
})

test('team role runner uses named subagents when agentTeams.spawnTeammate is gone', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-role-subagent-'))
  const session = makeSession()
  const subagents = makeSubagents({ ok: true, checkedRevision: 1, problems: [], notes: 'clean' })
  const runner = new TeamRoleRunner({ session, subagents, agent: { id: 'lead' }, cwd: dir })
  const out = await runner.run('reviewer', { revision: 1 })
  assert.equal(out.transport, 'subagent')
  assert.equal(out.childId, 'child-1')
  assert.equal(out.structured.ok, true)
  assert.equal(subagents.calls.length, 1)
  assert.equal(subagents.calls[0].request.agentPreset, 'pentest-reviewer')
  assert.equal(subagents.calls[0].request.outputSchema.required.includes('problems'), true)
  assert.equal(session.state.roles.reviewer.lastStatus, 'completed')
})

test('team role runner spills oversized payloads instead of sending a >64KB message', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pentest-team-role-large-'))
  const session = makeSession()
  let promptText = ''
  const agentTeams = {
    async spawnTeammate(_caller, request) {
      promptText = request.prompt[0].text
      const match = promptText.match(/write ONLY the JSON object[\s\S]*?to: (.+\.json)/)
      fs.mkdirSync(path.dirname(match[1]), { recursive: true })
      fs.writeFileSync(match[1], JSON.stringify({ ok: true, checkedRevision: 1, problems: [], notes: '' }))
      return { member: { id: 'member-large', name: request.name, role: 'teammate', status: 'inactive', diagnostics: [] } }
    },
    listMembers() { return [] }
  }
  const runner = new TeamRoleRunner({ session, agentTeams, agent: { id: 'lead' }, cwd: dir })
  await runner.run('reviewer', { findings: [{ claim: 'x'.repeat(50000) }] })
  assert.ok(promptText.length < 65536)
  assert.match(promptText, /payloadPath/)
  const inputs = fs.readdirSync(path.join(dir, 'reports', 'roles')).filter((name) => name.includes('-input-'))
  assert.equal(inputs.length, 1)
})

test('team role runner refuses unavailable teammate transport', async () => {
  const runner = new TeamRoleRunner({ session: makeSession(), agentTeams: null, agent: {}, cwd: process.cwd() })
  await assert.rejects(() => runner.run('validator', {}), /agentTeams service is not mounted/)
})

