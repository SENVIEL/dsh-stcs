import assert from 'node:assert/strict'
import test from 'node:test'

import {
  dependenciesSatisfied,
  mergeCandidateHypotheses,
  normalizeHypothesis,
  runnableHypotheses
} from '../lib/artex/hypothesis-tree.js'
import { decisionDigest, makeDecision, mergeBoards, replayDecisions } from '../lib/artex/coordinator.js'

const parent = {
  claim: '验证 /api/user/list 是否存在未授权读取',
  axis: ['identity'],
  endpointId: 'ep-1',
  source: 'endpoint:ep-1',
  priorityBase: 10
}
const child = {
  claim: '已确认读取影响，验证能否升级为写入',
  axis: ['chain'],
  dependsOn: [],
  priorityBase: 20
}

test('STCS hypothesis dependencies block children until a parent is done with evidence', () => {
  let tree = mergeCandidateHypotheses([], [parent], 1000)
  const parentNode = tree[0]
  tree = mergeCandidateHypotheses(tree, [{ ...child, dependsOn: [parentNode.id] }], 1000)
  const childNode = tree.find((item) => item.claim === child.claim)
  assert.ok(childNode)
  assert.equal(childNode.status, 'pending')
  assert.equal(dependenciesSatisfied(childNode, new Map(tree.map((item) => [item.id, item]))), false)

  const done = [{ ...parentNode, status: 'done', evidenceRefs: ['e1'] }]
  const byId = new Map(done.map((item) => [item.id, item]))
  assert.equal(dependenciesSatisfied(childNode, byId), true)

  const ready = mergeCandidateHypotheses(done, [{ ...child, dependsOn: [parentNode.id] }], 2000)
  assert.ok(runnableHypotheses(ready).some((item) => item.id === childNode.id))
})

test('STCS decisions replay to the same runnable hypothesis set after a restart', () => {
  const first = mergeCandidateHypotheses([], [parent], 1000)
  const parentNode = first[0]
  const decisions = [
    makeDecision({
      action: 'create_hypothesis', hypothesisId: parentNode.id, hypothesis: parentNode,
      reason: 'seed', seq: 1, round: 0, boardRevision: 1, stateRevision: 1
    }),
    makeDecision({
      action: 'promote_direction', hypothesisId: parentNode.id, directionId: 'direction-1',
      reason: 'runnable', seq: 2, round: 0, boardRevision: 1, stateRevision: 1
    }),
    makeDecision({
      action: 'dispatch', hypothesisId: parentNode.id, directionId: 'direction-1', taskId: 'task-1',
      reason: 'worker started', seq: 3, round: 0, boardRevision: 1, stateRevision: 1
    }),
    makeDecision({
      action: 'complete_hypothesis', hypothesisId: parentNode.id, directionId: 'direction-1',
      status: 'done', reason: 'confirmed', evidenceRefs: ['e1'], seq: 4, round: 1, boardRevision: 2, stateRevision: 2
    })
  ]
  const replayed = replayDecisions({ version: 1, revision: 1, sessionId: 's1', hypothesisTree: [] }, decisions, 3000)
  const node = replayed.hypothesisTree.find((item) => item.id === parentNode.id)
  assert.equal(node.status, 'done')
  assert.deepEqual(node.evidenceRefs, ['e1'])
  assert.equal(decisionDigest(decisions), decisionDigest(decisions))
})

test('STCS malformed hypotheses are normalized rather than crashing a tick', () => {
  const node = normalizeHypothesis({ claim: '', axis: 'not-an-axis' }, 1000)
  assert.equal(node.claim, '')
  assert.deepEqual(node.axis, ['not-an-axis'])
  assert.equal(node.status, 'pending')
})

test('STCS board merge keeps a worker commit that landed during a tick dispatch', () => {
  const node = normalizeHypothesis({ id: 'hyp-1', claim: 'a', axis: ['surface'], status: 'running', updatedAt: 10 }, 10)
  const done = { ...node, status: 'done', evidenceRefs: ['e1'], updatedAt: 20 }
  const tick = { version: 1, revision: 1, sessionId: 's1', hypothesisTree: [node], decisions: [makeDecision({ action: 'dispatch', hypothesisId: 'hyp-1', at: 10 })] }
  const commit = { version: 1, revision: 2, sessionId: 's1', hypothesisTree: [done], decisions: [makeDecision({ action: 'complete_hypothesis', hypothesisId: 'hyp-1', at: 20, status: 'done', evidenceRefs: ['e1'] })] }
  const merged = mergeBoards(tick, commit)
  assert.equal(merged.hypothesisTree[0].status, 'done')
  assert.deepEqual(merged.hypothesisTree[0].evidenceRefs, ['e1'])
  assert.equal(merged.decisions.length, 2)
})
