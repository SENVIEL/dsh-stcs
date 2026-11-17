import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCheckpoint,
  selectResumeCandidates,
  isObservedNegative,
  MAX_TRACE_ITEMS,
  MAX_EVIDENCE_IDS,
  MAX_CANDIDATES
} from '../lib/v4/checkpoint.js'

const direction = {
  id: 'direction-1',
  question: '上传点能否写到可执行目录？',
  doneWhen: '写文件后能从 Web 根回读',
  state: 'open',
  updatedAt: 20
}

function failedTask(overrides = {}) {
  return {
    id: 'task-1',
    directionId: 'direction-1',
    state: 'failed',
    error: 'worker exceeded 10 min budget',
    finishedAt: 30,
    ...overrides
  }
}

function stateFixture(overrides = {}) {
  return {
    version: 4,
    directions: [direction],
    tasks: [failedTask()],
    facts: [
      { id: 'fact-1', directionId: 'direction-1', answer: 'POST /upload 返回 200', confidence: 'observed', evidenceIds: ['evidence-1'], createdAt: 10 },
      { id: 'fact-2', directionId: 'direction-2', answer: '登录 JWT 可签发', confidence: 'inferred', evidenceIds: ['evidence-2'], createdAt: 11 }
    ],
    findings: [{ id: 'finding-1', directionId: 'direction-1', evidenceIds: ['evidence-1'], createdAt: 12 }],
    evidence: [
      { id: 'evidence-1', role: 'proof', sha256: 'a'.repeat(64), summary: 'POST /upload -> 200', path: 'evidence/e1.txt', createdAt: 10 },
      { id: 'evidence-2', role: 'counter', sha256: 'b'.repeat(64), summary: 'GET /admin -> 403', path: 'evidence/e2.txt', createdAt: 11 }
    ],
    ...overrides
  }
}

test('checkpoint contains taskId / directionId / error / continueFrom / evidenceIds', () => {
  const state = stateFixture()
  const task = state.tasks[0]
  const cp = buildCheckpoint({ task, direction, state, error: 'timeout', now: 99 })
  assert.equal(cp.taskId, 'task-1')
  assert.equal(cp.directionId, 'direction-1')
  assert.equal(cp.error, 'timeout')
  assert.equal(cp.at, 99)
  assert.deepEqual(cp.evidenceIds, ['evidence-1'])
  assert.equal(typeof cp.continueFrom, 'object')
  assert.equal(cp.continueFrom.question, direction.question)
  assert.equal(cp.continueFrom.doneWhen, direction.doneWhen)
  assert.match(cp.continueFrom.reason, /task-1/)
  assert.match(cp.continueFrom.reason, /已有 1 条 evidence/)
  assert.deepEqual(cp.continueFrom.evidenceIds, cp.evidenceIds)
  assert.ok(cp.recentTrace.length > 0)
  assert.ok(cp.recentTrace.some((row) => row.kind === 'task'))
  assert.ok(cp.recentTrace.some((row) => row.kind === 'fact'))
  assert.ok(cp.recentTrace.some((row) => row.kind === 'evidence'))
  // Derive from an Error instance too; plain error objects are common at dispatch boundaries.
  assert.equal(buildCheckpoint({ task, direction, state, error: new Error('boom') }).error, 'boom')
})

test('checkpoint is bounded, JSON-serializable, pure and does not mutate state', () => {
  const state = stateFixture({
    tasks: Array.from({ length: 60 }, (_, i) => ({
      id: `task-${i}`, directionId: 'direction-1', state: i === 59 ? 'failed' : 'done',
      result: { conclusion: `c${i}`, evidenceIds: [`evidence-${i}`] }, finishedAt: i
    })),
    facts: Array.from({ length: 60 }, (_, i) => ({ id: `fact-${i}`, directionId: 'direction-1', answer: `f${i}`, createdAt: i })),
    evidence: Array.from({ length: 60 }, (_, i) => ({ id: `evidence-${i}`, summary: `e${i}`, createdAt: i }))
  })
  const snapshot = JSON.stringify(state)
  const cp = buildCheckpoint({ task: state.tasks[59], direction, state, error: 'x'.repeat(1000), now: 1 })
  assert.ok(cp.recentTrace.length <= MAX_TRACE_ITEMS)
  assert.ok(cp.evidenceIds.length <= MAX_EVIDENCE_IDS)
  assert.ok(cp.continueFrom.evidenceIds.length <= MAX_EVIDENCE_IDS)
  assert.ok(cp.error.length <= 240)
  assert.deepEqual(JSON.parse(JSON.stringify(cp)), cp)
  assert.equal(JSON.stringify(state), snapshot, 'state untouched')
  // No host values leaking into a serialized checkpoint.
  assert.equal(cp.error.includes('x'.repeat(241)), false)
})

test('selectResumeCandidates returns one continue-from candidate per direction by default', () => {
  const state = stateFixture({
    tasks: [failedTask({ id: 'task-1' }), failedTask({ id: 'task-2' })],
    directions: [direction]
  })
  const candidates = selectResumeCandidates(state, { now: 100 })
  assert.equal(candidates.length, 1)
  assert.equal(candidates[0].taskId, 'task-2', 'most recent failure wins')
  assert.equal(candidates[0].directionId, 'direction-1')
  assert.equal(candidates[0].continueFrom.question, direction.question)
  assert.deepEqual(candidates[0].continueFrom.evidenceIds, ['evidence-1'])
  assert.ok(candidates.length <= MAX_CANDIDATES)
})

test('at most one resume per direction: a resume task seals the direction', () => {
  const state = stateFixture({
    tasks: [
      failedTask({ id: 'task-1' }),
      { id: 'task-2', directionId: 'direction-1', state: 'done', origin: 'checkpoint', resumeFrom: 'task-1', finishedAt: 40 }
    ]
  })
  assert.deepEqual(selectResumeCandidates(state), [])
  // A second failure after that resume must not open another recheck.
  state.tasks.push(failedTask({ id: 'task-3', finishedAt: 50 }))
  assert.deepEqual(selectResumeCandidates(state), [])
  // attempt>1 and workerLabel=resume are also recognised as consumed rechecks.
  assert.deepEqual(selectResumeCandidates(stateFixture({
    tasks: [failedTask({ attempt: 2 })]
  })), [])
  assert.deepEqual(selectResumeCandidates(stateFixture({
    tasks: [failedTask(), { id: 'task-2', directionId: 'direction-1', state: 'done', workerLabel: 'resume task-1' }]
  })), [])
})

test('observed negative conclusion is not resumed; inferred/evidenceless negative is', () => {
  const observedNegative = {
    ...direction,
    conclusion: { answer: '未发现可写 Web 目录，已排除上传风险', confidence: 'observed', evidenceIds: ['evidence-1'] }
  }
  assert.equal(isObservedNegative(stateFixture(), observedNegative), true)
  assert.deepEqual(selectResumeCandidates(stateFixture({ directions: [observedNegative] })), [])

  const inferred = {
    ...direction,
    conclusion: { answer: '未发现可利用的上传点', confidence: 'inferred', evidenceIds: ['evidence-1'] }
  }
  assert.equal(isObservedNegative(stateFixture(), inferred), false)
  assert.equal(selectResumeCandidates(stateFixture({ directions: [inferred] })).length, 1)

  const noEvidence = {
    ...direction,
    conclusion: { answer: 'no_issue_found', verdict: 'no_issue_found' }
  }
  assert.equal(isObservedNegative(stateFixture(), noEvidence), false)
  assert.equal(selectResumeCandidates(stateFixture({ directions: [noEvidence] })).length, 1)

  // An observed fact alone (no direction conclusion) also seals the direction.
  const observedFact = stateFixture({
    directions: [direction],
    facts: [{ id: 'fact-x', directionId: 'direction-1', answer: '已排除上传写入 Web 根', confidence: 'observed', evidenceIds: ['evidence-1'], createdAt: 10 }]
  })
  assert.equal(isObservedNegative(observedFact, direction), true)
  assert.deepEqual(selectResumeCandidates(observedFact), [])
})

test('no candidates when there are no failed tasks (or no state)', () => {
  assert.deepEqual(selectResumeCandidates(stateFixture({ tasks: [] })), [])
  assert.deepEqual(selectResumeCandidates(stateFixture({ tasks: [{ id: 'task-1', directionId: 'direction-1', state: 'done' }] })), [])
  assert.deepEqual(selectResumeCandidates(stateFixture({ tasks: [{ id: 'task-1', directionId: 'direction-1', state: 'running' }] })), [])
  assert.deepEqual(selectResumeCandidates(null), [])
  assert.deepEqual(selectResumeCandidates({}), [])
  // Active task on the same direction is not a second recheck candidate.
  assert.deepEqual(selectResumeCandidates(stateFixture({
    tasks: [failedTask(), { id: 'task-2', directionId: 'direction-1', state: 'queued' }]
  })), [])
})

test('candidate count is capped at 10 across many directions', () => {
  const directions = Array.from({ length: 20 }, (_, i) => ({
    id: `direction-${i}`, question: `问题 ${i}?`, doneWhen: `完成 ${i}`, state: 'open'
  }))
  const tasks = directions.map((d, i) => failedTask({ id: `task-${i}`, directionId: d.id, finishedAt: i }))
  const state = stateFixture({ directions, tasks })
  const candidates = selectResumeCandidates(state, { maxCandidates: MAX_CANDIDATES })
  assert.equal(candidates.length, MAX_CANDIDATES)
  assert.equal(new Set(candidates.map((c) => c.directionId)).size, MAX_CANDIDATES)
  assert.ok(candidates.every((c) => c.evidenceIds.length <= MAX_EVIDENCE_IDS))
  assert.deepEqual(selectResumeCandidates(state, { maxCandidates: 3 }).map((c) => c.directionId),
    ['direction-0', 'direction-1', 'direction-2'])
})

test('maxPerDirection option is honored but never exceeds the total cap', () => {
  const state = stateFixture({
    tasks: [failedTask({ id: 'task-1' }), failedTask({ id: 'task-2' }), failedTask({ id: 'task-3' })]
  })
  assert.equal(selectResumeCandidates(state, { maxPerDirection: 2 }).length, 2)
  assert.equal(selectResumeCandidates(state, { limit: 1, maxCandidates: 1 }).length, 1)
  assert.equal(selectResumeCandidates(state, { n: 999, maxCandidates: MAX_CANDIDATES }).length, 3)
})
