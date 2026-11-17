import test from 'node:test'
import assert from 'node:assert/strict'
import { createV4State } from '../lib/v4/state.js'
import { reduceV4 } from '../lib/v4/reduce.js'
import { importV3ToV4 } from '../lib/v4/import-v3.js'
import { inferAxes } from '../lib/v4/axes.js'
import { V4Session } from '../lib/v4/session.js'
import { planV4 } from '../lib/v4/plan.js'

function goal() {
  return createV4State({ sessionId: 's1', target: 'https://t.test', objective: 'o', workdir: 'C:/tmp/s1', now: 1 })
}

function withDirection() {
  let state = goal()
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['identity'],
    question: '登录面能否绕过认证？',
    doneWhen: '拿到任意一个未授权 token，或登录矩阵穷举后全部失败',
    now: 2
  })
  return state
}

test('v4 chain: direction -> fact -> finding -> validation -> coverage', () => {
  let state = withDirection()
  const direction = state.directions[0]
  assert.equal(direction.state, 'open')
  assert.deepEqual(direction.axis, ['identity'])

  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'a'.repeat(64), path: 'e1.txt', summary: 'login request' }],
    now: 3
  })
  const evidence = state.evidence[0]

  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: direction.id,
    answer: '登录成功返回 302，并种下 __Host-session cookie',
    confidence: 'observed', evidenceIds: [evidence.id], now: 4
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: direction.id,
    claim: '认证可被绕过', severity: 'high', impactProven: 'read', evidenceIds: [evidence.id], now: 5
  })
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'reproduced', validator: 'agent:pentest-auditor', evidenceIds: [evidence.id], now: 6
  })
  state = reduceV4(state, {
    type: 'coverage', op: 'set', axis: 'identity', result: 'issue_found', note: 'matrix done', now: 7
  })
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: direction.id, state: 'done',
    conclusion: { answer: '存在一条可绕过的登录分支', evidenceIds: [evidence.id] }, now: 8
  })

  assert.equal(state.facts.length, 1)
  assert.equal(state.findings[0].validationId, 'validation-1')
  assert.equal(state.findings[0].status, 'confirmed')
  assert.equal(state.validations[0].verdict, 'reproduced')
  assert.equal(state.coverage[0].result, 'issue_found')
  assert.equal(state.directions[0].state, 'done')
  assert.equal(state.revision, 8)
  const deleted = reduceV4(state, { type: 'finding', op: 'delete', id: 'finding-1', now: 9 })
  assert.equal(deleted.findings[0].deleted, true)
})

test('v4 rejects verification-shaped questions and empty doneWhen', () => {
  const state = goal()
  assert.throws(
    () => reduceV4(state, { type: 'direction', op: 'add', axis: ['input'], question: '验证: 上传点存在', doneWhen: 'x', now: 2 }),
    (error) => error.code === 'direction/question'
  )
  assert.throws(
    () => reduceV4(state, { type: 'direction', op: 'add', axis: ['input'], question: '上传点在哪里？', now: 2 }),
    (error) => error.code === 'direction/doneWhen'
  )
  const inferred = reduceV4(state, { type: 'direction', op: 'add', question: '然后呢？', doneWhen: 'x', now: 2 })
  assert.deepEqual(inferred.directions[0].axis, ['surface'])
})

test('v4 finding records its verification level independently of impact', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'file', role: 'proof', sha256: 'a'.repeat(64), path: 'source.txt', summary: 'source' }],
    now: 3
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: 'source-only command execution candidate', severity: 'high',
    verificationLevel: 'source_only', impactProven: 'none', evidenceIds: ['evidence-1'], now: 4
  })
  assert.equal(state.findings[0].verificationLevel, 'source_only')
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1',
    verificationLevel: 'local_harness', now: 5
  })
  assert.equal(state.findings[0].verificationLevel, 'local_harness')
  assert.throws(() => reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1',
    verificationLevel: 'looks-confirmed', now: 6
  }), (error) => error.code === 'finding/verification')
})

test('v4 rejects facts that only restate the question', () => {
  const state = withDirection()
  const direction = state.directions[0]
  assert.throws(
    () => reduceV4(state, {
      type: 'fact', op: 'add', directionId: direction.id,
      answer: '登录面能否绕过认证？', confidence: 'observed', now: 3
    }),
    (error) => error.code === 'fact/echoes-question'
  )
})

test('v4 requires evidence for findings and reproduced validations', () => {
  const state = withDirection()
  const direction = state.directions[0]
  assert.throws(
    () => reduceV4(state, { type: 'finding', op: 'add', directionId: direction.id, claim: 'x', severity: 'high', now: 3 }),
    (error) => error.code === 'finding/evidence'
  )
  let withFinding = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'b'.repeat(64), path: 'e2.txt', summary: 'x' }], now: 4
  })
  withFinding = reduceV4(withFinding, {
    type: 'finding', op: 'add', directionId: direction.id, claim: 'x', severity: 'high',
    evidenceIds: ['evidence-1'], now: 5
  })
  assert.throws(
    () => reduceV4(withFinding, {
      type: 'validation', op: 'add', findingId: 'finding-1', verdict: 'reproduced', validator: 'agent:pentest-auditor', now: 6
    }),
    (error) => error.code === 'validation/evidence'
  )
})

test('v4 refuses to close a direction without a conclusion', () => {
  const state = withDirection()
  const direction = state.directions[0]
  assert.throws(
    () => reduceV4(state, { type: 'direction', op: 'update', id: direction.id, state: 'done', now: 3 }),
    (error) => error.code === 'direction/conclusion'
  )
})

test('axis inference maps security language to axes', () => {
  assert.deepEqual(inferAxes('登录 token 与会话绕过'), ['identity'])
  assert.ok(inferAxes('未授权访问 /api 端点枚举').includes('surface'))
  assert.ok(inferAxes('SQL 注入与文件上传 getshell').includes('input'))
  assert.ok(inferAxes('Redis 未授权与 3306 端口').includes('infra'))
  assert.ok(inferAxes('利用链：写文件到命令执行').includes('chain'))
  assert.ok(inferAxes('多租户越权与金额篡改').includes('logic'))
})

test('v3 import preserves every node and infers axes', () => {
  const v3 = {
    sessionId: 's-import',
    version: 3,
    goal: { id: 'goal-1', target: 'https://t.test', objective: 'o', workdir: 'C:/tmp/s-import', phase: 'active' },
    directions: [
      { id: 'intent-1', title: '验证: 上传接口存在', kind: 'verify', state: 'done', stateReason: '已确认', detail: 'upload', priority: 5, createdAt: 1 },
      { id: 'intent-2', title: '认证面枚举', kind: 'recon', state: 'open', detail: 'login token', createdAt: 2 }
    ],
    facts: [{ id: 'fact-1', directionId: 'intent-1', detail: 'POST /upload 返回 200', confidence: 'high', createdAt: 3 }],
    findings: [{ id: 'finding-1', directionId: 'intent-1', title: '任意文件上传', severity: 'high', impactProven: 'write', evidenceIds: ['ev-1'], createdAt: 4 }],
    assets: [{ id: 'asset-1', type: 'endpoint', value: 'https://t.test/upload', createdAt: 1 }],
    evidence: [{ id: 'ev-1', kind: 'request', role: 'proof', sha256: 'c'.repeat(64), path: 'e3.txt', summary: 'upload', createdAt: 5 }],
    validations: [{ id: 'val-1', findingId: 'finding-1', verdict: 'reproduced', validator: 'w', evidenceIds: ['ev-1'], at: 6 }],
    coverage: [{ id: 'cov-1', surface: '上传面', outcome: 'issue_found', evidence: 'upload works' }]
  }
  const { state, stats } = importV3ToV4(v3, { now: 10 })
  assert.equal(state.version, 4)
  assert.equal(stats.directions, 2)
  assert.equal(stats.facts, 1)
  assert.equal(stats.findings, 1)
  assert.equal(stats.validations, 1)
  assert.equal(state.directions[0].question, '上传接口存在')
  assert.equal(state.directions[0].legacy, true)
  assert.ok(state.directions[0].axis.includes('input'))
  assert.equal(state.findings[0].validationId, 'val-1')
  assert.equal(state.facts[0].directionId, 'intent-1')
  assert.ok(stats.axes.input >= 1)
})

test('v4 session runs the full chain through the transaction store', async () => {
  const rows = new Map()
  const store = V4Session.createStore({
    load: async (id) => rows.get(id),
    save: async (id, state) => { rows.set(id, structuredClone(state)) },
    append: async () => {},
    now: () => 1000
  })
  const session = new V4Session({ store, sessionId: 'sess-v4' })
  await session.init({ target: 'https://v4.test', objective: 'chain', workdir: 'C:/tmp/v4' })

  await session.addDirection({
    axis: ['input'], question: '上传点能否写到可执行目录？',
    doneWhen: '写文件后能从 Web 根回读', stage: 'probe'
  })
  await session.addEvidence([{ kind: 'request', role: 'proof', sha256: 'd'.repeat(64), path: 'e.txt', summary: 'upload' }])
  await session.addFact({
    directionId: 'direction-1', answer: '上传返回 200，且 /uploads/x.php 可回读',
    confidence: 'observed', evidenceIds: ['evidence-1']
  })
  await session.addFinding({
    directionId: 'direction-1', claim: '任意文件上传可写 Web 目录',
    severity: 'high', impactProven: 'write', evidenceIds: ['evidence-1']
  })
  await session.validate({
    findingId: 'finding-1', verdict: 'reproduced',
    validator: 'agent:pentest-auditor', evidenceIds: ['evidence-1']
  })
  await session.setCoverage({ axis: 'input', result: 'issue_found', note: 'upload verified' })
  const state = await session.read()

  assert.equal(state.version, 4)
  assert.equal(state.revision, 7)
  assert.equal(state.facts.length, 1)
  assert.equal(state.findings[0].validationId, 'validation-1')
  assert.equal(state.coverage[0].result, 'issue_found')
})

test('v4 finding rate can be updated by an independent auditor', () => {
  let state = createV4State({ sessionId: 'rate-s1', target: 't', objective: 'o', now: 1 })
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['input'],
    question: 'input?', doneWhen: 'proof', now: 2
  })
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'response', role: 'proof', path: 'e.txt', sha256: 'a'.repeat(64), summary: 'proof' }],
    now: 3
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: 'input issue', severity: 'medium', impactProven: 'info',
    evidenceIds: ['evidence-1'], now: 4
  })
  state = reduceV4(state, {
    type: 'finding', op: 'rate', id: 'finding-1',
    severity: 'critical', impactProven: 'rce', riskAnalysis: 'confirmed',
    severityRationale: 'validated RCE', vulnType: 'rce',
    rootCause: 'dataease previewsql h2 create alias', exploitTechnique: 'h2_jdbc_create_alias', dedupeKey: 'rce:dataease previewsql h2 create alias',
    affectedAssets: ['https://t.test:8100'], now: 5
  })
  assert.equal(state.findings[0].severity, 'critical')
  assert.equal(state.findings[0].impactProven, 'rce')
  assert.equal(state.findings[0].riskAnalysis, 'confirmed')
  assert.equal(state.findings[0].severityRationale, 'validated RCE')
  assert.equal(state.findings[0].dedupeKey, 'rce:dataease previewsql h2 create alias')
  assert.equal(state.findings[0].vulnType, 'rce')
  assert.deepEqual(state.findings[0].affectedAssets, ['https://t.test:8100'])
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: 'same vulnerability via another asset', severity: 'critical', impactProven: 'rce',
    evidenceIds: ['evidence-1'], affectedAssets: ['https://t.test:8101'], now: 6
  })
  state = reduceV4(state, { type: 'finding', op: 'merge', id: 'finding-1', sourceId: 'finding-2', now: 7 })
  assert.equal(state.findings[1].deleted, true)
  assert.deepEqual(state.findings[0].affectedAssets, ['https://t.test:8100', 'https://t.test:8101'])
})

test('v4 plan proposes missing axes, open directions and validation debt', () => {
  const fresh = planV4(createV4State({ sessionId: 's', target: 't', objective: 'o', now: 1 }))
  assert.equal(fresh.actions[0].kind, 'add_direction')
  assert.equal(fresh.actions[0].axis, 'surface')
  assert.ok(fresh.coverageGaps.length >= 10)
  assert.equal(fresh.mustGenerate, true)

  const withOpen = planV4(withDirection())
  assert.equal(withOpen.actions[0].kind, 'run_direction')
  assert.equal(withOpen.actions[0].id, 'direction-1')
  assert.equal(withOpen.mustGenerate, false)
})

test('v4 plan exposes all validation debt and never advertises occupied worker slots', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'f'.repeat(64), path: 'e-debt.txt', summary: 'proof' }],
    now: 2
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: 'high debt', severity: 'high', evidenceIds: ['evidence-1'], now: 3
  })
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: 'medium debt', severity: 'medium', evidenceIds: ['evidence-1'], now: 4
  })
  const debt = planV4(state).actions.find((action) => action.kind === 'validate_batch')
  assert.deepEqual(debt.findingIds, ['finding-1', 'finding-2'])
  assert.equal(debt.count, 2)

  let full = goal()
  for (const axis of ['surface', 'input', 'logic', 'identity', 'config', 'component']) {
    full = reduceV4(full, {
      type: 'direction', op: 'add', axis: [axis],
      question: `${axis} surface?`, doneWhen: 'proof', now: 10
    })
  }
  for (const directionId of ['direction-1', 'direction-2', 'direction-3', 'direction-4', 'direction-5', 'direction-6']) {
    full = reduceV4(full, { type: 'task', op: 'assign', directionId, now: 11 })
  }
  const saturated = planV4(full)
  assert.equal(saturated.concurrency.available, 0)
  assert.equal(saturated.actions.some((action) => ['run_direction', 'dispatch_batch'].includes(action.kind)), false)
})


test('v4 planner keeps report-only directions out of worker slots', () => {
  let state = goal()
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['deliver', 'cleanup'],
    question: '整理最终报告、证据索引并完成交付收口', doneWhen: '报告与证据索引一致', now: 2
  })
  const reportOnly = planV4(state)
  assert.equal(reportOnly.frontier.length, 0)
  assert.equal(reportOnly.leadOnlyDirections.length, 1)
  assert.equal(reportOnly.mustGenerate, true)
  assert.equal(reportOnly.actions.some((action) => ['run_direction', 'dispatch_batch'].includes(action.kind)), false)

  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['identity'],
    question: '登录接口能否绕过认证？', doneWhen: '拿到任意未授权 token 或全部分支失败', now: 3
  })
  const mixed = planV4(state)
  assert.deepEqual(mixed.frontier.map((direction) => direction.id), ['direction-2'])
  assert.deepEqual(mixed.actions.find((action) => action.kind === 'run_direction')?.id, 'direction-2')
})


test('v4 infers an axis when a model sends a synonym', () => {
  const state = reduceV4(goal(), {
    type: 'direction', op: 'add', axis: ['authn'],
    question: '登录认证能否被绕过？', doneWhen: '无凭据拿到会话', now: 2
  })
  assert.ok(state.directions[0].axis.length > 0)
})

test('v4 supersedes older validations for the same finding', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'b'.repeat(64), path: 'e2.txt', summary: 'login request' }],
    now: 3
  })
  const evidenceId = state.evidence[0].id
  state = reduceV4(state, {
    type: 'finding', op: 'add', directionId: 'direction-1',
    claim: '认证可被绕过', severity: 'high', evidenceIds: [evidenceId], now: 4
  })
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'reproduced', validator: 'agent:pentest-auditor', evidenceIds: [evidenceId], now: 5
  })
  state = reduceV4(state, {
    type: 'validation', op: 'add', findingId: 'finding-1',
    verdict: 'inconclusive', validator: 'agent:pentest-auditor', evidenceIds: [evidenceId], now: 6
  })
  assert.equal(state.validations[0].superseded, true)
  assert.equal(Boolean(state.validations[1].superseded), false)
  assert.equal(state.findings[0].validationId, state.validations[1].id)
})

test('v4 rejects info-level findings instead of counting them as vulnerabilities', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'c'.repeat(64), path: 'e3.txt', summary: 'fingerprint' }],
    now: 3
  })
  assert.throws(
    () => reduceV4(state, {
      type: 'finding', op: 'add', directionId: 'direction-1',
      claim: 'nginx version hidden', severity: 'info', evidenceIds: ['evidence-1'], now: 4
    }),
    (error) => error.code === 'finding/severity'
  )
})

test('v4 goals need a fact or finding proof', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'd'.repeat(64), path: 'e4.txt', summary: 'proof' }],
    now: 3
  })
  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: 'direction-1',
    answer: 'observed fact', confidence: 'observed', evidenceIds: ['evidence-1'], now: 4
  })
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'observed fact', evidenceIds: ['evidence-1'] }, now: 4.5
  })
  const proved = reduceV4(state, {
    type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'fact-1', reason: 'fact proves it', now: 5
  })
  assert.equal(proved.goals[0].state, 'met')
  assert.equal(proved.goal.phase, 'done')
  assert.throws(
    () => reduceV4(state, { type: 'goal', op: 'prove', goalId: 'goal-1', evidenceId: 'evidence-1', now: 5 }),
    (error) => error.code === 'goal/evidence'
  )
})

test('v4 worker nextDirections become planner candidates and set mustGenerate', () => {
  let state = withDirection()
  state = reduceV4(state, { type: 'task', op: 'assign', directionId: 'direction-1', now: 2 })
  state = reduceV4(state, { type: 'task', op: 'start', id: 'task-1', childId: 'child-1', now: 3 })
  state = reduceV4(state, {
    type: 'worker', op: 'commit', taskId: 'task-1',
    conclusion: 'answered', directionState: 'done',
    evidence: [{ key: 'e1', kind: 'request', role: 'proof', sha256: 'e'.repeat(64), path: 'e5.txt', summary: 'proof' }],
    facts: [{ answer: 'a distinct fact', confidence: 'observed', evidenceKeys: ['e1'] }],
    assets: [{ type: 'endpoint', value: 'POST /api/v1/upload', meta: 'upload endpoint' }],
    nextDirections: [{ question: 'does the next surface accept input?', doneWhen: 'proof or exclusion', axis: ['input'], reason: 'new lead' }],
    now: 4
  })
  assert.ok(state.assets.some((item) => item.type === 'endpoint' && item.value === 'POST /api/v1/upload'))
  assert.equal(state.planner.candidates.length, 1)
  assert.equal(state.planner.mustGenerate, true)
  assert.equal(state.planner.candidates[0].question, 'does the next surface accept input?')
  const candidatePlan = planV4(state).actions.find((item) => item.kind === 'accept_candidate')
  assert.deepEqual(candidatePlan.candidateIds, ['candidate-1'])
  const accepted = reduceV4(state, { type: 'candidate', op: 'accept', id: 'candidate-1', now: 5 })
  assert.equal(accepted.directions.length, 2)
  assert.equal(accepted.directions[1].origin, 'planner')
  assert.equal(accepted.planner.candidates[0].state, 'accepted')
})

test('v4 refuses to close a direction with no fact or evidence', () => {
  const state = withDirection()
  assert.throws(
    () => reduceV4(state, {
      type: 'direction', op: 'update', id: 'direction-1', state: 'done',
      conclusion: { answer: 'claimed without doing the work' }, now: 4
    }),
    (error) => error.code === 'direction/evidence'
  )
})

test('v4 auto-records coverage and produces a concrete fallback direction', () => {
  let state = withDirection()
  state = reduceV4(state, {
    type: 'evidence', op: 'add',
    evidence: [{ kind: 'request', role: 'proof', sha256: 'f'.repeat(64), path: 'e6.txt', summary: 'proof' }],
    now: 3
  })
  state = reduceV4(state, {
    type: 'fact', op: 'add', directionId: 'direction-1',
    answer: 'auth bypass observed', confidence: 'observed', evidenceIds: ['evidence-1'], now: 4
  })
  state = reduceV4(state, {
    type: 'direction', op: 'update', id: 'direction-1', state: 'done',
    conclusion: { answer: 'auth bypass observed', evidenceIds: ['evidence-1'] }, now: 5
  })
  assert.equal(state.coverage.find((item) => item.axis === 'identity').result, 'no_issue_found')
  const plan = planV4(state)
  assert.equal(plan.coverageGaps.includes('identity'), false)
  assert.ok(plan.fallback)
  assert.match(plan.fallback.question, /https:\/\/t\.test/)
  assert.equal(plan.fallback.fallback, true)
})

test('v4 coverage requires evidence and blocked or empty coverage stays a gap', () => {
  let state = goal()
  state = reduceV4(state, {
    type: 'coverage', op: 'set', axis: 'surface', result: 'blocked',
    note: 'admin credentials unavailable', evidenceIds: [], now: 2
  })
  state = reduceV4(state, {
    type: 'coverage', op: 'set', axis: 'identity', result: 'no_issue_found',
    note: 'auto from direction without evidence', evidenceIds: [], now: 3
  })
  const plan = planV4(state)
  assert.ok(plan.coverageGaps.includes('surface'))
  assert.ok(plan.coverageGaps.includes('identity'))
})

test('v4 blocked candidate does not keep the planner awake', () => {
  let state = goal()
  state.planner.candidates.push({
    id: 'candidate-1', question: 'requires admin credentials', doneWhen: 'admin token',
    axis: ['credential'], parents: [], source: 'task-1', reason: '', state: 'proposed', createdAt: 2
  })
  state = reduceV4(state, {
    type: 'candidate', op: 'block', id: 'candidate-1', reason: 'admin credentials unavailable',
    blockedBy: ['admin_bearer', 'secure_path'], now: 3
  })
  assert.equal(state.planner.candidates[0].state, 'blocked')
  assert.deepEqual(state.planner.candidates[0].blockedBy, ['admin_bearer', 'secure_path'])
  assert.equal(state.planner.mustGenerate, false)
  const plan = planV4(state)
  assert.equal(plan.mustGenerate, false)
  assert.equal(plan.actions.some((item) => item.kind === 'accept_candidate'), false)
  assert.equal(plan.actions.some((item) => item.kind === 'add_direction'), false)
})

test('v4 preserves a fallback direction origin through the reducer', () => {
  let state = goal()
  state = reduceV4(state, {
    type: 'direction', op: 'add', axis: ['surface'],
    question: 'fallback question', doneWhen: 'evidence', origin: 'fallback', now: 2
  })
  assert.equal(state.directions[0].origin, 'fallback')
})

test('v4 plan batches independent frontier directions up to the worker limit', () => {
  let state = goal()
  for (let i = 0; i < 6; i += 1) {
    state = reduceV4(state, {
      type: 'direction', op: 'add', axis: ['surface'],
      question: `independent ${i}`, doneWhen: 'evidence', priority: 10 - i, now: 2 + i
    })
  }
  const plan = planV4(state)
  assert.equal(plan.concurrency.limit, 6)
  assert.equal(plan.concurrency.available, 6)
  assert.equal(plan.actions[0].kind, 'dispatch_batch')
  assert.equal(plan.actions[0].directionIds.length, 6)
})

test('v4 worker limit is persisted, clamped and used by the plan', () => {
  let state = goal()
  state = reduceV4(state, { type: 'settings', op: 'set', workerLimit: 9, now: 2 })
  assert.equal(state.settings.workerLimit, 6)
  assert.equal(planV4(state).concurrency.limit, 6)
  state = reduceV4(state, { type: 'settings', op: 'set', workerLimit: 0, now: 3 })
  assert.equal(state.settings.workerLimit, 1)
  assert.equal(planV4(state).concurrency.limit, 1)
})

test('v4 background dispatch is opt-in and off by default', () => {
  let state = goal()
  assert.equal(state.settings.autoDispatch, false)
  state = reduceV4(state, { type: 'settings', op: 'set', autoDispatch: true, now: 2 })
  assert.equal(state.settings.autoDispatch, true)
  state = reduceV4(state, { type: 'settings', op: 'set', autoDispatch: false, now: 3 })
  assert.equal(state.settings.autoDispatch, false)
  assert.throws(
    () => reduceV4(state, { type: 'settings', op: 'set', autoDispatch: 'yes', now: 4 }),
    /autoDispatch/
  )
})

test('v4 session reproject re-emits a forced snapshot', async () => {
  const rows = new Map()
  const events = []
  const store = V4Session.createStore({
    load: async (id) => rows.get(id),
    save: async (id, state) => { rows.set(id, structuredClone(state)) },
    append: async (id, event) => { events.push(event) },
    now: () => 1000
  })
  const session = new V4Session({ store, sessionId: 'sess-reproject' })
  await session.init({ target: 'https://v4.test', objective: 'reproject' })
  events.length = 0
  await session.reproject({ force: true })
  assert.equal(events.length, 1)
  assert.equal(events[0].type, 'plugin:pentest/state')
  assert.equal(events[0].force, true)
  const current = await session.read()
  assert.equal(events[0].data.revision, current.revision)
})
