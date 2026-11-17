import test from 'node:test'
import assert from 'node:assert/strict'
import { toProjection } from '../lib/projection.js'

test('v4 tasks are projected into the UI queue', () => {
  const view = toProjection({
    version: 4, revision: 3, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-1', question: 'q', state: 'open', axis: ['surface'] }],
    facts: [{ id: 'fact-1', directionId: 'direction-1', answer: 'a', createdAt: 1 }],
    findings: [{ id: 'finding-1', directionId: 'direction-1', claim: 'c', severity: 'high', createdAt: 2 }],
    assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [],
    tasks: [{ id: 'task-1', directionId: 'direction-1', state: 'running', provider: 'spawn' }]
  })
  assert.equal(view.queue.length, 1)
  assert.equal(view.queue[0].directionId, 'direction-1')
  assert.equal(view.counts.queue, 1)
})

test('v4 node text maps question/answer/claim into the UI title', () => {
  const view = toProjection({
    version: 4, revision: 4, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-1', question: 'q', state: 'open', axis: ['surface'] }],
    facts: [{ id: 'fact-1', directionId: 'direction-1', answer: 'a', createdAt: 1 }],
    findings: [{ id: 'finding-1', directionId: 'direction-1', claim: 'c', severity: 'high', createdAt: 2 }],
    assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [], tasks: []
  })
  assert.equal(view.nodes.find((node) => node.kind === 'intent').title, 'q')
  assert.equal(view.nodes.find((node) => node.kind === 'fact').title, 'a')
  assert.equal(view.nodes.find((node) => node.kind === 'finding').title, 'c')
})

test('v4 goals and planner candidates are visible in the projection', () => {
  const view = toProjection({
    version: 4, revision: 5, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    goals: [
      { id: 'goal-1', title: 'root', state: 'met' },
      { id: 'goal-2', title: 'sub goal', criteria: 'proof', state: 'open', parentId: 'goal-1', createdAt: 3 }
    ],
    planner: { mustGenerate: true, candidates: [{ id: 'candidate-1', question: 'next?', state: 'proposed', reason: 'lead', createdAt: 4 }] },
    directions: [], facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [], tasks: []
  })
  assert.equal(view.goals.length, 2)
  assert.equal(view.counts.goals, 2)
  assert.equal(view.planner.mustGenerate, true)
  assert.equal(view.nodes.find((node) => node.id === 'goal-2').kind, 'goal')
  assert.equal(view.nodes.find((node) => node.id === 'candidate-1').proposed, true)
  assert.equal(view.nodes.find((node) => node.id === 'planner-state').planner, true)
  assert.equal(view.counts.candidates, 1)
})

test('v4 candidate provenance points at the task source direction', () => {
  const view = toProjection({
    version: 4, revision: 7, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-1', question: 'q', state: 'done' }],
    planner: { candidates: [{ id: 'candidate-1', question: 'next?', state: 'proposed', source: 'task-1', createdAt: 4 }] },
    queue: [],
    facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], edges: [], digests: [], tasks: [{ id: 'task-1', directionId: 'direction-1', state: 'done' }]
  })
  const candidate = view.nodes.find((node) => node.id === 'candidate-1')
  assert.equal(candidate.stage, 'explore')
  assert.equal(candidate.origin, 'task-1')
  assert.deepEqual(candidate.parents, ['direction-1'])
})

test('v4 paused goal is exposed to the UI', () => {
  const view = toProjection({
    version: 4, revision: 8, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'paused' },
    directions: [], facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [], tasks: []
  })
  assert.equal(view.goal.phase, 'paused')
  assert.equal(view.goal.paused, true)
})

test('v4 planner mustGenerate is computed even when the stored flag is stale', () => {
  const view = toProjection({
    version: 4, revision: 6, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    goals: [{ id: 'goal-1', title: 'root', state: 'open' }],
    planner: { mustGenerate: false, candidates: [] },
    directions: [], facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [], tasks: []
  })
  assert.equal(view.planner.mustGenerate, true)
  assert.equal(view.nodes.find((node) => node.id === 'planner-state').planner, true)
})

test('derives a critical finding from confirmed coverage when findings were omitted', () => {
  const view = toProjection({
    version: 4, revision: 10, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-12', question: 'execute command?', stage: 'exploit', state: 'done' }],
    facts: [{ id: 'fact-1', directionId: 'direction-12', answer: 'uid=0(root)', evidenceIds: ['evidence-1'] }],
    evidence: [{ id: 'evidence-1', path: 'evidence/rce.txt' }],
    coverage: [{ id: 'coverage-6', result: 'issue_found', note: '已确认通过 SQL 执行 OS 命令，id 返回 uid=0(root)', evidenceIds: ['evidence-1'] }],
    findings: [], assets: [], validations: [], queue: [], edges: [], digests: [], tasks: []
  })
  const finding = view.findings.find((item) => item.id === 'derived-coverage-6')
  assert.equal(finding.severity, 'critical')
  assert.equal(finding.impactProven, 'rce')
  assert.deepEqual(finding.evidenceIds, ['evidence-1'])
})

test('v4 worker settings and concurrency are projected for the task tab', () => {
  const view = toProjection({
    version: 4, revision: 9, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    settings: { workerLimit: 4 },
    directions: [], facts: [], findings: [], assets: [], evidence: [], validations: [], coverage: [], queue: [], edges: [], digests: [],
    tasks: [{ id: 'task-1', directionId: 'direction-1', state: 'running' }]
  })
  assert.equal(view.settings.workerLimit, 4)
  assert.equal(view.concurrency.limit, 4)
  assert.equal(view.concurrency.active, 1)
  assert.equal(view.concurrency.available, 3)
})

test('v4 projection shows the latest non-superseded validation, not the first', () => {
  const view = toProjection({
    version: 4, revision: 20, sessionId: 's1',
    goal: { id: 'goal-1', target: 'https://t.test', phase: 'active' },
    directions: [{ id: 'direction-1', question: 'q', state: 'done', axis: ['identity'] }],
    facts: [],
    findings: [{ id: 'finding-1', directionId: 'direction-1', claim: 'auth bypass', severity: 'high', status: 'confirmed', evidenceIds: ['evidence-1'], createdAt: 1 }],
    evidence: [], assets: [], coverage: [], queue: [], edges: [], digests: [], tasks: [],
    validations: [
      { id: 'validation-1', findingId: 'finding-1', verdict: 'reproduced', validator: 'lead', evidenceIds: ['evidence-1'], at: 10, superseded: true },
      { id: 'validation-2', findingId: 'finding-1', verdict: 'not_reproduced', validator: 'agent:pentest-auditor', evidenceIds: [], at: 20, superseded: true },
      { id: 'validation-3', findingId: 'finding-1', verdict: 'reproduced', validator: 'agent:pentest-auditor', evidenceIds: ['evidence-1'], at: 30 }
    ]
  })
  const finding = view.findings.find((item) => item.id === 'finding-1')
  assert.equal(finding.validation.verdict, 'reproduced')
  assert.equal(finding.validation.validator, 'agent:pentest-auditor')
  assert.equal(finding.validation.at, 30)
  assert.equal(finding.evidenceStatus, 'confirmed')
})